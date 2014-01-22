var util = require('util'),
    extend = require('node.extend'),
    LogSubscriber = require('../../log_subscriber');

function AMQPSubscriber() {
  LogSubscriber.apply(this, arguments);
}
util.inherits(AMQPSubscriber, LogSubscriber);

function beforeConnect(amqp) {
  var states = amqp.constructor.states;

  switch(amqp.state) {
    case states.CLOSED:
      var url = amqp.options.login + '@' + amqp.options.host + ':' + amqp.options.port;
      this.logger.log('Attempting to establish AMQP connection with ' + url);
      this.logger.log('=> Connecting to AMQP...');
      break;
    case states.CONNECTING:
      this.logger.log('=> Still waiting for AMQP connection...');
      break;
    case states.READY:
      this.logger.log('=> AMQP connection already established');
      break;
  }
}

function ready() {
  this.logger.log('=> AMQP connection established');
}

function beforeQueueBind(amqp, queue, fanout, client) {
  client.logger.log('Binding user queue: "'+queue.name+'" to fanout exchange: "'+fanout.name+'"');
}

function beforeQueueDeclare(amqp, name, client) {
  client.logger.log('Declaring user queue: "'+name+'"');
}

function beforeFanoutBind(amqp, fanout, exchangeName, client) {
  client.logger.log('Binding fanout exchange: "'+fanout.name+'" to exchange: "'+exchangeName+'"');
}

function beforeFanoutDeclare(amqp, name, client) {
  client.logger.log('Declaring fanout exchange: "'+name+'"');
}

function bindingError(amqp, client, err) {
  client.logger.log('Binding Error:', err);
}

extend(AMQPSubscriber.prototype, {
  beforeConnect       : beforeConnect,
  ready               : ready,
  beforeQueueBind     : beforeQueueBind,
  beforeQueueDeclare  : beforeQueueDeclare,
  beforeFanoutBind    : beforeFanoutBind,
  beforeFanoutDeclare : beforeQueueDeclare
});

module.exports = AMQPSubscriber;