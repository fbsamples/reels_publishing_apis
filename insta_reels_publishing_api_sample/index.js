/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const { default: axios } = require("axios");
const https = require("https");
const path = require("path");
const fs = require("fs");
const { isUploadSuccessful } = require("./utils");
const { URLSearchParams } = require("url");

const DEFAULT_GRAPH_API_ORIGIN = 'https://graph.facebook.com';
const DEFAULT_GRAPH_API_VERSION = '';

// Read variables from environment
require("dotenv").config();
const {
    HOST,
    PORT,
    REDIRECT_URI,
    APP_ID,
    API_SECRET,
    GRAPH_API_ORIGIN,
    GRAPH_API_VERSION,
} = process.env;

const GRAPH_API_BASE_URL = (GRAPH_API_ORIGIN ?? DEFAULT_GRAPH_API_ORIGIN) + '/' +
    (GRAPH_API_VERSION ? GRAPH_API_VERSION + '/' : DEFAULT_GRAPH_API_VERSION);

function buildGraphAPIURL(path, searchParams, accessToken) {
    const url = new URL(path, GRAPH_API_BASE_URL);

    url.search = new URLSearchParams(searchParams);
    if (accessToken)
        url.searchParams.append('access_token', accessToken);

    return url.toString();
}

// Access scopes required for the token
const SCOPES = [
    "business_management",
    "pages_read_engagement",
    "pages_show_list",
    "instagram_basic",
    "instagram_content_publish"
];
const STRINGIFIED_SCOPES = SCOPES.join("%2c");

app.use(express.static(path.join(__dirname, "./")));
app.set("views", path.join(__dirname, "./"));
app.set("view engine", "pug");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 6000000,
        },
    })
);

app.get("/", async(req, res) => res.render("index"));

// Login route using FB OAuth
app.get("/login", function (req, res) {
    res.redirect(
        `https://www.facebook.com/dialog/oauth?app_id=${APP_ID}&scope=${STRINGIFIED_SCOPES}&client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`
    );
});

// Callback route for handling FB OAuth user token And reroute to '/pages'
app.get("/callback", async function (req, res) {
    const code = req.query.code;
    const uri = buildGraphAPIURL('oauth/access_token', {
        client_id: APP_ID,
        redirect_uri: REDIRECT_URI,
        client_secret: API_SECRET,
        code,
    });
    try {
        const response = await axios.post(uri);
        req.session.userToken = response.data.access_token;
        res.redirect("/pages");
    } catch (err) {
        res.render("index", {
            error: `There was an error with the request: ${err}`,
        });
    }
});

async function getBatchRequestResponse(accessToken, batchParamValue, responseTransformFunc) {
    const result = {};
    let batchResponses;

    try {
        batchResponses = await axios({
            method: 'POST',
            url: buildGraphAPIURL('', {include_headers: false}, accessToken),
            data: {
                batch: batchParamValue,
            },
        });
    } catch (error) {
        result.error = error;
        return result;
    }

    // Transform the response
    result.data = responseTransformFunc(batchResponses.data);
    return result;
}

// Pages route to retrieve FB OAuth page tokens
app.get("/pages", async function (req, res) {
    const associatedPagesUri = buildGraphAPIURL('me/accounts', {
        fields: 'instagram_business_account{name,username}',
    }, req.session.userToken);
    if (!req.session.userToken) {
        res.render("index", { error: "You need to log in first" });
        return;
    }

    // Request all associated Facebook pages
    let pagesData = [];
    try {
        const accountsResponse = await axios.get(associatedPagesUri);
        pagesData = accountsResponse.data.data;
    } catch (error) {
        res.render("index", {
            error: `There was an error requesting the FB pages: ${error}`,
        });
        return;
    }

    // Take only the Instagram business account info for those pages that had them connected
    const instagramData = pagesData
        .filter(pageData => pageData.instagram_business_account !== undefined)
        .map(pageData => pageData.instagram_business_account)
        .map(businessAccount => ({
            displayName: `@${businessAccount.username}` +
                (businessAccount.name ? ` (${businessAccount.name})` : ''),
            ...businessAccount,
        }));
    
    // Validate that the Instagram accounts have access to the Content Publishing API
    // using the Content Publishing Limit endpoint
    const publishingLimitBatchParamValue = instagramData.map(data => ({
        method: "GET",
        relative_url: `${data.id}/content_publishing_limit`,
    }));
    // We will use the response code to determine if a given account has access
    const publishingLimitInfoFunc = (responseData) => responseData
        .map(batchResponse => ({code: batchResponse.code}));
    const publishingLimitsResult =
        await getBatchRequestResponse(req.session.userToken, publishingLimitBatchParamValue, publishingLimitInfoFunc);
    if (publishingLimitsResult.error) {
        res.render("index", {
            error: `There was an error requesting the Publishing Limits: ${error}`,
        });
        return;
    }

    // Merge the Instagram Business Info with its corresponding Publishing Limit
    for (let i = 0; i < instagramData.length; i++) {
        // If the Publishing Limit API call succeeded then the account has access to the API
        instagramData[i].disabled = publishingLimitsResult.data[i].code !== 200;
    }

    req.session.instagramData = instagramData;

    res.render('upload_page', {
        'accounts': instagramData,
    });
});

// Endpoint to retrieve locations matching a search term
app.get("/listLocations", async function (req, res) {
    if (req.session.userToken) {
        try {
            const locationName = req.query.locationName;

            /**
             * Query list of locations with the access token
             */
            const locationsListUri = buildGraphAPIURL('pages/search', {
                q: locationName,
                fields: 'name,location,link',
            }, req.session.userToken);
            const locationsList = await axios.get(locationsListUri);
            req.session.locationData = locationsList.data.data;

            res.render('upload_page', {
                accounts: req.session.instagramData,
                locations_list: req.session.locationData
            });
        } catch (error) {
            res.render("upload_page", {
                error: `There was an error with the request: ${error}`,
            });
        }
    } else {
        res.render("index", { error: "You need to log in first" });
    }
});

app.post("/uploadReels", async function (req, res) {
    const { videoUrl, caption, coverUrl, thumbOffset, accountId } = req.body;
    let { locationId } = req.body;
    if(typeof locationId === 'undefined') {
        locationId = "";
    }
    const uploadVideoUri = buildGraphAPIURL(`${accountId}/media`, {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        cover_url: coverUrl,
        thumb_offset: thumbOffset,
        location_id: locationId,
    }, req.session.userToken);

    try {
        // Upload Reel Video
        const uploadResponse = await axios.post(uploadVideoUri);
        const containerId = uploadResponse.data.id;

        // add variables to the session
        Object.assign(req.session, { accountId, containerId });

        // Render Upload Success
        res.render("upload_page", {
            uploaded: true,
            accountId,
            containerId,
            message: `Reel uploaded successfully on IG UserID #${accountId} at Container ID #${containerId}. You can Publish now.`
        });
    } catch(e) {
        res.render("upload_page", {
            uploaded: false,
            error: true,
            message: `Error during upload. [Selected account id - ${accountId}]: ${e}`,
        });
    }
});

app.post("/publishReels", async function (req, res) {
    const { accountId, containerId } = req.session;

    // Upload happens asynchronously in the backend,
    // so you need to check upload status before you Publish
    const checkStatusUri = buildGraphAPIURL(`${containerId}`, {fields: 'status_code'}, req.session.userToken);
    const isUploaded = await isUploadSuccessful(0, checkStatusUri);

    // When uploaded successfully, publish the video
    if(isUploaded) {
        const publishVideoUri = buildGraphAPIURL(`${accountId}/media_publish`, {
            creation_id: containerId,
        }, req.session.userToken);
        const publishResponse = await axios.post(publishVideoUri);
        const publishedMediaId = publishResponse.data.id;

        const rateLimitCheckUrl = buildGraphAPIURL(`${accountId}/content_publishing_limit`, {
            fields: 'config,quota_usage',
        }, req.session.userToken);
        const rateLimitResponse = await axios.get(rateLimitCheckUrl);
        const { config: {quota_total}, quota_usage} = rateLimitResponse.data.data[0];
        const usageRemaining = quota_total - quota_usage;

        // Get PermaLink to redirect the user to the post
        const permaLinkUri = buildGraphAPIURL(`${publishedMediaId}`, {
            fields: 'permalink',
        }, req.session.userToken);
        const permalinkResponse = await axios.get(permaLinkUri);
        const permalink = permalinkResponse.data.permalink;

        // Render Publish Success
        res.render("upload_page", {
            uploaded: true,
            published: true,
            accountId,
            permalink,
            publishedMediaId,
            message: [
                `Reel Published successfully on IG UserID #${accountId} with Publish Media ID #${publishedMediaId}`,
                `Publishes remaining - ${usageRemaining}`
            ]
        });
    } else {
        res.render("upload_page", {
            uploaded: false,
            error: true,
            message: "Reel Upload Failed for IG UserID #${igUserId} !"
        });
    }
});

// Logout route to kill the session
app.get("/logout", function (req, res) {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                res.render("index", { error: "Unable to log out" });
            } else {
                res.render("index", { response: "Logout successful!" });
            }
        });
    } else {
        res.render("index", { response: "Token not stored in session" });
    }
});

https
    .createServer({
        key: fs.readFileSync(path.join(__dirname, "./localhost-key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "./localhost.pem")),
    }, app)
    .listen(PORT, HOST, (err) => {
        if (err) console.log(`Error: ${err}`);
        console.log(`listening on port ${PORT}!`);
    });
