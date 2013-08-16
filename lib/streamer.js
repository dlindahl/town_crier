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

var onQueue = function(req, res, exchange, options) {
  return function(queue) {
    console.log('['+ req.sessionID + ']', 'Binding "'+queue.name+'" user queue to "'+exchange.name+'" fanout exchange');

    queue.bind(exchange.name, req.params.routing_key);

    console.log('['+ req.sessionID + ']', 'Ready to receive messages on "' + queue.name + '" queue');

    queue.subscribe(onMessage(req, res)).addCallback(onSubscribe(req, queue.name));

    req.connection.once('close', unsubscribeOnClose(req, queue));
  };
};

var queueName = function(req, options) {
  // Appending a random number ensures that each window/request gets its own
  // unique queue. Otherwise, queues shared between windows would get messages
  // delivered in a round-robin manner and would thus miss messages.
  var rand = process.hrtime()[1];
  return options.queueName || 'town_crier' + process.env.NODE_ENV + '-' + req.params.app_name+':'+req.sessionID+':'+rand;
};

var onBinding = function(req, res, tc, options) {
  return function(exchange) {
    var name = queueName(req,options),
        opts = {
          autoDelete : true,
          durable    : false,
          closeChannelOnUnsubscribe : true
        };

    console.log('['+ req.sessionID + ']', 'Declaring "'+name+'" user queue');

    tc.queue(name, opts, onQueue(req,res,exchange,options));
  };
};

var onExchange = function(req, res, tc, options) {
  return function(exchange) {
    console.log('['+ req.sessionID + ']', 'Binding "'+exchange.name+'" to "'+req.params.exchange+'"');

    exchange.bind(req.params.exchange, req.params.routing_key, onBinding(req,res,tc,options));
  };
};

var exchangeName = function(req, options) {
  return options.exchangeName || 'town_crier-' + process.env.NODE_ENV + '-' + req.params.routing_key;
};

var onConnect = function(req, res, options) {
  return function(tc) {
    console.log('['+ req.sessionID + ']', 'AMQP connection established');

    var name = exchangeName(req,options),
        opts = {
        type       : 'fanout',
        durable    : false,
        autoDelete : true
      };

    console.log('['+ req.sessionID + ']', 'Declaring "' + name + '" fanout exchange');

    tc.exchange(name, opts, onExchange(req, res, tc, options));
  };
};

var onSourceError = function(req, res) {
  return function(err) {
    console.error('['+ req.sessionID + ']', 'AMQP error');
    console.error(err);
    res.end();
  };
};

module.exports = function(options) {
  return function streamer(req, res, next) {

    if( req.params.exchange === '' || req.params.exchange.match(/^amq\./) ) {
      console.log('['+ req.sessionID + ']', 'Event Source rejected. Invalid parameters', req.params);
      return false;
    }

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