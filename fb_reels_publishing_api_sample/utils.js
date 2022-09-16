//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

const PUBLISH_TIME_INTERVAL_BUFFER = 600;
const PUBLISH_TIME_FORM_ID = 'publish_time';

function convertToUnix(raw_date){
    const [dateComponents, timeComponents] = raw_date.split('T');

    const [year, month, day] = dateComponents.split('-');
    const [hours, minutes] = timeComponents.split(':');

    const date = new Date(+year, month - 1, +day, +hours, +minutes);

    return Math.floor(date.getTime() / 1000)
}

function getDifference(scheduled_publish_time, current_time_in_seconds) {
    // Return the difference between the two times
    return (scheduled_publish_time - current_time_in_seconds);
}

function displayAlertAndClear(publish_time, difference) {
    if (difference < 0) {
        alert('Schedule Upload Time cannot be in the past.');
    }
    else {
        alert('Please select a Schedule Upload Time that is after the next 10 minutes.');
    }
    document.getElementById(publish_time).value = '';
}

function checkTimeDifference(publish_time) {

    if (typeof publish_time === 'string' && publish_time.trim() === '') {
        publish_time = PUBLISH_TIME_FORM_ID;
    }

    // Get publish time that was selected and convert into Epoch
    let publishTimeTemp = document.getElementById(publish_time).value;
    const scheduledPublishTime = convertToUnix(publishTimeTemp);

    // Get Current time in seconds
    const currentTime = Date.now();
    const currentTimeInSeconds = Math.floor(currentTime / 1000);

    // If
    // selected publish time is within the next 10 minutes (OR)
    // selected publish time was in the past
    // Alert the user to select a new time and clear the input field
    const difference = getDifference(scheduledPublishTime, currentTimeInSeconds);
    if (difference < PUBLISH_TIME_INTERVAL_BUFFER ) {
        displayAlertAndClear(publish_time, difference);
    }
}

module.exports = {convertToUnix, checkTimeDifference}
