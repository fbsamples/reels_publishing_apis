#!/bin/bash

while getopts t:o:h:v: flag
do
    case "${flag}" in
        t) TOKEN=${OPTARG};;
        o) OWNER_ID=${OPTARG};;
        h) HOST=${OPTARG};;
        v) VIDEO_PATH=${OPTARG};;
    esac
done

usage () {
    echo "Usage: upload.sh -t <api_token> -o <owner_id/page_id> -h <graph.devXXX...facebook.com> -v <video_file_path> ";
    exit 1;
}

if ([ -z "$TOKEN" ]);
then
    usage;
fi
if ([ -z "$OWNER_ID" ]);
then
    usage;
fi
if ([ -z "$HOST" ]);
then
    usage;
fi
if ([ -z "$VIDEO_PATH" ]);
then
    usage;
fi

echo "token: $TOKEN"
echo "owner: $OWNER_ID"
echo "host: $HOST"
echo "video: $VIDEO_PATH"

VIDEO_SIZE=`stat --printf="%s" "$VIDEO_PATH"`

echo "video size: $VIDEO_SIZE"

CREATE=$(\
curl -X POST "https://$HOST/v13.0/$OWNER_ID/video_reels" \
  -F "upload_phase=start" \
  -F "access_token=$TOKEN" \
)

echo "$CREATE"

VIDEO_ID=`echo "$CREATE" | tail -n1 | jq '(.video_id)' | tr -d '"'`
echo "VIDEO_ID: $VIDEO_ID"

curl -X POST \
   "https://rupload.facebook.com/video-upload/v13.0/$VIDEO_ID" \
  -H "Authorization: OAuth $TOKEN" \
  -H "offset: 0" \
  -H "file_size: $VIDEO_SIZE" \
  --data-binary "@$VIDEO_PATH"

echo ""
echo "Uploaded"

curl -X POST \
  "https://$HOST/v13.0/$OWNER_ID/video_reels" \
  -F "upload_phase=finish" \
  -F "video_state=DRAFT" \
  -F "allow_video_remixing=false" \
  -F "video_id=$VIDEO_ID" \
  -F "access_token=$TOKEN" \
  -F "description=What a great day. Watch until the end!"
