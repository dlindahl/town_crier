var util     = require('util'),
    events   = require('events'),
    extend   = require('node.extend'),
    amqp     = require('amqp'),
    when     = require('when');

var subscriber = require('../log_subscribers/eventsource/amqp_subscriber');

function onConnectionReady(deferred) {
  this.emit('ready', this);
  deferred.resolve(this.connection);
}

function onConnectionError(deferred, err) {
  // This event double fires for some reason
  if(this.connection) {
    deferred.reject(err);

    this.emit('error', err, this);

    this.connection.removeAllListeners();
    this.connection = null;
  }
}

function AmqpEventSource(options, implOptions) {
  events.EventEmitter.call(this);
  this.options = options;
  this.implOptions = implOptions || {};

  // Prevents an uncaught error exception
  this.on('error', function(){});

  // Watch for memory leaks?
  var logSub = new subscriber();
  logSub.attachTo(this);
}

function connect() {
  this.emit('beforeConnect', this);

  var deferred = when.defer();

  if(this.connection) {
    if(this.connection._connecting) {
      this.connection.once('ready', deferred.resolve);
    } else {
      deferred.resolve(this.connection);
    }
  } else {
    this.connection = amqp.createConnection(this.options, this.implOptions);
    this.connection.on('error', onConnectionError.bind(this, deferred));
    this.connection.on('ready', onConnectionReady.bind(this, deferred));
  }

  return deferred.promise;
}

function queueBind(stack) {
  var self       = this,
      deferred   = when.defer(),
      subscriber = stack.subscriber,
      fanout     = stack.fanout,
      queue      = stack.queue,
      routingKey = stack.routingKey;

  self.emit('beforeQueueBind', self, queue, fanout, subscriber);

  queue.bind(fanout, routingKey);

  queue.subscribe(function(message, headers, deliveryInfo) {
    subscriber.onMessage.call(subscriber, message, headers, deliveryInfo, routingKey);
  }).addCallback(function(subscription) {
    stack.subscription = subscription;
    self.emit('queueBind', self, fanout, subscriber);
    subscriber.onSubscribe.call(subscriber, stack);
    deferred.resolve(stack);
  });

  return deferred.promise;
}

function queueName(subscriber) {
  // Appending a random number ensures that each window/request gets its own
  // unique queue. Otherwise, queues shared between windows would get messages
  // delivered in a round-robin manner and would thus miss messages.
  var rand = process.hrtime()[1];
  return this.options.queueName || 'town_crier-'+process.env.NODE_ENV+'-'+subscriber.req.params.app_name+':'+subscriber.userId+':'+rand;
}

function onQueueDeclare(stack, deferred, queue) {
  stack.queue = queue;
  this.emit('queueDeclare', this);
  deferred.resolve(stack);
}

function queueDeclare(stack) {
  var deferred   = when.defer(),
      subscriber = stack.subscriber,
      name       = this.queueName(subscriber),
      opts       = {
        autoDelete : true,
        durable    : false,
        closeChannelOnUnsubscribe : true
      };

  this.emit('beforeQueueDeclare', this, name, subscriber);
  this.connection.queue(name, opts, onQueueDeclare.bind(this, stack, deferred), deferred.reject);

  return deferred.promise;
}

function onFanoutBind(stack, deferred) {
  this.emit('fanoutBind', this);
  deferred.resolve(stack);
}

function fanoutBind(stack) {
  var deferred     = when.defer(),
      subscriber   = stack.subscriber,
      fanout       = stack.fanout,
      exchangeName = stack.exchangeName,
      routingKey   = stack.routingKey;

  this.emit('beforeFanoutBind', this, fanout, exchangeName, subscriber);

  fanout.bind(exchangeName, routingKey, onFanoutBind.bind(this, stack, deferred), deferred.reject);

  return deferred.promise;
}

function fanoutName(exchangeName, routingKey) {
  return this.options.fanoutName || 'town_crier-'+process.env.NODE_ENV+'-'+exchangeName+'-'+routingKey;
}

function onFanoutDeclared(stack, deferred, fanout) {
  this.emit('fanoutDeclared', this);
  stack.fanout = fanout;
  deferred.resolve(stack);
}

function fanoutDeclare(stack) {
  var deferred = when.defer(),
      name     = this.fanoutName(stack.exchangeName, stack.routingKey),
      opts     = {
        type       : 'fanout',
        durable    : false,
        autoDelete : true
      };

  this.emit('beforeFanoutDeclare', this, name, stack.subscriber);
  this.connection.exchange(name, opts, onFanoutDeclared.bind(this, stack, deferred), deferred.reject);

  return deferred.promise;
}

function bindingError(subscriber, err) {
  this.emit('bindingError', this, err, subscriber);
}

function bindSubscriber(subscriber) {
  var query       = subscriber.req.query,
      exchanges   = query.exchanges,
      routingKeys = query.routingKeys;

  return function() {
    subscriber.openStream();

    exchanges.forEach(function(exchange, i) {
      var stack = {
        subscriber   : subscriber,
        exchangeName : exchange,
        routingKey   : routingKeys[i]
      };

      this.fanoutDeclare(stack)
        .then(this.fanoutBind.bind(this))
        .then(this.queueDeclare.bind(this))
        .then(this.queueBind.bind(this), bindingError.bind(this, subscriber));
    }.bind(this));
  };
}

function validateSubscriber(subscriber) {
  var exchanges = subscriber.req.query.exchanges;

  exchanges.forEach(function(exchange) {
    if( !exchange || exchange === '' || exchange.match(/^amq\./) ) {
      return !subscriber.invalid();
    }
  }.bind(this));

  return true;
}

// Declare the public API
util.inherits(AmqpEventSource, events.EventEmitter);
extend(AmqpEventSource.prototype, {
  connect            : connect,
  queueBind          : queueBind,
  queueName          : queueName,
  queueDeclare       : queueDeclare,
  fanoutBind         : fanoutBind,
  fanoutName         : fanoutName,
  fanoutDeclare      : fanoutDeclare,
  bindingError       : bindingError,
  bindSubscriber     : bindSubscriber,
  validateSubscriber : validateSubscriber
});

module.exports = AmqpEventSource;