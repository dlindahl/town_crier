var eventsource = require('./eventsource/amqp');

var onMessage = function(req, res) {
  return function(message, headers, deliveryInfo) {
    var payload = message.data.toString();

    try {
      payload = JSON.parse(payload);
    } catch(e) {
      console.error(e);
    }

    var event = payload.type || deliveryInfo.routingKey,
        id    = +new Date(),
        data  = payload;

    console.info('['+ req.sessionID + ']', 'Received message', id);

    res.write('{');
    res.write('event: ' + event + '\n');
    // res.write('retry: 10000\n'); // TODO: Implement?
    res.write('id: '    + id + '\n');
    res.write('data: '  + JSON.stringify(payload) + '\n'); // Note the extra newline
    res.write('\n}');
  };
};

var onSubscribe = function(req, queue_name) {
  return function(subscription) {
    console.log('['+ req.sessionID + ']', 'Client connected to queue: ' + queue_name);
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

var onQueue = function(req, res) {
  return function(q) {
    console.log('['+ req.sessionID + ']', 'Subscribing to "' + req.params.exchange + '" exchange (Routing Key: ' + req.params.routing_key + ')');
    q.bind(req.params.exchange, req.params.routing_key);

    // Receive messages
    q.subscribe(onMessage(req, res)).addCallback(onSubscribe(req, q.name));

    req.connection.once('close', unsubscribeOnClose(req, q));
  };
};

var queueName = function(req, options) {
  return options.queueName || 'town_crier-' + process.env.NODE_ENV + '-' + req.sessionID;
};

var onConnect = function(req, res, options) {
  return function(mq) {
    console.log('['+ req.sessionID + ']', 'AMQP connection established');

    var opts = { durable:false, autoDelete:true };

    mq.queue(queueName(req, options), opts, onQueue(req, res));
  };
};

var onSourceError = function(req, res) {
  return function() {
    console.log('['+ req.sessionID + ']', 'AMQP error');
    res.end();
  };
};

module.exports = function(options) {
  return function streamer(req, res, next) {
    console.log('['+ req.sessionID + ']', 'Event Source opened', req.params);

    // let request last as long as possible
    req.socket.setTimeout(Infinity);

    // send headers for event-stream connection
    res.writeHead(200, {
      'Content-Type'  : 'text/event-stream',
      'Cache-Control' : 'no-cache',
      'Connection'    : 'keep-alive'
    });
    res.write('\n');

    eventsource.then(onConnect(req, res, options), onSourceError(req, res));

    req.connection.addListener('end', function () {
      console.log('['+ req.sessionID + ']', 'Event Source ended');
    }, false);

    // The 'close' event is fired when a user closes their browser window.
    // In that situation we want to make sure our AMQP channel subscription
    // is properly shut down to prevent memory leaks...
    req.connection.on('close', function() {
      console.log('['+ req.sessionID + ']', 'Event Source closed');
      req.connection.removeAllListeners();
    });
  };
};