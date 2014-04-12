/* jshint node:true, strict:false */
var extend = require('node.extend');
var EventEmitter = require('events').EventEmitter;
var Logger = require('./logger');
var logSubscriber = require('./log_subscriber');
var proto = {};

exports = module.exports = createSubscription;

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