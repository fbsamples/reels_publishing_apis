//  Copyright (c) Meta Platforms, Inc. and affiliates.
//  All rights reserved.
//  This source code is licensed under the license found in the
//  LICENSE file in the root directory of this source tree.

var pollCount = 0;
var asyncInterval = setInterval(fetchStatus, 3500);

async function fetchStatus() {
    pollCount++;
    showLoading();

    try {
        var response = await fetch('/asyncStatus');
        var data = await response.json();
        updateStatus(data);
        updateRawResponse(data);

        if (data.status_code === 'FINISHED') {
            clearInterval(asyncInterval);
            var btn = document.getElementById('publish-button');
            btn.disabled = false;
            btn.value = 'Publish';
        } else if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED' || hasPhaseError(data)) {
            clearInterval(asyncInterval);
        }
    } catch (err) {
        clearInterval(asyncInterval);
        hideLoading();
        var ele = document.getElementById('upload-status');
        if (ele) {
            ele.innerHTML = '<span style="color:#a51414;font-weight:bold">Failed to check status: ' + err.message + '</span>';
        }
    }
}

function showLoading() {
    var indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'inline';
    }
}

function hideLoading() {
    var indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function hasPhaseError(data) {
    if (!data.video_status) return false;
    var uploading = data.video_status.uploading_phase;
    var processing = data.video_status.processing_phase;
    return (uploading && uploading.status === 'error') ||
           (processing && processing.status === 'error');
}

function collectPhaseErrors(data) {
    var messages = [];
    if (!data.video_status) return messages;
    var phases = [
        { name: 'Upload', phase: data.video_status.uploading_phase },
        { name: 'Processing', phase: data.video_status.processing_phase },
    ];
    for (var i = 0; i < phases.length; i++) {
        var p = phases[i];
        if (p.phase && p.phase.errors) {
            for (var j = 0; j < p.phase.errors.length; j++) {
                var err = p.phase.errors[j];
                messages.push(p.name + ' error (code ' + err.code + '): ' + err.message);
            }
        }
    }
    return messages;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function updateStatus(data) {
    hideLoading();
    var ele = document.getElementById('upload-status');
    if (!ele) return;

    var parts = [];

    // Status code
    var isError = data.status_code === 'ERROR' || data.status_code === 'EXPIRED' || hasPhaseError(data);
    if (data.status_code === 'FINISHED') {
        parts.push('<span style="color:#3b9610;font-weight:bold">FINISHED</span>');
    } else if (isError) {
        parts.push('<span style="color:#a51414;font-weight:bold">' + data.status_code + '</span>');
    } else {
        parts.push('<span style="font-weight:bold">' + (data.status_code || 'UNKNOWN') + '</span>');
    }

    // Upload phase
    if (data.video_status && data.video_status.uploading_phase) {
        var uploading = data.video_status.uploading_phase;
        var uploadText = 'Upload: ' + uploading.status;
        if (uploading.bytes_transferred !== undefined) {
            uploadText += ' (' + formatBytes(uploading.bytes_transferred) + ' transferred)';
        }
        parts.push(uploadText);
    }

    // Processing phase
    if (data.video_status && data.video_status.processing_phase) {
        var processing = data.video_status.processing_phase;
        parts.push('Processing: ' + processing.status);
    }

    ele.innerHTML = parts.join(' &bull; ');

    // Show error details
    var errorBox = document.getElementById('status-error');
    if (isError) {
        if (errorBox) {
            var phaseErrors = collectPhaseErrors(data);
            var errorMsg = '';
            if (phaseErrors.length > 0) {
                errorMsg = phaseErrors.join('<br>');
            } else if (data.status) {
                errorMsg = data.status;
            } else {
                errorMsg = 'No error details available from the API.';
            }
            errorBox.innerHTML = '<strong>Error:</strong> ' + errorMsg;
            errorBox.style.display = 'block';
        }
    } else if (errorBox) {
        errorBox.style.display = 'none';
    }
}

function updateRawResponse(data) {
    var ele = document.getElementById('raw-response');
    if (!ele) return;
    ele.textContent = JSON.stringify(data, null, 2);
}
