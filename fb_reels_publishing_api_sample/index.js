//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const { default: axios } = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const {convertToUnix, checkTimeDifference}  = require('./utils.js');

require("dotenv").config();

// Read variables from environment
const { HOST, PORT, REDIRECT_URI, APP_ID, API_SECRET } = process.env;

// Access scopes for token
const SCOPES = [
    "pages_read_engagement",
    "pages_show_list",
    "pages_manage_posts",
];
const STRINGIFIED_SCOPES = SCOPES.join("%2c");

/**
 * [User Modifiable]
 * Multer is the intermediate file storage middleware for keeping the uploaded file locally.
 * Then files are read from this storage and uploaded to FB.
 * Tip: You can always select how and where you want to configure your middleware storage; could also be a cloud storage
 */
const storageDestinationAtRoot = "local/store/videos";
const uploadSizeLimit = 100000000;

const videoUpload = multer({
    storage: multer.diskStorage({
        destination: storageDestinationAtRoot,
        filename: (req, file, cb) => {
            cb(null,file.fieldname + "_" + Date.now() + path.extname(file.originalname));
        },
    }),
    limits: {
        fileSize: uploadSizeLimit, //Optional
    },
    fileFilter(req, file, cb) {
        // upload only mp4 and mkv format
        if (!file.originalname.match(/\.(3g2|3gp|3gpp|asf|avi|dat|divx|dv|f4v|flv|m2ts|m4v|mkv|mod|mov|mp4|mpe|mpeg|mpeg4|mpg|mts|nsv|ogm|ogv|qt|tod|ts|vob|wmv)$/i)) {
            return cb(new Error("Please upload a video that matches the format"));
        }
        cb(undefined, true);
    },
});

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

app.get("/", (req, res) => {
    res.render("index");
});

/**
 * Login route using FB OAuth
 */
app.get("/login", function (req, res) {
    res.redirect(
        `https://www.facebook.com/dialog/oauth?app_id=${APP_ID}&scope=${STRINGIFIED_SCOPES}&client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`
    );
});

/**
 * Callback route for handling FB OAuth user token
 * And reroute to '/pages'
 */
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

/**
 * Pages route to retrieve FB OAuth page tokens
 */
app.get("/pages", async function (req, res) {
    const uri = `https://graph.facebook.com/v13.0/me/accounts?access_token=${req.session.userToken}`;
    if (req.session.userToken) {
        try {
            const response = await axios.get(uri);
            req.session.pageData = response.data.data;
            res.render("upload_page", {
                uploaded: false,
                error: false,
                pages: req.session.pageData,
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

/**
 * Upload Start route to initiate upload
 */
app.post("/uploadReels", function (req, res) {
    const uploadSingleVideo = videoUpload.single("videoFile");
    uploadSingleVideo(req, res, async function (err) {
        const selectedPageID = req.body.pageID;
        const videoUrl = req.body.videoUrl;
        const videoFile = req.file;

        if(videoUrl && videoFile) {
            // Video file and video url cannot be entered together
            res.render("upload_page", {
                uploaded: false,
                error: true,
                pages: req.session.pageData,
                message: "Either select a video file or enter video url",
            });
        } else {
            if(!selectedPageID) {
                // page not selected
                res.render("upload_page", {
                    uploaded: false,
                    error: true,
                    pages: req.session.pageData,
                    message: "No page has been selected",
                });
            } else if (err) {
                // error during videoUpload
                res.render("upload_page", {
                    uploaded: false,
                    error: true,
                    pages: req.session.pageData,
                    message: err,
                });
            } else if (!videoFile && !videoUrl){
                // file not selected
                res.render("upload_page", {
                    uploaded: false,
                    error: true,
                    pages: req.session.pageData,
                    message: "No video input entered",
                });
            } else {
                let data, size;
                if(videoFile) {
                    const filePath = `${__dirname}/${videoFile.path}`;
                    data = fs.readFileSync(filePath);
                    size = videoFile.size;
                }
                const pageToken = req.session.pageData.filter((pd) => pd.id === selectedPageID)[0].access_token;
                try {
                    // generate video id
                    const uploadStartUri = `https://graph.facebook.com/v13.0/${selectedPageID}/video_reels?upload_phase=start&access_token=${pageToken}`;
                    const initiateUploadResponse = await axios.post(uploadStartUri);
                    const videoId = initiateUploadResponse.data.video_id;

                    // upload video
                    const uploadBinaryUri = `https://rupload.facebook.com/video-upload/v13.0/${videoId}`;
                    const uploadBinaryResponse = await axios({
                        method: 'post',
                        url: uploadBinaryUri,
                        data,
                        maxBodyLength: Infinity,
                        headers: Object.assign({},
                            { Authorization: `OAuth ${pageToken}`},
                            (videoFile) ? { offset: 0, file_size: size } : null, // Headers when video file is selected
                            (videoUrl) ? { file_url: videoUrl } : null // Headers when video url is entered
                        )
                    });
                    const isUploadSuccessful = uploadBinaryResponse.data.success;
                    const hasVerifiedConsentBeforePublishing = false;

                    // add variables to the session
                    Object.assign(req.session, { videoId, selectedPageID, pageToken, hasVerifiedConsentBeforePublishing });
                    if (isUploadSuccessful) {
                        res.render("upload_page", {
                            uploaded: true,
                            next: "publish",
                            message: `Video ID# ${videoId} upload has been initiated successfully! Add any optional parameters below and click publish.`,
                        });
                    } else {
                        res.render("upload_page", {
                            uploaded: false,
                            message: `Video ID# ${videoId} upload failed !`,
                        });
                    }
                } catch (error) {
                    res.render("index", {
                        error: `There was an error with the request: ${error}`,
                    });
                }
            }
        }

    });
});

/**
 * List Uploaded Reels of the Selected Page
 * If No page is selected, stay on the Upload Page and display the error
 * Else, display all relevant reels of that were previously uploaded for the selected page
 */
app.post("/listUploadedVideos", async function(req, res) {
    // Access all eligible pages for the account
    const uri = `https://graph.facebook.com/v13.0/me/accounts?access_token=${req.session.userToken}`;

    if (req.session.userToken) {
        try {
            const response = await axios.get(uri);
            req.session.pageData = response.data.data;

            const selectedPageID = req.body.pageID;
            const videoUrl = req.body.videoUrl;
            const videoFile = req.file;

            try {
                if(!selectedPageID) {
                    // page not selected
                    res.render("upload_page", {
                        uploaded: false,
                        error: true,
                        pages: req.session.pageData,
                        message: "No page has been selected",
                    });
                } else if (selectedPageID && !videoFile && !videoUrl) {
                    // Retrieve Page Access token corresponding to the selected page
                    const pageToken = req.session.pageData.filter((pd) => pd.id === selectedPageID)[0].access_token;
                    const videoUri = `https://graph.facebook.com/v13.0/${selectedPageID}/video_reels/?&access_token=${pageToken}`;

                    const video_response = await axios.get(videoUri);
                    const videos_list = video_response.data.data;

                    // Render the Upload page, but now send back the list of past reels of the selected page
                    res.render("upload_page", {
                        uploaded: false,
                        error: false,
                        pages: req.session.pageData,
                        videos: videos_list,
                    });
                }
            } catch(error) {
                res.render("upload_page", {
                    uploaded: false,
                    error: true,
                    pages: req.session.pageData,
                    message: error,
                });
            }
        } catch (error) {
            res.render("index", { error: "You need to login first"});
        }
    }
});

/**
 * Publish Reels on the Selected Page
 * Note that a successful publish request is an acknowledgement that the publish request has been received successfully
 * and doesn't necessarily mean the video was published successfully.
 * In order to confirm that the video was published successfully, a status check request needs to be sent (see /checkStatus).
 **/

app.post("/publishReels", async function (req, res) {
    const { selectedPageID, pageToken, videoId, hasVerifiedConsentBeforePublishing } = req.session;
    const { title, description } = req.body

    const basePublishReelsURI = `https://graph.facebook.com/v13.0/${selectedPageID}/video_reels?upload_phase=finish&video_id=${videoId}&title=${title}&description=${description}&access_token=${pageToken}`;
    if (req.body.scheduledpublishtime != ''){
        // If Reel is scheduled to be published at a future time
        const scheduled_publish_time = convertToUnix(req.body.scheduledpublishtime);
        publishReelsUrl = basePublishReelsURI + `&scheduled_publish_time=${scheduled_publish_time}&video_state=SCHEDULED`;
    }
    else {
        // Publish the Reel now
        publishReelsUrl = basePublishReelsURI + `&video_state=PUBLISHED`;
    }
    try {
        // Initiate Publishing Reel
        const publishResponse = await axios.post(publishReelsUrl);
        const hasInitiatedPublishing = publishResponse.data.success;

        if(hasInitiatedPublishing) {
            res.render("upload_page", {
                published: false,
                processing: true,
                message: `Video ID# ${videoId} has been processed successfully and is now Publishing. Please check status !!`,
            });
        } else {
            res.render("upload_page", {
                published: false,
                error: true,
                message: `Video ID# ${videoId} Publish Failed !`,
            });
        }
    } catch (error) {
        res.render("index", {
            error: `There was an error with the request: ${error}`,
        });
    }
})


/**
 * [User Modifiable]
 * Publishing a video goes through Processing phase where video specs are validated
 * and the Publish phase where video is published and acknowledgement is sent back via status call.
 * This is a basic implementation of how status is checked to confirm a video has been published or not,
 * and errors are handled.
 * Tips --> Client can customize this check status to happen asynchronously in the backend via Event Emitter
 * or something similar
 */
app.post("/checkStatus", async function (req, res) {
    const { pageToken, videoId } = req.session;
    const statusUri = `https://graph.facebook.com/v13.0/${videoId}/?fields=status&access_token=${pageToken}`;
    const statusResponse = await axios.get(statusUri);
    let message, published=false, error=false, processing=false;

    // This is a Sample how error message are collected and propagated to the UI
    if(statusResponse.data.status.video_status == 'error') {
        let errorMsgs;
        if(statusResponse.data.status.processing_phase.errors) { // handling errors during processing video (non confirming videos)
            errorMsgs = collectErrorMessagesFromArrayOfErrors(statusResponse.data.status.processing_phase.errors);
            message = `[Processing Error] Video ID# ${videoId}: ${errorMsgs}`;
            processing = false;
        } else if(statusResponse.data.status.publishing_phase.errors) { // handling errors during publishing video
            errorMsgs = collectErrorMessagesFromArrayOfErrors(statusResponse.data.status.publishing_phase.errors);
            message = `[Publishing Error] Video ID# ${videoId}: ${errorMsgs}`;
            processing = true;
        }
        error = true;
    } else {
        if(statusResponse.data.status.publishing_phase.status == 'complete') {
            message = `[Publish Status] Video ID# ${videoId} has been published successfully !!`;
            published = true;
            processing = true
        } else {
            message = `[Publish Status] Video ID# ${videoId} is processing...`;
            processing = true;
        }
    };

    res.render("upload_page", { published, processing, error, message });
});

app.get('/asyncStatus', async function(req, res) {
  const {pageToken, videoId} = req.session;
  const statusUri = `https://graph.facebook.com/v13.0/${videoId}/?fields=status&access_token=${pageToken}`;
  let status = 'processing';

  try {
        const statusResponse = await axios.get(statusUri);
        status = statusResponse.data.status.video_status;
    }
  catch (error){
      res.render("upload_page", error)
  }

  res.send({status: status, video_id: videoId});
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

const collectErrorMessagesFromArrayOfErrors = (errors) => {
    let errorMsgs = "";
    errors.forEach(e => {
        errorMsgs += e.message+"\n";
    });
    return errorMsgs
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
