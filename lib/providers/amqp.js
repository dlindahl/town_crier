var extend       = require('node.extend'),
    when         = require('when'),
    AMQP         = require('amqp'),
    subscription = require('../subscription'),
    message      = require('../message');

var subProto = require('./amqp/subscription_proto'),
    msgProto = require('./amqp/message_proto.js'),
    FO = require('./amqp/fanout'),
    Q = require('./amqp/queue');

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
    Q.declareForUser(connection, provider, sub.queueName)
  ).tap(
    listenForMessages(sub)
  ).then(
    Q.bindToFanout(provider, info.routingKey)
  ).then(dfd.resolve, dfd.reject);

  function setConsumerTag(queueSubscription) {
    sub.ctag = queueSubscription.consumerTag;
    sub.logger.log('Ready to receive messages on', info.exchange, 'matching', info.routingKey);
  }

  dfd.promise.then(setConsumerTag);

  provider.emit('subscribe', provider, info);

  return sub;
};