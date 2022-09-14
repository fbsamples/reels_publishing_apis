//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

function convertToUnix(raw_date){
    const [dateComponents, timeComponents] = raw_date.split('T');

    const [year, month, day] = dateComponents.split('-');
    const [hours, minutes] = timeComponents.split(':');

    const date = new Date(+year, month - 1, +day, +hours, +minutes);

    return Math.floor(date.getTime() / 1000)
}

module.exports = convertToUnix;
