var fs      = require('fs'),
    http    = require('http'),
    express = require('express'),
    amqp    = require('amqp'),
    when    = require('when');

var connectToAmqp = function() {
  var deferred = when.defer(),
      connection = amqp.createConnection({
        host:      process.env.AMQP_HOST,     // TODO: Make these more configurable
        login:     process.env.AMQP_USERNAME,
        password:  process.env.AMQP_PASSWORD,
        port:      5672,
        ssl:       { enabled : false },
        vhost:     '/',
        authMechanism: 'AMQPLAIN'
      });

  connection.on('error', deferred.reject);
  connection.on('ready', function() {
    deferred.resolve(connection);
  });

  return deferred.promise;
}();

var app = express();
app.set('port', process.argv[2] || process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.cookieParser('your secret here'));
app.use(express.session({secret: '1234567890QWERTY'}));
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

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
  console.log('Event Source opened (Exchange: "' + req.params.exchange + '" Key: "' + req.params.routing_key + '")');

  // let request last as long as possible
  req.socket.setTimeout(Infinity);

  // send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  var messageCount = 0;

  connectToAmqp.then(function(mq) {
    console.log('Client Connected to AMQP');
    var queue_name = 'dlindahl-test-' + req.sessionID;
    mq.queue(queue_name, { durable:false, autoDelete:true }, function(q) {
      var ctag,
          key = req.params.routing_key.replace(/\*\*/g, '#');

      // Catch all messages
      q.bind(req.params.exchange, key);

      // Receive messages
      q.subscribe(function (message, headers, deliveryInfo) {
        console.log('AMQP MESSAGE');
        console.log('     ' + message.data.toString());
        console.log('     ' + deliveryInfo.routingKey);
        console.log('\n');

        messageCount++;

        res.write('{');
        res.write('event: ' + deliveryInfo.routingKey + '\n');
        res.write('id: '    + messageCount + '\n');
        res.write('data: '  + message.data.toString() + '\n\n'); // Note the extra newline
        res.write('}');
      }).addCallback(function(ok) {
        console.log('Client connected to Queue (' + queue_name + ')');
        ctag = ok.consumerTag;
      });

      req.connection.once('close', function() {
        q.unsubscribe(ctag);
      });
    });

  }, function() {
    console.log('AMQP error');
    res.end();
  });

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.connection.on('close', function() {
    console.log('Event Source closed');
    req.connection.removeAllListeners();
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server running at\n  => http://localhost:' + app.get('port') + '/\nCTRL + C to shutdown\n');
});