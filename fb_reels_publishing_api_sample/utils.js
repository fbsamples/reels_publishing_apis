//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

const PUBLISH_TIME_INTERVAL = 600;

function convertToUnix(raw_date){
    const [dateComponents, timeComponents] = raw_date.split('T');

    const [year, month, day] = dateComponents.split('-');
    const [hours, minutes] = timeComponents.split(':');

    const date = new Date(+year, month - 1, +day, +hours, +minutes);

    return Math.floor(date.getTime() / 1000)
}

function getDifference(scheduled_publish_time, current_time_in_seconds) {
    return Math.abs(scheduled_publish_time - current_time_in_seconds);
}

function check_time_difference(publish_time) {
    let publish_time_temp = document.getElementById(publish_time).value;
    const scheduled_publish_time = convertToUnix(publish_time_temp);
    // If publish time is within the next 10 minutes, alert
    // Get Current time
    const current_time = Date.now();
    // Current Time in Seconds
    const current_time_in_seconds = Math.floor(current_time / 1000);

    if (getDifference(scheduled_publish_time, current_time_in_seconds) < PUBLISH_TIME_INTERVAL ) {
        alert('Publish Time is within 10 minute interval. Please select a different date');
        document.getElementById(publish_time).value = '';
    }
}

module.exports = convertToUnix;
