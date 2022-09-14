/* onload call fetchStatus then based on response update ui accordingly*/
const asyncInterval = setInterval(fetchStatus, 1000);

function fetchStatus() {
  jQuery.get('/asyncStatus', function(data, status) {
    updateStatus(data.status);
    if (data.status == 'complete') {
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
