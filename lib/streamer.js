var eventsource = require('./eventsource/amqp');

var onMessage = function(res) {
  var messageCount = 0;
  return function(message, headers, deliveryInfo) {
    console.log('AMQP MESSAGE');
    console.log('     ' + deliveryInfo.routingKey);
    console.log('     ' + message.data.toString());
    console.log('\n');

    messageCount++;

    res.write('{');
    res.write('event: ' + deliveryInfo.routingKey + '\n');
    res.write('id: '    + messageCount + '\n');
    res.write('data: '  + message.data.toString() + '\n\n'); // Note the extra newline
    res.write('}');
  };
};

var onSubscribe = function(req, queue_name) {
  return function(subscription) {
    console.log('Client connected to Queue (' + queue_name + ')');
    req.session.ctag = subscription.consumerTag;
  };
};

var unsubscribeOnClose = function(req, q) {
  return function() {
    if(req.session.ctag) {
      q.unsubscribe(req.session.ctag);
    }
  };
};

var onQueue = function(req, res, queue_name) {
  return function(q) {
    q.bind(req.params.exchange, req.params.routing_key);

    // Receive messages
    q.subscribe(onMessage(res)).addCallback(onSubscribe(req, queue_name));

    req.connection.once('close', unsubscribeOnClose(req, q));
  };
};

var onConnect = function(req, res) {
  return function(mq) {
    console.log('Client Connected to AMQP');
    var queue_name = 'dlindahl-test-' + req.sessionID;
        opts = { durable:false, autoDelete:true };

    mq.queue(queue_name, opts, onQueue(req, res, queue_name));
  };
};

var onSourceError = function(res) {
  return function() {
    console.log('AMQP error');
    res.end();
  };
};

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

  eventsource.then(onConnect(req, res), onSourceError(res));

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.connection.on('close', function() {
    console.log('Event Source closed');
    req.connection.removeAllListeners();
  });
};