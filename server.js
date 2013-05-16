var fs      = require('fs'),
    port    = process.argv[2],
    express = require('express');

var app = express();
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response){
  console.log('Request received');
  response.send('<html><body><h1>Hello world! <small>' + new Date() + '</small></h1></body></html>');
});

app.get('/stream', function(req, res) {
  // let request last as long as possible
  req.socket.setTimeout(Infinity);

  messageCount = 0;

  var interval = setInterval(function() {
    console.log('tick...');
    messageCount++;
    res.write('event: newcontent\n');
    res.write('id: ' + messageCount + '\n');
    res.write('data: ' + (new Date()) + '\n\n'); // Note the extra newline
  }, 1000);

  //send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.connection.on('close', function() {
    console.log(interval);
    clearInterval(interval);
    console.log('Event Source closed');
  });
});

console.log('Server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');

app.listen(port);