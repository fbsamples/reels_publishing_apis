#!/bin/bash

while getopts t:p:i: flag
do
    case "${flag}" in
        t) TOKEN=${OPTARG};;
        p) PAGE_ID=${OPTARG};;
        i) AB_TEST_ID=${OPTARG};;
    esac
done

usage () {
    echo "Usage: upload.sh -t <api_token> -o <owner_id/page_id> -h <graph.devXXX...facebook.com> -v1 <video_id_1> -v2 <video_id_1>";
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
if ([ -z "$AB_TEST_ID" ]);
then
    usage;
fi

echo "token: $TOKEN"
echo "owner: $PAGE_ID"
echo "ab test id: $AB_TEST_ID"



curl  -X GET "https://graph.facebook.com/v18.0/$AB_TEST_ID?access_token=$TOKEN" | jq '.'
