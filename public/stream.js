var source = new EventSource('/stream/notes/note.**.orders.2031894');

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