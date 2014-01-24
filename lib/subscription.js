var extend = require('node.extend'),
    EventEmitter = require('events').EventEmitter,
    Logger = require('./logger'),
    logSubscriber = require('./log_subscriber');

exports = module.exports = createSubscription;

var proto = {};

proto.onMessage = function onMessage(msg) {
  this.emit('message', this, msg);
  this.lastMessage = msg;
};

function subscription(info) {
  this.info = info;
  this.logger = Logger();
  this.lastMessage = null;

  logSubscriber('subscription').attachTo(this);
}
extend(subscription.prototype, proto);
extend(subscription.prototype, EventEmitter.prototype);

function createSubscription(provider, info) {
  return new subscription(info);
}