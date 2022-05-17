const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const { default: axios } = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

require("dotenv").config();

// Read variables from environment
const { HOST, PORT, REDIRECT_URI, APP_ID, API_SECRET } = process.env;

// Access scopes for token
const SCOPES = [
    "pages_read_engagement",
    "pages_show_list",
    "publish_video",
    "pages_manage_posts",
];
const STRINGIFIED_SCOPES = SCOPES.join("%2c");

// Multer is the intermediate file storage middleware for keeping the uploaded file locally.
// Then files are read from this storage and uploaded to FB.
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
        if (!file.originalname.match(/\.(3g2|3gp|3gpp|asf|avi|dat|divx|dv|f4v|flv|m2ts|m4v|mkv|mod|mov|mp4|mpe|mpeg|mpeg4|mpg|mts|nsv|ogm|ogv|qt|tod|ts|vob|wmv)$/)) {
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

// Login route using FB OAuth
app.get("/login", function (req, res) {
    res.redirect(
        `https://www.facebook.com/dialog/oauth?app_id=${APP_ID}&scope=${STRINGIFIED_SCOPES}&client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`
    );
});

// Callback route for handling FB OAuth user token
// And reroute to '/pages'
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

// Upload Start route to initiate upload
app.post("/uploadReels", function (req, res) {
    const uploadSingleVideo = videoUpload.single("videoFile");
    uploadSingleVideo(req, res, async function (err) {
        const selectedPageID = req.body.pageID;
        const pageToken = req.session.pageData.filter(
            (pd) => pd.id === selectedPageID
        )[0].access_token;
        if (err) {
            res.render("upload_page", {
                uploaded: false,
                error: true,
                pages: req.session.pageData,
                message: err,
            });
        } else {
            const filePath = `${__dirname}/${req.file.path}`;
            const data = fs.readFileSync(filePath);
            const size = req.file.size;
            if (selectedPageID === "") {
                res.render("upload_page", { error: "You need to select a page" });
            } else {
                try {
                    // generate video id
                    const uploadStartUri = `https://graph.facebook.com/v13.0/${selectedPageID}/video_reels?upload_phase=start&access_token=${pageToken}`;
                    const initiateUploadResponse = await axios.post(uploadStartUri);
                    const videoId = initiateUploadResponse.data.video_id;

                    // upload video
                    const uploadBinaryUri = `https://rupload.facebook.com/video-upload/v13.0/${videoId}`;
                    const uploadBinaryResponse = await axios.post(uploadBinaryUri, data, {
                        headers: {
                            Authorization: `OAuth ${pageToken}`,
                            offset: 0,
                            "X-Entity-Name": "video.mp4",
                            "X-Entity-Type": "video/mp4",
                            "X-Entity-Length": size,
                        },
                    });
                    const isUploadSuccessfull = uploadBinaryResponse.data.success;

                    // add publish reel url to the session
                    req.session.publishReelUrl = `https://graph.facebook.com/v13.0/${selectedPageID}/video_reels?upload_phase=finish&video_id=${videoId}&access_token=${pageToken}&video_state=PUBLISHED`;
                    req.session.videoId = videoId;
                    if (isUploadSuccessfull) {
                        res.render("upload_page", {
                            uploaded: true,
                            next: "publish",
                            message: `Video ID# ${videoId} Uploaded Successfully !`,
                        });
                    } else {
                        res.render("upload_page", {
                            uploaded: false,
                            message: `Video ID# ${videoId} Upload Failed !`,
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

// Publish Reels on the Selected Page
app.get("/publishReels", async function (req, res) {
    const { publishReelUrl, videoId } = req.session;
    try {
        const publishResponse = await axios.post(publishReelUrl);
        const isPublishSuccessfull = publishResponse.data.success;

        if (isPublishSuccessfull) {
            res.render("upload_page", {
                published: true,
                message: `Video ID# ${videoId} Published Successfully !`,
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
