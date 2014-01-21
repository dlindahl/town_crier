var util = require('util'),
    extend = require('node.extend'),
    LogSubscriber = require('../../log_subscriber');

function AMQPSubscriber() {
  LogSubscriber.apply(this, arguments);
}
util.inherits(AMQPSubscriber, LogSubscriber);

function beforeConnect(amqp) {
  var url = amqp.options.login + '@' + amqp.options.host + ':' + amqp.options.port;
  this.logger.log('Attempting to establish AMQP connection with ' + url);

  if(amqp.connection) {
    if(amqp.connection._connecting) {
      this.logger.log('Still waiting for connection...');
    } else {
      this.logger.log('Connection already established');
    }
  } else {
    this.logger.log('=> Connecting to AMQP...');
  }
}

function ready() {
  this.logger.log('AMQP connection established');
}

function beforeQueueBind(amqp, queue, fanout, subscriber) {
  subscriber.logger('log','Binding user queue: "'+queue.name+'" to fanout exchange: "'+fanout.name+'"');
}

function queueBind(amqp, fanout, subscriber) {
  subscriber.logger('log','Ready to receive messages on fanout exchange: "'+fanout.name+'"');
}

function beforeQueueDeclare(amqp, name, subscriber) {
  subscriber.logger('log','Declaring user queue: "'+name+'"');
}

function beforeFanoutBind(amqp, fanout, exchangeName, subscriber) {
  subscriber.logger('log','Binding fanout exchange: "'+fanout.name+'" to exchange: "'+exchangeName+'"');
}

function beforeFanoutDeclare(amqp, name, subscriber) {
  subscriber.logger('log','Declaring fanout exchange: "'+name+'"');
}

function bindingError(amqp, subscriber, err) {
  subscriber.logger('log','Binding Error:', err);
}

extend(AMQPSubscriber.prototype, {
  beforeConnect       : beforeConnect,
  ready               : ready,
  beforeQueueBind     : beforeQueueBind,
  queueBind           : queueBind,
  beforeQueueDeclare  : beforeQueueDeclare,
  beforeFanoutBind    : beforeFanoutBind,
  beforeFanoutDeclare : beforeQueueDeclare
});

module.exports = AMQPSubscriber;