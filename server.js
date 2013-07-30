var fs      = require('fs'),
    port    = process.argv[2] || 3000,
    express = require('express'),
    amqp    = require('amqp');

console.log(process.env);

var clients = [];

var connection = amqp.createConnection({
  host:      process.env.AMQP_HOST,     // TODO: Make these more configurable
  login:     process.env.AMQP_USERNAME,
  password:  process.env.AMQP_PASSWORD,
  port:      5672,
  ssl:       { enabled : false },
  vhost:     '/',
  authMechanism: 'AMQPLAIN'
});

console.log('Waiting for connection...');

connection.on('error', function() {
  console.log('ERROR', arguments);
});

connection.on('ready', function () {
  console.log('AMQP Ready');

  connection.queue('dlindahl-test', { durable:false, autoDelete:true }, function(q){
    console.log('subscribing');

    // Catch all messages
    q.bind('notes', 'note.#');

    // Receive messages
    q.subscribe(function (message, headers, deliveryInfo) {
      // Print messages to stdout
      // console.log('AMQP MESSAGE HEADERS', headers);
      console.log('AMQP MESSAGE');
      console.log('     ' + message.data.toString());
      console.log('     ' + deliveryInfo.routingKey);
      console.log('\n');

      clients.forEach(function(client) {
        client.messageCount++;
        client.res.write('{');
        client.res.write('event: ' +  deliveryInfo.routingKey + '\n');
        client.res.write('id: ' + client.messageCount + '\n');
        client.res.write('data: ' + message.data.toString() + '\n\n'); // Note the extra newline
        client.res.write('}');
      });
      // console.log('AMQP MESSAGE DELIVERY INFO', deliveryInfo);
    });
  });
});


var app = express();
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response){
  console.log('Request received');
  response.send('<html>' +
    '<script src="stream.js"></script>' +
    '<body>' +
      '<h1>Hello world! <small>' + new Date() + '</small></h1>' +
      '<div id="stream"></div>' +
    '</body></html>'
  );
});




app.get('/stream/:exchange/:routing_key', function(req, res) {
  console.log('Event Source opened');
  console.log(req.params);

  clients.push({ res:res, messageCount:0 });

  // let request last as long as possible
  req.socket.setTimeout(Infinity);

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
    clients.pop();
    // console.log(interval);
    // clearInterval(interval);
    console.log('Event Source closed');
  });
});

console.log('Server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');

app.listen(port);