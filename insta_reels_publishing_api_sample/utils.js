const { default: axios } = require("axios");

/**
 * Setting retries with 3 seconds delay, as async video upload may take a while in the backed to return success
 * @param {*} n
 * @returns
 */
function _wait(n) { return new Promise(resolve => setTimeout(resolve, n)); }

/**
 * Retrieves container status for the uploaded video, while its uploading in the backend asynchronously
 * and checks if the upload is complete.
 * @param {*} retryCount
 * @param {*} checkStatusUri
 * @returns Promise<boolean>
 */
const isUploadSuccessful = async(retryCount, checkStatusUri) => {
    try {
        if (retryCount > 30) return false;
        const response = await axios.get(checkStatusUri);
        if(response.data.status_code != "FINISHED") {
            await _wait(3000);
            await isUploadSuccessful(retryCount+1, checkStatusUri);
        }
        return true;
    } catch(e) {
        throw e;
    }
}
module.exports = {
    isUploadSuccessful
}
