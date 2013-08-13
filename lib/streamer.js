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

var onQueue = function(req, res, exchange) {
  return function(q) {
    console.log('['+ req.sessionID + ']', 'Binding "' + q.name + '" queue to "' + exchange.name + '" exchange (Routing Key: ' + req.params.routing_key + ')');
    try {
      q.bind(exchange, req.params.routing_key);
    } catch(err) {
      console.error(error);
    }

    // Receive messages
    console.log('['+ req.sessionID + ']', 'Ready to receive messages on "' + q.name + '" queue (Routing Key: ' + req.params.routing_key + ')');
    q.subscribe(onMessage(req, res)).addCallback(onSubscribe(req, q.name));

    req.connection.once('close', unsubscribeOnClose(req, q));
  };
};

var queueName = function(req, options) {
  // TODO: Make User ID configurable
  return options.queueName || 'town_crier-' + process.env.NODE_ENV + '-' + req.sessionID;
};

var onAppExchange = function(req, res, options, mq) {
  return function(exchange) {
    var q = null,
        name = queueName(req, options),
        cb = onQueue(req, res, exchange),
        opts = {
          autoDelete : true,
          durable    : false,
          closeChannelOnUnsubscribe : true
        };

    console.log('['+ req.sessionID + ']', 'Declaring "' + name + '" user-specific queue (Routing Key: ' + req.params.routing_key + ')');
    mq.queue(name, opts, cb);
  };
};

var exchangeName = function(req, options) {
  return options.exchangeName || 'town_crier-' + process.env.NODE_ENV + '-' + req.params.app_name;
};

var onConnect = function(req, res, options) {
  return function(tc) {
    console.log('['+ req.sessionID + ']', 'AMQP connection established');

    var mq = tc.connection,
        e2e = tc.e2e,
        exchange = null,
        cb = onAppExchange(req, res, options, mq),
        name = exchangeName(req, options),
        opts = {
          autoDelete : true,
          durable : false
        };

    console.log('['+ req.sessionID + ']', 'Declaring "' + name + '" application-specific exchange');
    mq.exchange(name, opts, function(appEx) {
      appEx.bind(e2e.name, '#', cb);
    });
  };
};

var onSourceError = function(req, res) {
  return function(err) {
    console.error('['+ req.sessionID + ']', 'AMQP error');
    console.error(err);
    res.end();
  };
};

module.exports = function(eventsource, options, x) {
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