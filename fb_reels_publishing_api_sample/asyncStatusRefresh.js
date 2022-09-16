//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

/* onload call fetchStatus then based on response update ui accordingly*/
const asyncInterval = setInterval(fetchStatus, 3500);

async function fetchStatus() {
  await fetch('/asyncStatus')
  .then(response => response.json())
  .then(response => {
    updateStatus(response.status);
    if (response.status !== 'processing') {
      clearInterval(asyncInterval);
      document.getElementById('check-status-button').click();
    }
  });
}

function updateStatus(phase) {
  console.log('phase: ' + phase);
  const ele = document.getElementById('status');

  if (ele) {
    ele.innerHTML = 'Status: ' + phase;
  }
}
