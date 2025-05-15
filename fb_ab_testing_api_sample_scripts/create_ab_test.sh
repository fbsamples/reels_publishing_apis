#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

while getopts t:p:g:1:2: flag
do
    case "${flag}" in
        t) TOKEN=${OPTARG};;
        p) PAGE_ID=${OPTARG};;
        g) OPTIMIZATION_GOAL=${OPTARG};;
        1) VIDEO_ID_1=${OPTARG};;
        2) VIDEO_ID_2=${OPTARG};;
    esac
done

usage () {
    echo "Usage: create_ab_test.sh -t <api_access_token> -p <page_id> -g <optimization_goal> -1 <video_id_1> -2 <video_id_2>";
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
if ([ -z "$VIDEO_ID_1" ]);
then
    usage;
fi
if ([ -z "$VIDEO_ID_2" ]);
then
    usage;
fi
if ([ -z "$OPTIMIZATION_GOAL" ]);
then
    usage;
fi



CREATE=$(\
curl -X POST "https://graph.facebook.com/v19.0/$PAGE_ID/ab_tests" \
     -H "Content-type: application/json" \
     -H "Authorization: OAuth $TOKEN" \
     -d "{ \
           \"name\": \"YOUR_TEST_NAME\", \
           \"description\": \"YOUR_TEST_DESCRIPTION\", \
           \"optimization_goal\": \"$OPTIMIZATION_GOAL\", \
           \"experiment_video_ids\": [\"$VIDEO_ID_1\", \"$VIDEO_ID_2\"], \
           \"control_video_id\": \"$VIDEO_ID_1\", \
           \"duration\": "18000" \
           }" \
)
RESP=`echo "$CREATE" `
TEST_ID=`echo "$RESP" | tail -n1 | jq '(.id)' | tr -d '"'`
echo "AB TEST ID: $TEST_ID"
