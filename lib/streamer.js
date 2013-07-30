var eventsource = require('./eventsource/amqp');

module.exports = function streamer(req, res, next) {
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

  eventsource.then(function(mq) {
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
        if(ctag) {
          q.unsubscribe(ctag);
        }
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
};