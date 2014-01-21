var extend = require('node.extend'),
    EventStream = require('./event_stream');

function Logger(prefix) {
  this.prefix = prefix || '';
}
Object.keys(Object.getPrototypeOf(global.console)).forEach(function(key) {
  Logger.prototype[key] = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.prefix);
    global.console[key].apply(global, args);
  };
});

function Subscriber(req, res, options) {
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

  this.logger = new Logger('['+this.userId+']');
}

function queueUnsubscriber(ctag) {
  this.unsubscribe(ctag);
}

function onSubscribe(stack) {
  var subscription = stack.subscription,
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
    logger('error', 'JSON Parsing Error:', err);
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

function invalid() {
  this.logger.error('Event Source rejected. Invalid parameters', this.req.params, this.req.query);
  this.res.send(403, 'Forbidden');
  this.res.end();
  return true;
}

function openStream() {
  this.stream = new EventStream(this).open();

  this.logger.log('Event Source opened', this.req.params);
}

extend(Subscriber.prototype, {
  onSubscribe : onSubscribe,
  parsePayload : parsePayload,
  onMessage : onMessage,
  invalid : invalid,
  openStream : openStream
});

module.exports = Subscriber;