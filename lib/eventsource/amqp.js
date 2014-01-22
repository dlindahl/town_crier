var util     = require('util'),
    events   = require('events'),
    extend   = require('node.extend'),
    amqp     = require('amqp'),
    when     = require('when');

var subscriber = require('../log_subscribers/eventsource/amqp_subscriber');

var states = {
  CLOSED     : 0,
  CONNECTING : 1,
  READY      : 2
};

function onConnectionReady() {
  this.state = states.READY;
  this.emit('ready', this);
  this.deferred.resolve(this.connection);
}

function onConnectionError(err) {
  this.state = states.CLOSED;

  // This event double fires for some reason
  if(this.connection) {
    this.deferred.reject(err);

    this.emit('error', err, this);

    this.connection.removeAllListeners();
    this.connection = null;
  }
}

function AmqpEventSource(options, implOptions) {
  events.EventEmitter.call(this);
  this.options = options;
  this.implOptions = implOptions || {};

  this.state = states.CLOSED;
  this.deferred = when.defer();

  // Prevents an uncaught error exception
  this.on('error', function(){});

  // Watch for memory leaks?
  var logSub = new subscriber();
  logSub.attachTo(this);
}

function connect() {
  if(this.state === states.CLOSED) {
    this.emit('beforeConnect', this);

    this.state = states.CONNECTING;

    this.connection = amqp.createConnection(this.options, this.implOptions);
    this.connection.on('error', onConnectionError.bind(this));
    this.connection.once('ready', onConnectionReady.bind(this));
  }

  return this.deferred.promise;
}

function queueBind(stack) {
  var self       = this,
      deferred   = when.defer(),
      client     = stack.client,
      fanout     = stack.fanout,
      queue      = stack.queue,
      routingKey = stack.routingKey;

  self.emit('beforeQueueBind', self, queue, fanout, client);

  queue.bind(fanout, routingKey);

  queue.subscribe()
    .addCallback(function(queueSubscription) {
    var ctag = queueSubscription.consumerTag;
    self.emit('queueBind', self, fanout, queue, ctag, client);
    deferred.resolve(stack);
  });

  return deferred.promise;
}

function queueName(client) {
  // Appending a random number ensures that each window/request gets its own
  // unique queue. Otherwise, queues shared between windows would get messages
  // delivered in a round-robin manner and would thus miss messages.
  var rand = process.hrtime()[1];
  return this.options.queueName || 'town_crier-'+process.env.NODE_ENV+'-'+client.req.params.app_name+':'+client.userId+':'+rand;
}

function onQueueDeclare(stack, deferred, queue) {
  stack.queue = queue;
  this.emit('queueDeclare', this);
  deferred.resolve(stack);
}

function queueDeclare(stack) {
  var deferred   = when.defer(),
      client     = stack.client,
      name       = this.queueName(client),
      opts       = {
        autoDelete : true,
        durable    : false,
        closeChannelOnUnsubscribe : true
      };

  this.emit('beforeQueueDeclare', this, name, client);
  this.connection.queue(name, opts, onQueueDeclare.bind(this, stack, deferred), deferred.reject);

  return deferred.promise;
}

function onFanoutBind(stack, deferred) {
  this.emit('fanoutBind', this);
  deferred.resolve(stack);
}

function fanoutBind(stack) {
  var deferred     = when.defer(),
      client       = stack.client,
      fanout       = stack.fanout,
      exchangeName = stack.exchangeName,
      routingKey   = stack.routingKey;

  this.emit('beforeFanoutBind', this, fanout, exchangeName, client);

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

  this.emit('beforeFanoutDeclare', this, name, stack.client);
  this.connection.exchange(name, opts, onFanoutDeclared.bind(this, stack, deferred), deferred.reject);

  return deferred.promise;
}

function bindingError(client, err) {
  this.emit('bindingError', this, err, client);
}

function bindSubscriber(client) {
  var query       = client.req.query,
      exchanges   = query.exchanges,
      routingKeys = query.routingKeys;

  exchanges.forEach(function(exchange, i) {
    var stack = {
      client       : client,
      exchangeName : exchange,
      routingKey   : routingKeys[i]
    };

    fanoutDeclare.call(this, stack)
      .then(fanoutBind.bind(this))
      .then(queueDeclare.bind(this))
      .then(queueBind.bind(this), bindingError.bind(this, client));
  }.bind(this));
}

// Declare the public API
util.inherits(AmqpEventSource, events.EventEmitter);
extend(AmqpEventSource.prototype, {
  connect            : connect,
  queueName          : queueName,
  fanoutName         : fanoutName,
  bindingError       : bindingError,
  bindSubscriber     : bindSubscriber
});
AmqpEventSource.states = states;

module.exports = AmqpEventSource;