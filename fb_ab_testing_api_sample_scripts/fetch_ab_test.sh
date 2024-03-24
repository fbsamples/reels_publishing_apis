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
    echo "Usage: fetch_ab_test.sh -t <api_access_token> -p <page_id> -i <ab_test_id>";
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
