# Instagram Reels Publishing APIs

## Required software

In order to run the sample app you will need to install some required software, as follows:

- Node JS

## Before you start

You will need the following:

* IG Content Publishing API is only available to Business accounts -- see [Set Up Instagram Accounts With Pages](https://developers.facebook.com/docs/instagram/ads-api/guides/pages-ig-account#via_page). And you need to make sure your Business IG account is connected to the Facebook Page. If not, follow the instructions here - [Add or remove an Instagram account from your Page](https://www.facebook.com/help/1148909221857370)

* For your reference the Reels Publishing API documentation is located [here](https://developers.facebook.com/docs/instagram-api/guides/content-publishing/?translation)

* In order to run the app, you will need to update the code and add your Facebook Developer App Id. If you don’t have an app, follow the guide [here](https://developers.facebook.com/docs/development/) to create your app first.

* You will need [Facebook App Secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) for the Facebook App

* [nodeJS](https://nodejs.org/en/download/) or you can install via Homebrew(MacOS only) - `brew install node`

* [mkcert](https://mkcert.org/) needs to be installed on your server to create the OpenSSL Certificate. If you're using Mac you can install it via Homebrew - `brew install mkcert`

* [Pug](https://pugjs.org/api/getting-started.html) installed on your server to create the UI for the app

For simplicity, this sample guide assumes that you save every file at the root level of the app directory without any nested folder structures except for node modules.

## [Reels Requirements for Publishing](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating)
Make sure the videos are in accordance with the guidelines below:

* Container: MOV or MP4 (MPEG-4 Part 14), no edit lists, moov atom at the front of the file.
* Audio codec: AAC, 48khz sample rate maximum, 1 or 2 channels (mono or stereo).
* Video codec: HEVC or H264, progressive scan, closed GOP, 4:2:0 chroma subsampling.
* Frame rate: 23-60 FPS.
* Picture size:
* Maximum columns (horizontal pixels): 1920
* Required aspect ratio is between 0.01:1 and 10:1 but we recommend 9:16 to avoid cropping or blank spaces.
* Video bitrate: VBR, 25Mbps maximum
* Audio bitrate: 128kbps
* Duration: 15 mins maximum, 3 seconds minimum
* File size: 1GB maximum

## Example Video URLs for testing:
* https://static.videezy.com/system/resources/previews/000/014/045/original/30_seconds_digital_clock_display_of_sixteen_segments.mp4
* https://static.videezy.com/system/resources/previews/000/032/359/original/MM008645___BOUNCING_FRUIT_009___1080p___phantom.mp4

### Best Practices
* Always make sure that videos to be uploaded meet the supported video requirements
* Upload and publish requests are asynchronous. This means that a success response is a simple acknowledgement from the server and does not necessarily guarantee that the video was uploaded successfully.
    * Make sure to implement a checking mechanism like polling to check the status of the video uploads. You can find one method implemented in the sample app by the name `isUploadSuccessful`.
    * You need to wait till the upload is successful before you can execute the `/publish`
    * An example of wait is shown in the `isUploadSuccessful`, which executes retries every 3 second, for a total of 90second wait period. If it exceeds that, it fails. You can handle this differently
* There are different sets of errors in each request. Make sure to handle the errors properly.
* Note that there are various ways of FB login. This sample app uses a sever-side solution. Make sure to browse [all available options](https://developers.facebook.com/docs/facebook-login/overview) and choose the most optimal way for your implementation.

## Running the project

* Run `npm install` in your terminal
* Create a new file called `.env` and copy/paste all the environment variables from `.env.template`. Replace any environnment variables that have placeholders, such as APP_ID.

* Create an OpenSSL Cert using `mkcert`
    * To create an OpenSSL Cert for you local development environment, first, install mkcert if it's not already installed on your local machine using `brew install mkcert`
    * `mkcert localhost` - This will create a localhost pem file
    * You will see `localhost.pem` and `localhost-key.pem `files generated.

* Running the Sample App
    * `npm start`
    * Once the sample app starts running, go to https://localhost:8000 to test the workflow.

## License
Reels Publishing APIs is Meta Platform Policy licensed, as found in the LICENSE file.
