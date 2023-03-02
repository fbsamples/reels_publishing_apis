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

// Read variables from environment
require("dotenv").config();
const {
    HOST,
    PORT,
    REDIRECT_URI,
    APP_ID,
    API_SECRET
} = process.env;

// Access scopes required for the token
const SCOPES = [
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
    const uri = `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${API_SECRET}&code=${code}`;
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

// Pages route to retrieve FB OAuth page tokens
app.get("/pages", async function (req, res) {
    const associatedPagesUri = `https://graph.facebook.com/v14.0/me/accounts?access_token=${req.session.userToken}`;
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

    // Retrieve the Instagram Businesses associated with each page, if any, in a single HTTP request
    const batchParamValue = pagesData.map(pageData => ({
        method: "GET",
        relative_url: `${pageData.id}/?fields=instagram_business_account{name,username}`,
        access_token: pageData.access_token,
    }));
    let batchResponses;
    try {
        batchResponses = await axios({
            method: 'POST',
            url: `https://graph.facebook.com/?access_token=${req.session.userToken}&include_headers=false`,
            data: {
                batch: batchParamValue,
            },
        });
    } catch (error) {
        res.render("index", {
            error: `There was an error requesting the Instagram businesses: ${error}`,
        });
        return;
    }

    // Take only the Instagram business account info for those pages that had them connected
    const instagramData = batchResponses.data
        .filter(batchResponse => batchResponse.code === 200)
        .map(batchResponse => JSON.parse(batchResponse.body))
        .filter(singleApiResponse => singleApiResponse.instagram_business_account !== undefined)
        .map(singleApiResponse => singleApiResponse.instagram_business_account)
        .map(businessAccount => ({
            displayName: `@${businessAccount.username}` +
                (businessAccount.name ? ` (${businessAccount.name})` : ''),
            ...businessAccount,
        }));

    res.render('upload_page', {
        'accounts': instagramData,
    });
});

// Endpoint to retrieve locations matching a search term
app.get("/listLocations", async function (req, res) {
    const associatedPagesUri = `https://graph.facebook.com/v14.0/me/accounts?access_token=${req.session.userToken}`;
    if (req.session.userToken) {
        try {
            const locationName = req.query.locationName;

            /**
             * Query list of locations with the access token
             */
            const locationsListUri = `https://graph.facebook.com/v14.0/pages/search?q=${locationName}&fields=name,location,link&access_token=${req.session.userToken}`
            const locationsList = await axios.get(locationsListUri);
            req.session.locationData = locationsList.data.data;

            res.render('upload_page', {
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
    const uploadParamsString = `caption=${caption}&cover_url=${coverUrl}&thumb_offset=${thumbOffset}&location_id=${locationId}&access_token=${req.session.userToken}`;
    const uploadVideoUri = `https://graph.facebook.com/v14.0/${accountId}/media?media_type=REELS&video_url=${videoUrl}&${uploadParamsString}`;

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
            message: `Error during upload. [Selected account id - ${accountId}`
        });
    }
});

app.post("/publishReels", async function (req, res) {
    const { accountId, containerId } = req.session;

    // Upload happens asynchronously in the backend,
    // so you need to check upload status before you Publish
    const checkStatusUri = `https://graph.facebook.com/v14.0/${containerId}?fields=status_code&access_token=${req.session.userToken}`;
    const isUploaded = await isUploadSuccessful(0, checkStatusUri);

    // When uploaded successfully, publish the video
    if(isUploaded) {
        const publishVideoUri = `https://graph.facebook.com/v14.0/${accountId}/media_publish?creation_id=${containerId}&access_token=${req.session.userToken}`;
        const publishResponse = await axios.post(publishVideoUri);
        const publishedMediaId = publishResponse.data.id;

        const rateLimitCheckUrl = `https://graph.facebook.com/v14.0/${accountId}/content_publishing_limit?fields=config,quota_usage&access_token=${req.session.userToken}`;
        const rateLimitResponse = await axios.get(rateLimitCheckUrl);
        const { config: {quota_total}, quota_usage} = rateLimitResponse.data.data[0];
        const usageRemaining = quota_total - quota_usage;

        // Get PermaLink to redirect the user to the post
        const permaLinkUri = `https://graph.facebook.com/v14.0/${publishedMediaId}?fields=permalink&access_token=${req.session.userToken}`
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
