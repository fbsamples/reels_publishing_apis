#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

while getopts t:p:v: flag
do
    case "${flag}" in
        t) TOKEN=${OPTARG};;
        p) PAGE_ID=${OPTARG};;
        v) VIDEO_PATH=${OPTARG};;
    esac
done

usage () {
    echo "Usage: upload_reel.sh -t <api_access_token> -p <page_id>  -v <video_file_path> ";
    exit 1;
}

if ([ -z "$TOKEN" ]);
then
    usage;
fi
if ([ -z "$PAGE_ID" ]);
then
    usage;
fi
if ([ -z "$VIDEO_PATH" ]);
then
    usage;
fi

echo "token: $TOKEN"
echo "owner: $PAGE_ID"
echo "video: $VIDEO_PATH"

VIDEO_SIZE=`stat -f%z "$VIDEO_PATH"`

echo "video size: $VIDEO_SIZE"

CREATE=$(\
curl -X POST "https://graph.facebook.com/v13.0/$PAGE_ID/video_reels" \
  -F "upload_phase=start" \
  -F "access_token=$TOKEN" \
)



VIDEO_ID=`echo "$CREATE" | tail -n1 | jq '(.video_id)' | tr -d '"'`
echo "VIDEO_ID: $VIDEO_ID"

curl -X POST \
   "https://rupload.facebook.com/video-upload/v19.0/$VIDEO_ID" \
  -H "Authorization: OAuth $TOKEN" \
  -H "offset: 0" \
  -H "file_size: $VIDEO_SIZE" \
  --data-binary "@$VIDEO_PATH"

echo ""
echo "Uploaded"

curl -X POST \
  "https://graph.facebook.com/v19.0/$PAGE_ID/video_reels" \
  -F "upload_phase=finish" \
  -F "video_state=DRAFT" \
  -F "allow_video_remixing=false" \
  -F "video_id=$VIDEO_ID" \
  -F "access_token=$TOKEN" \
  -F "description=YOUR_REELS_DESCRIPTION"
