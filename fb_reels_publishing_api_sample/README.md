# Facebook Reels Publishing APIs

## Before you start

You will need the following:

* For your reference the Reels Publishing API documentation is located [here](https://developers.facebook.com/docs/video-api/guides/reels-publishing)

* In order to run the app, you will need to update the code and add your Facebook Developer App Id. If you don’t have an app, follow the guide [here](https://developers.facebook.com/docs/development/) to create your app first.

* You will need [Facebook App Secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) for the Facebook App

* [nodeJS](https://nodejs.org/en/download/) or you can install via Homebrew(MacOS only) - `brew install node`

* [mkcert](https://mkcert.org/) needs to be installed on your server to create the OpenSSL Certificate. If you're using Mac you can install it via Homebrew - `brew install mkcert`

* [Pug](https://pugjs.org/api/getting-started.html) installed on your server to create the UI for the app

For simplicity, this sample guide assumes that you save every file at the root level of the app directory without any nested folder structures except for node modules.

## Video Requirements for Publishing
Make sure the videos are in accordance with the guidelines below:

### Supported Video Properties
|   Property        |   Min (or n/a)    |   Max (or n/a)    |
|   ---------       |   -----------     |   ------------    |
|   Resolution      |   540 x 960 (540p)|       n/a         |
|   Aspect Ratio    |   9:16            |       9:16        |
|   Frame Rate      |   30              |       n/a         |
|   Duration        |   4 sec           |       60 sec      |
|   File Size       |   n/a             |       n/a         |

### Supported Video Formats
We support the following formats for uploaded video/reels: 3g2, 3gp, 3gpp, asf, avi, dat, divx, dv, f4v, flv, m2ts, m4v, mkv, mod, mov, mp4, mpe, mpeg, mpeg4, mpg, mts, nsv, ogm, ogv, qt, tod, ts, vob, wmv.

Included in this repo is a sample video (located /sample_media) to be used during the upload stage. Feel free to use this video or content of your own that meets the requirements above.

### Recommended Settings
* File Type: MP4, MOV
* Resolution: 1080x1920 or greater
* Video Settings: H.264 compression, square pixels, fixed frame rate, progressive, AAC audio at 128kbps+

### Best Practices
* Always make sure that videos to be uploaded meet the supported video requirements
* Upload and publish requests are asynchronous. This means that a success response is a simple acknowledgement from the server and does not necessarily guarantee that the video was uploaded successfully. Make sure to implement a checking mechanism like polling to check the status of the video uploads.
* There are different sets of errors in each request. Make sure to handle the errors properly.
* Note that there are various ways of FB login. This sample app uses a sever-side solution. Make sure to browse [all available options](https://developers.facebook.com/docs/facebook-login/overview) and choose the most optimal way for your implementation.

## Running the project

* Run `npm install` in your terminal
* Create a new file called `.env` and copy/paste all the environment variables from `.env.template`. Replace any environnment variables that have placeholders, such as APP_ID.

* Create an OpenSSL Cert
    * To create an OpenSSL Cert for you local development environment, first, install mkcert if it's not already installed on your local machine using `brew install mkcert`
    * `mkcert localhost` - This will create a localhost pem file
    * You will see `localhost.pem` and `localhost-key.pem `files generated.

* Running the Sample App
    * `npm start`
    * Once the sample app starts running, go to https://localhost:8000 to test the workflow.

## License
Reels Publishing APIs is Meta Platform Policy licensed, as found in the LICENSE file.
