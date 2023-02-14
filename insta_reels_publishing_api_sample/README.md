# Instagram Reels Publishing APIs

## Required software

In order to run the sample app you will need to install some required software, as follows:

- Node JS

## [Before you start](#before-you-start)

You will need the following:

* IG Content Publishing API is only available to Business accounts -- see [Set Up Instagram Accounts With Pages](https://developers.facebook.com/docs/instagram/ads-api/guides/pages-ig-account#via_page). And you need to make sure your Business IG account is connected to the Facebook Page. If not, follow the instructions here - [Add or remove an Instagram account from your Page](https://www.facebook.com/help/1148909221857370). Note that connecting to either regular Facebook Page or Profile+ (New Page Experience) works.

* For your reference the Reels Publishing API documentation is located [here](https://developers.facebook.com/docs/instagram-api/guides/content-publishing/?translation)

* In order to run the app, you will need to update the code and add your Facebook Developer App Id. If you don’t have an app, follow the guide [here](https://developers.facebook.com/docs/development/) to create your app first.

* You will need [Facebook App Secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) for the Facebook App

* [nodeJS](https://nodejs.org/en/download/) or you can install via Homebrew(MacOS only) - `brew install node`

* [mkcert](https://mkcert.org/) needs to be installed on your server to create the OpenSSL Certificate. If you're using Mac you can install it via Homebrew - `brew install mkcert`

* [Pug](https://pugjs.org/api/getting-started.html) installed on your server to create the UI for the app

* If testing the [Location Tagging](https://developers.facebook.com/docs/instagram-api/guides/content-publishing/#location-tags) feature in the sample app, ensure to go through the pre-requisites for your Facebook App for the required permissions.
    * The Location tagging feature requires your app to have access to the [Pages Search API](https://developers.facebook.com/docs/pages/searching) to search for [Pages](https://developers.facebook.com/docs/graph-api/reference/page) whose names match a search string.
    * The [Pages Search API](https://developers.facebook.com/docs/pages/searching) requires the following pre-requisites to be met:
        * A [User access token](https://developers.facebook.com/docs/facebook-login/guides/access-tokens#usertokens) and the [app secret](https://developers.facebook.com/docs/facebook-login/security/#appsecret) if the app user is logged into Facebook.
        * An [App access token](https://developers.facebook.com/docs/facebook-login/guides/access-tokens) with the [Page Public Metadata Access](https://developers.facebook.com/docs/features-reference#page-public-metadata-access) feature if the app user is not logged into Facebook and is searching for public Page information.
        * An [App access token](https://developers.facebook.com/docs/facebook-login/guides/access-tokens) with the [Page Public Content Access](https://developers.facebook.com/docs/features-reference#page-public-content-access) feature if the app user is not logged into Facebook and is searching Pages to conduct competitve analysis.
        * Your Facebook App **MUST** undergo [App Review](https://developers.facebook.com/docs/app-review) for Advanced Access to [Page Public Metadata Access](https://developers.facebook.com/docs/features-reference#page-public-metadata-access) and [Page Public Content Access](https://developers.facebook.com/docs/features-reference#page-public-content-access) to search for locations to tag onto your reel.
    * To be eligible for tagging, a Page must have latitude and longitude location data.

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

### Rate limit checks `content_publishing_limit`
Rate limit checks have been included in the sample app as of version 2.0.0.
Instagram accounts are limited to 25 API-published posts within a 24 hour moving period. This limit is enforced on the POST /{ig-user-id}/media_publish endpoint when attempting to publish a media container. We recommend that your app also enforce the publishing rate limit, especially if your app allows app users to schedule posts to be published in the future.

Please refer to [docs](https://developers.facebook.com/docs/instagram-api/guides/content-publishing#checking-rate-limit-usage) to learn more.

### Custom Thumbnail Support `thumb_offset`
Custom Thumbnail support has been included in the sample app as of version 2.0.0. This parameter refers to the location, in **milliseconds**, of the video or reel frame to be used as the cover thumbnail image. The default value is `0`, which is the first frame of the video or reel. For reels, If both `cover_url` and `thumb_offset` are specified, `cover_url` will used and `thumb_offset` will be ignored.

### Cover URL `cover_url`
Cover URL support has been included in the sample app as of version 2.0.0. This is the path to an image to use as the cover image for the Reels tab. The image specified will be cURLed hence the image must be on a public server. If both `cover_url` and `thumb_offset` are specified, `cover_url` is used and `thumb_offset` will be ignored. The image must conform to the specifications for a [Reels cover photo](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#reels-specs).

### Location Tagging `location_id`
Location Tagging feature has been included in the sample app as of version 2.0.0. The [`location_id` parameter](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#query-string-parameters) refers to the ID of a Page associated with a location that you want to tag the reel with. Ensure to refer to pre-requisites required to search for Pages in the [Before you start](#before-you-start) section of this README.

### Carousel Posts
IG Content Publishing API now includes support for [Carousel Posts](https://developers.facebook.com/docs/instagram-api/guides/content-publishing#carousel-posts). You may publish up to 10 images, videos, or a mix of the two in a single post (a carousel post). Publishing carousels is a three step process:

* Use the [`POST /{ig-user-id}/media`](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating) endpoint to create individual item containers for each image and video that will appear in the carousel.
* Use the [`POST /{ig-user-id}/media`](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating) endpoint again to create a single carousel container for the items.
* Use the [`POST /{ig-user-id}/media_publish`](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media_publish#creating) endpoint to publish the carousel container.

Carousel posts count as a single post against the account's [rate limit](https://developers.facebook.com/docs/instagram-api/guides/content-publishing#rate-limit).

Please note: This feature **IS NOT** included in the Sample App.

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
