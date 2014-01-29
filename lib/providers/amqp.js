var extend       = require('node.extend'),
    when         = require('when'),
    AMQP         = require('amqp'),
    subscription = require('../subscription'),
    message      = require('../message');

var subProto = require('./amqp/subscription_proto'),
    msgProto = require('./amqp/message_proto.js');

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

  var cfg = this.providerCfg;

  (connection = AMQP.createConnection(cfg.options, cfg.implOptions))
   .once('error', onError).once('ready', onReady);

  return openConnection;
};

var FO = require('./amqp/fanout');










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
    FO.declareExchange(connection, provider, sub.fanoutName)
      .then(FO.bindToExchange(provider, info.exchange, info.routingKey)),
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