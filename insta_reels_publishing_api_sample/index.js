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
    "pages_manage_posts",
    "instagram_basic",
    "instagram_manage_comments",
    "instagram_content_publish",
    "ads_management",
    "business_management"
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
    if (req.session.userToken) {
        try {
            const associatedPages = await axios.get(associatedPagesUri);
            req.session.pageData = associatedPages.data.data;
            res.render('upload_page', {
                'pages': req.session.pageData
            });
        } catch (error) {
            res.render("index", {
                error: `There was an error with the request: ${error}`,
            });
        }
    } else {
        res.render("index", { error: "You need to log in first" });
    }
});

app.post("/uploadReels", async function (req, res) {
    const selectedPageID = req.body.pageID;
    const pageToken = req.session.pageData.filter((pd) => pd.id === selectedPageID)[0].access_token;

    // Now Retrieve the Instgram user ID associated with the selected page
    const getInstagramAccountUri = `https://graph.facebook.com/v14.0/${selectedPageID}?fields=instagram_business_account&access_token=${pageToken}`;
    const igResponse = await axios.get(getInstagramAccountUri);
    const hasIgBusinessAccount = igResponse.data.instagram_business_account ? true : false;

    // If there is a IG Business Account associated with the page
    if(hasIgBusinessAccount) {
        const igUserId = igResponse.data.instagram_business_account.id;
        // Upload Reel Video
        const yourVideoUrl = "https://static.videezy.com/system/resources/previews/000/032/259/original/MM008527___BLENDER_007___1080p___phantom.mp4";
        const yourCaption = "Test caption"
        const uploadVideoUri = `https://graph.facebook.com/v14.0/${igUserId}/media?media_type=VIDEO&video_url=${yourVideoUrl}&caption=${yourCaption}&access_token=${pageToken}`;
        const uploadResponse = await axios.post(uploadVideoUri);
        const containerId = uploadResponse.data.id;

        // add variables to the session
        Object.assign(req.session, { igUserId, containerId, pageToken });

        // Render Upload Success
        res.render("upload_page", {
            uploaded: true,
            igUserId,
            containerId,
            pages: req.session.pageData,
            message: `Reel uploaded successfully on IG UserID #${igUserId} at Container ID #${containerId}. You can Publish now.`
        });
    } else { // Error - No IG Account found
        res.render("upload_page", {
            uploaded: false,
            error: true,
            pages: req.session.pageData,
            message: "No Instagram Business Account associated with the page!"
        });
    }
});

app.post("/publishReels", async function (req, res) {
    const { igUserId, containerId, pageToken } = req.session;

    // Upload happens asynchronously in the backend,
    // so you need to check upload status before you Publish
    const checkStatusUri = `https://graph.facebook.com/v14.0/${containerId}?fields=status_code&access_token=${pageToken}`;
    const isUploaded = await getUploadStatus(0, checkStatusUri);

    // When uploaded successfully, publish the video
    if(isUploaded) {
        const publishVideoUri = `https://graph.facebook.com/v14.0/${igUserId}/media_publish?creation_id=${containerId}&access_token=${pageToken}`;
        const publishResponse = await axios.post(publishVideoUri);
        const publishedMediaId = publishResponse.data.id;

        // Get PermaLink to redirect the user to the post
        const permaLinkUri = `https://graph.facebook.com/v14.0/${publishedMediaId}?fields=permalink&access_token=${pageToken}`
        const permalinkResponse = await axios.get(permaLinkUri);
        const permalink = permalinkResponse.data.permalink;

        // Render Publish Success
        res.render("upload_page", {
            uploaded: true,
            published: true,
            igUserId,
            permalink,
            publishedMediaId,
            pages: req.session.pageData,
            message: `Reel Published successfully on IG UserID #${igUserId} with Publish Media ID #${publishedMediaId}`
        });
    } else {
        res.render("upload_page", {
            uploaded: false,
            error: true,
            pages: req.session.pageData,
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

// Setting retries with exponential backoff,
// as async video upload may take a while in the backed to return success
// ts can be any appropriate number for timelapse
const ts = 3;
const delay = (retryCount) => new Promise(resolve => setTimeout(resolve, ts ** retryCount));

// Retrieves container status for the uploaded video, while its uploading in the backend asynchronously
const getUploadStatus = async(retryCount, checkStatusUri) => {
    try {
        if (retryCount > 10) return false;
        const response = await axios.get(checkStatusUri);
        if(response.data.status_code != "FINISHED") {
            await delay(retryCount);
            return getUploadStatus(retryCount+1, checkStatusUri);
        }
        return true;
    } catch(e) {
        throw e;
    }
}

https
    .createServer({
        key: fs.readFileSync(path.join(__dirname, "./localhost-key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "./localhost.pem")),
    }, app)
    .listen(PORT, HOST, (err) => {
        if (err) console.log(`Error: ${err}`);
        console.log(`listening on port ${PORT}!`);
    });
