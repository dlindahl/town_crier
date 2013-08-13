(function() {
  var source = null;

  function onOpen() {
    document.getElementById('status').textContent = 'Connected';
    document.getElementById('connection').textContent = 'Disconnect';
  }

  function onMessage(e) {
    console.log(e.data);
    var stream = document.getElementById('stream');
    stream.value += e.data + "\n";
    stream.scrollTop = stream.scrollHeight;
  }

  function onError(e) {
    document.getElementById('connection').textContent = 'Connect';
    var status = 'Connection closed.';
    if (e.readyState === EventSource.CLOSED) {
      source.close();
    } else if (e.readyState === EventSource.CONNECTING) {
      status += ' Attempting to reconnect!';
    } else {
      status += ' Unknown error!';
    }
    document.getElementById('status').textContent = status;
  }

  function connect() {
    source = new EventSource('/firehose/sap/note.%23.orders.%23' + window.location.search);

    source.addEventListener('open', onOpen, false);
    source.addEventListener('message', onMessage, false);
    source.addEventListener('error', onError, false);
  }

  document.getElementById('connection').addEventListener('click', function() {
    var label = this.textContent;
    if(label == 'Connect') {
      connect();
    } else if(label == 'Disconnect') {
      if(source) {
        source.close();
        onError(source);
      }
    }
  });

  connect();
})();