var source = new EventSource('http://localhost:3000/firehose/notes/note.%23.orders.%23');

source.addEventListener('message', function(e) {
  document.getElementById('stream').innerHTML = e.data;
}, false);

source.addEventListener('open', function(e) {
  console.log('open');
}, false);

source.addEventListener('error', function(e) {
  if (e.readyState == EventSource.CLOSED) {
    console.log('closed');
  }
}, false);