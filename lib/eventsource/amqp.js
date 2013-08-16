var amqp     = require('amqp'),
    when     = require('when'),
    sequence = require('when/sequence'),
    util     = require('util'),
    events   = require('events');

function onConnectionReady(es, deferred) {
  return function() {
    console.log('AMQP connection established');
    deferred.resolve(es.connection);

    es.emit('ready', es);
  };
}

function onConnectionError(es, deferred) {
  return function(err) {
    // This event double fires for some reason
    if(es.connection) {
      deferred.reject(err);

      es.emit('error', err, es);

      es.connection.removeAllListeners();
      es.connection = null;
    }
  };
}

var AmqpEventSource = function(options, implOptions) {
  events.EventEmitter.call(this);
  this.options = options;
  this.implOptions = implOptions || {};

  // Prevents an uncaught error exception
  this.on('error', function(){});
};
util.inherits(AmqpEventSource, events.EventEmitter);

AmqpEventSource.prototype.connect = function() {
  console.log('Attempting to establish AMQP connection...');

  var deferred = when.defer();

  if(this.connection) {
    if(this.connection._connecting) {
      console.log('Still waiting for connection...');
      this.connection.once('ready', deferred.resolve);
    } else {
      console.log('Connection already established');
      deferred.resolve(this.connection);
    }
  } else {
    console.log('=> Connecting to AMQP...');

    this.connection = amqp.createConnection(this.options, this.implOptions);
    this.connection.on('error', onConnectionError(this, deferred));
    this.connection.on('ready', onConnectionReady(this, deferred));
  }

  return deferred.promise;
};

AmqpEventSource.prototype.queueBind = function(stack) {
  var deferred   = when.defer(),
      subscriber = stack.subscriber,
      fanout     = stack.fanout,
      queue      = stack.queue,
      routingKey = stack.routingKey;

  subscriber.logger('log','Binding "'+queue.name+'" user queue to "'+fanout.name+'" fanout exchange');

  queue.bind(fanout, routingKey);

  queue.subscribe(subscriber.onMessage.bind(subscriber))
    .addCallback(function(subscription) {
      subscriber.logger('log','Ready to receive messages on "'+fanout.name+'"');
      stack.subscription = subscription;
      subscriber.onSubscribe.call(subscriber, stack);
      deferred.resolve(stack);
    });

  return deferred.promise;
};

AmqpEventSource.prototype.queueName = function(subscriber) {
  // Appending a random number ensures that each window/request gets its own
  // unique queue. Otherwise, queues shared between windows would get messages
  // delivered in a round-robin manner and would thus miss messages.
  var rand = process.hrtime()[1];
  return this.options.queueName || 'town_crier-'+process.env.NODE_ENV+'-'+subscriber.req.params.app_name+':'+subscriber.userId+':'+rand;
};

AmqpEventSource.prototype.queueDeclare = function(stack) {
  var deferred   = when.defer(),
      subscriber = stack.subscriber,
      name       = this.queueName(subscriber),
      opts       = {
        autoDelete : true,
        durable    : false,
        closeChannelOnUnsubscribe : true
      };

    subscriber.logger('log','Declaring "'+name+'" user queue');

    this.connection.queue(name, opts, function(queue) {
      stack.queue = queue;
      deferred.resolve(stack);
    }, deferred.reject);

  return deferred.promise;
};

AmqpEventSource.prototype.fanoutBind = function(stack) {
  var deferred     = when.defer(),
      subscriber   = stack.subscriber,
      fanout       = stack.fanout,
      exchangeName = stack.exchangeName,
      routingKey   = stack.routingKey;

  subscriber.logger('log','Binding "'+fanout.name+'" to "'+exchangeName+'"');

  fanout.bind(exchangeName, routingKey, function() {
    deferred.resolve(stack);
  }, deferred.reject);

  return deferred.promise;
};

AmqpEventSource.prototype.fanoutName = function(exchangeName, routingKey) {
  return this.options.fanoutName || 'town_crier-'+process.env.NODE_ENV+'-'+exchangeName+'-'+routingKey;
};

AmqpEventSource.prototype.fanoutDeclare = function(stack) {
  var deferred = when.defer(),
      name     = this.fanoutName(stack.exchangeName, stack.routingKey),
      opts     = {
        type       : 'fanout',
        durable    : false,
        autoDelete : true
      };

  stack.subscriber.logger('log','Declaring "'+name+'" fanout exchange');

  this.connection.exchange(name, opts, function(fanout) {
    stack.fanout = fanout;
    deferred.resolve(stack);
  }, deferred.reject);

  return deferred.promise;
};

AmqpEventSource.prototype.bindingError = function(err) {
  this.logger('log','Binding Error:', err);
};

AmqpEventSource.prototype.bindSubscriber = function(subscriber) {
  var i = 0,
      exchanges   = subscriber.req.query.exchanges,
      routingKeys = subscriber.req.query.routingKeys,
      len         = exchanges.length,
      exchange    = null,
      es          = this;

  return function() {
    subscriber.openStream();

    for(i; i < len; i++) {
      var stack = {
        subscriber   : subscriber,
        exchangeName : exchanges[i],
        routingKey   : routingKeys[i]
      };

      this.fanoutDeclare(stack)
        .then(this.fanoutBind.bind(this))
        .then(this.queueDeclare.bind(this))
        .then(this.queueBind.bind(this), this.bindingError.bind(subscriber));
    }
  };
};

AmqpEventSource.prototype.validateSubscriber = function(subscriber) {
  var i = 0,
      exchanges = subscriber.req.query.exchanges,
      len       = exchanges.length,
      exchange  = null;

  for(i; i < len; i++) {
    exchange = exchanges[i];
    if( !exchange || exchange === '' || exchange.match(/^amq\./) ) {
      return !subscriber.invalid();
    }
  }
  return true;
};

module.exports = AmqpEventSource;