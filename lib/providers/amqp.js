var extend       = require('node.extend'),
    when         = require('when'),
    AMQP         = require('amqp'),
    subscription = require('../subscription'),
    message      = require('../message');

var amqp = exports = module.exports = {};

var deferredOpen   = null,
    openConnection = null,
    connection     = null;

amqp.name = 'AMQP';

amqp.connect = function connect() {
  var provider = this,
      state    = (deferredOpen) ? openConnection.inspect().state : null;

  switch(state) {
    case 'rejectect' :
      // No-op? Purposefully fall back to 'fulfilled' behavior...?
    case 'fulfilled' :
      return openConnection;
    case 'pending' :
      provider.emit('connecting', provider, connection);
      break;
    default :
      deferredOpen = when.defer();
      openConnection = deferredOpen.promise;
      provider.emit('beforeconnect', provider);
  }

  function onReady() {
    deferredOpen.resolve(provider);
    connection.removeListener('error', onError);

    provider.emit('ready', provider, connection);
  }

  function onError(err) {
    deferredOpen.reject(err);
    connection.removeListener('ready', onReady);

    provider.emit('error', provider, err);
  }

  (connection = AMQP.createConnection(this.options.amqp, this.options.connection))
   .once('error', onError).once('ready', onReady);

  return openConnection;
};

// TODO: Move to seperate module
var subProto = function subscriptionProto(context) {
  var proto      = {},
      opts       = context.options.amqp,
      exchange   = this.info.exchange,
      routingKey = this.info.routingKey,
      appName    = this.info.appName,
      clientId   = this.info.clientId;

  proto.__defineGetter__('fanoutName', function fanoutName() {
    if(opts.fanoutName) return opts.fanoutName;

    var env = process.env.NODE_ENV;

    return 'town_crier-'+env+'-'+exchange+'-'+routingKey;
  }.bind(this));

  proto.__defineGetter__('queueName', function queueName() {
    if(opts.queueName) return opts.queueName;

    var env = process.env.NODE_ENV;

    return 'town_crier-'+env+'-'+appName+'-'+clientId;
  }.bind(this));

  return proto;
};

// TODO: Move into seperate module
// TODO: This assumes that the message is a JSON string but does not have the
// Content-Type header set correctly. This is obviously a bad assumption.
function parsePayload(amqpMsg) {
  // var data = {};
  var data = amqpMsg.data.toString();

  try {
    data = JSON.parse(data);
  } catch(err) {
    // No-op
  }

  return data;
}

var msgProto = {
  transform : function(sub, payload, headers, deliveryInfo, rawMessage) {
    payload = parsePayload(payload);

    return {
      event : payload.type || sub.info.routingKey,
      data : {
        headers         : headers,
        exchange        : deliveryInfo.exchange,
        contentType     : deliveryInfo.contentType,
        routingKey      : deliveryInfo.routingKey,
        boundRoutingKey : sub.info.routingKey,
        payload         : payload
      }
    };
  }
};


// TODO: Make configurable via provider opts hash
// TODO: Move fanout stuff to sep module
var fanoutOpts = {
  type       : 'fanout',
  durable    : false,
  autoDelete : true
};

function declareFanoutExchange(provider, name) {
  var dfd = when.defer();

  connection.exchange(name, fanoutOpts, dfd.resolve, dfd.reject);

  provider.emit('fanoutdeclaration', provider, name);

  return dfd.promise;
}

function bindFanoutToExchange(provider, exchange, routingKey) {
 return function bindFanoutToExchange(fanout) {
    var dfd = when.defer();

    fanout.bind(exchange, routingKey, dfd.resolve, dfd.reject);

    provider.emit('fanoutbind', provider, exchange, routingKey, fanout);

    return dfd.promise;
  };
}

// TODO: Move queue stuff to sep module
var queueOpts = {
  autoDelete : true,
  durable    : false,
  closeChannelOnUnsubscribe : true
};

// Since we are only declaring one queue per unique User, messages that match
// multiple routing keys will only be delivered once.
function declareUserQueue(provider, name) {
  var dfd = when.defer();

  connection.queue(name, queueOpts, dfd.resolve, dfd.reject);

  provider.emit('userqueuedeclaration', provider, name);

  return dfd.promise;
}

function listenForMessages(sub) {
  return function listenForMessages(results) {
    var fanout = results[1],
        queue  = results[2];

    function onMessage() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift(sub);
      sub.onMessage(message(args));
    }

    queue.on('message', onMessage);

    sub.once('ended', function() {
      queue.removeListener('message', onMessage);
    });
  };
}

function bindQueueToFanout(provider, routingKey) {
  return function bindQueueToFanout(results) {
    var fanout = results[1],
        queue  = results[2],
        dfd    = when.defer();

    queue.bind(fanout, routingKey);
    queue.subscribe().addCallback(dfd.resolve, dfd.reject);

    provider.emit('queuefanoutbind', provider, queue, fanout, routingKey);

    return dfd.promise;
  };
}

amqp.subscribe = function subscribe(info) {
  var provider = this,
      sub = subscription(provider, info),
      dfd = when.defer();

  // Decorate the subscription with AMQP specific functions
  extend(sub, subProto.call(sub, provider));

  // Decorate the message with AMQP specific functions
  extend(message.proto, msgProto);

  // Promises, promises...
  when.join(
    amqp.connect(),
    declareFanoutExchange(provider, sub.fanoutName)
      .then(bindFanoutToExchange(provider, info.exchange, info.routingKey)),
    declareUserQueue(provider, sub.queueName)
  ).tap(
    listenForMessages(sub)
  ).then(
    bindQueueToFanout(provider, info.routingKey)
  ).then(dfd.resolve, dfd.reject);

  dfd.promise.then(function(queueSubscription) {
    sub.ctag = queueSubscription.consumerTag;
    sub.logger.log('Ready to receive messages on', info.exchange, 'matching', info.routingKey);
  });

  provider.emit('subscribe', provider, info);

  return sub;
};