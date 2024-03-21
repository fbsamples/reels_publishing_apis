# Facebook A/B Testing API for Reels and Videos

## Before you start

You will need the following:

* For your reference the Facebook AB Testing API documentation is located [here](https://developers.facebook.com/docs/video-api/ab-testing/)


* The bash scripts included in this folder were written for the MACOS platform
* They assume you have [jq](https://jqlang.github.io/jq/) installed




### Steps
* create a page token using the fb reels publishing api sample or [graph explorer tool](https://developers.facebook.com/tools/explorer/)

* Run ./upload_reel.sh to create two new draft reel videos
    * Eg: upload.sh -t <api_token> -o <owner_id/page_id>  -v <video_file_path>

* Run ./create_ab_test.sh to create a new ab test using the two previously created draft videos
    * Eg: create_ab_test.sh -t <api_token> -p <page_id> -g <optimization_goal> -1 <video_id_1> -2 <video_id_1>"

* Run  ./fetch_ab_test.sh to fetch the insights and status of an ab test
    * Eg: fetch_ab_test.sh -t <api_token> -p <page_id> -i <ab_test_id>





## License
Reels Publishing APIs is Meta Platform Policy licensed, as found in the LICENSE file.
