/* jshint node:true, strict:false */
var sub;
sub = exports = module.exports = {};

sub.begin = function(subscription, client, info, provider) {
  this.logger.log('Subscribed to', info.exchange, 'on', info.routingKey, 'with', provider.name);
};

sub.message = function(subscription, msg) {
  this.logger.info('Received message', msg.id, 'from', msg.data.routingKey, '(via '+msg.data.boundRoutingKey+')');
};

sub.ended = function(subscription/*, client*/) {
  var info = subscription.info;
  this.logger.log('Unsubscribed from', info.exchange, 'on', info.routingKey);
};