var amqp = exports = module.exports = {};

amqp.beforeconnect = function(provider) {
  var opts = provider.providerCfg.options,
      url  = opts.login + '@' + opts.host + ':' + opts.port;

  this.logger.info('Attempting to establish AMQP connection with', url);
};

amqp.connecting = function() {
  this.logger.info('Waiting for AMQP connection...');
};

amqp.ready = function() {
  this.logger.log('AMQP Connection ready');
};

amqp.error = function(provider, err) {
  this.logger.error('AMQP Connection error.', err.message);
};

amqp.fanoutdeclaration = function(provider, name) {
  this.logger.info('Declared fanout exchange', name);
};

amqp.fanoutbind = function(provider, exchangeName, routingKey, fanout) {
  this.logger.info('Bound', fanout.name, 'fanout exchange to', exchangeName, 'with', routingKey);
};

amqp.userqueuedeclaration = function(provider, name) {
  this.logger.info('Declared user queue:', name);
};

amqp.queuefanoutbind = function(provider, queue, fanout, routingKey) {
  this.logger.info('Bound', queue.name, 'user queue to', fanout.name);
};

amqp.subscribe = function(provider, info) {
  this.logger.info('Subscription to', info.exchange, 'on', info.routingKey, 'ready');
};