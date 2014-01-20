var EventStream = require('./event_stream');

var Subscriber = function(req, res, options) {
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
};

function queueUnsubscriber(queue, ctag) {
  return function() {
    queue.unsubscribe(ctag);
  };
}

Subscriber.prototype.logger = function() {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift('['+this.userId+']');
  global.console[arguments[0]].apply(global, args);
};

Subscriber.prototype.onSubscribe = function(stack) {
  var subscription = stack.subscription,
      queue        = stack.queue;

  this.logger('log', 'Client connected to user queue: '+queue.name);
  this.req.connection.once('close', queueUnsubscriber(queue, subscription.consumerTag));
};

Subscriber.prototype.parsePayload = function(message, headers, deliveryInfo, boundRoutingKey) {
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
};

Subscriber.prototype.onMessage = function(message, headers, deliveryInfo, boundRoutingKey) {
  var payload = this.parsePayload(message, headers, deliveryInfo, boundRoutingKey);

  this.logger('info','Received message', payload.id);

  this.stream.write(payload);
};

Subscriber.prototype.invalid = function() {
  this.logger('error', 'Event Source rejected. Invalid parameters', this.req.params, this.req.query);
  this.res.send(403, 'Forbidden');
  this.res.end();
  return true;
};

Subscriber.prototype.openStream = function() {
  this.stream = new EventStream(this).open();

  this.logger('log', 'Event Source opened', this.req.params);
};

module.exports = Subscriber;