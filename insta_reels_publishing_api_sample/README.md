# Instagram Reels Publishing APIs

## Required software

In order to run the sample app you will need to install some required software, as follows:

- Node JS

## Before you start

You will need the following:

* IG Content Publishing API is only available to Creator or Business accounts -- see [Set Up Instagram Accounts With Pages](https://developers.facebook.com/docs/instagram/ads-api/guides/pages-ig-account#via_page). And you need to make sure your Creator/Business IG account is connected to the Facebook Page. If not, follow the instructions here - [Add or remove an Instagram account from your Page](https://www.facebook.com/help/1148909221857370)

* For your reference the Reels Publishing API documentation is located [here](https://developers.facebook.com/docs/instagram-api/guides/content-publishing/?translation)

* In order to run the app, you will need to update the code and add your Facebook Developer App Id. If you don’t have an app, follow the guide [here](https://developers.facebook.com/docs/development/) to create your app first.

* You will need [Facebook App Secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) for the Facebook App

* [nodeJS](https://nodejs.org/en/download/) or you can install via Homebrew(MacOS only) - `brew install node`

* [mkcert](https://mkcert.org/) needs to be installed on your server to create the OpenSSL Certificate. If you're using Mac you can install it via Homebrew - `brew install mkcert`

* [Pug](https://pugjs.org/api/getting-started.html) installed on your server to create the UI for the app

For simplicity, this sample guide assumes that you save every file at the root level of the app directory without any nested folder structures except for node modules.

## Video Requirements for Publishing
Make sure the videos are in accordance with the guidelines below:

* **Container**: MOV or MP4 (MPEG-4 Part 14), no edit lists, moov atom at the front of the file.
* **Audio codec**: AAC, 48khz sample rate maximum, 1 or 2 channels (mono or stereo).
* **Video codec**: HEVC or H264, progressive scan, closed GOP, 4:2:0 chroma subsampling.
* **Frame rate**: 23-60 FPS.
* **Picture size**:
    * Maximum columns (horizontal pixels): 1920
    * Minimum aspect ratio [cols / rows]: 4 / 5
    * Maximum aspect ratio [cols / rows]: 16 / 9
* **Video bitrate**: VBR, 5Mbps maximum
* **Audio bitrate**: 128kbps
* **Duration**: 60 seconds maximum, 3 seconds minimum
* **File size**: 100MB maximum

## Example Video URLs for testing:
* https://static.videezy.com/system/resources/previews/000/014/045/original/30_seconds_digital_clock_display_of_sixteen_segments.mp4
* https://static.videezy.com/system/resources/previews/000/032/359/original/MM008645___BOUNCING_FRUIT_009___1080p___phantom.mp4
