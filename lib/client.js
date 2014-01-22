var util     = require('util'),
    events   = require('events'),
    extend = require('node.extend'),
    EventStream = require('./event_stream'),
    Logger = require('./logger'),
    Validations = require('./client/Validations'),
    Binder = require('./client/event_source_bindings');

function Client(es, options, req, res) {
  events.EventEmitter.call(this);

  this.req = req;
  this.res = res;
  this.options = options || {};

  if(this.req.params.userId) {
    this.userId = this.req.params.userId;
  } else if(this.req.query.userId) {
    this.userId = this.req.query.userId;
  } else {
    this.userId = this.req.sessionID;
  }

  this.stream = new EventStream(this);

  this.logger = new Logger('[TownCrier:'+this.userId+']');

  Binder.call(this, es);
  Validations.call(this);
}

function queueUnsubscriber(ctag) {
  this.unsubscribe(ctag);
}

function onSubscribe(stack) {
  var subscription = stack.queueSubscription,
      queue        = stack.queue;

  this.logger.log('Client connected to user queue: '+queue.name);
  this.req.connection.once('close', queueUnsubscriber.bind(queue, subscription.consumerTag));
}

function parsePayload(message, headers, deliveryInfo, boundRoutingKey) {
  var payload = {},
      data    = message.data.toString();

  try {
    data = JSON.parse(data);
  } catch(err) {
    this.logger.error('JSON Parsing Error:', err);
  }

  return {
    event : data.type || boundRoutingKey || deliveryInfo.routingKey,
    id    : +new Date(),
    data  : JSON.stringify(data)
  };
}

function onMessage(message, headers, deliveryInfo, boundRoutingKey) {
  var payload = this.parsePayload(message, headers, deliveryInfo, boundRoutingKey);

  this.logger.info('Received message', payload.id);

  this.stream.write(payload);
}

function openStream(eventsource) {
  this.stream.open();

  this.logger.log('Event Source opened', this.req.params);
}

function destroy() {
  this.emit('destroy', this);

  return true;
}

// Declare the public API
util.inherits(Client, events.EventEmitter);
extend(Client.prototype, {
  onSubscribe  : onSubscribe,
  parsePayload : parsePayload,
  onMessage    : onMessage,
  openStream   : openStream,
  destroy      : destroy
});

module.exports = Client;