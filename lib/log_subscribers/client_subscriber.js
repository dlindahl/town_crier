var util = require('util'),
    extend = require('node.extend'),
    LogSubscriber = require('../log_subscriber');

function ClientSubscriber() {
  LogSubscriber.apply(this, arguments);
}
util.inherits(ClientSubscriber, LogSubscriber);

function connectionEnd() {
  this.logger.log('Connection ended');
}

function connectionClose() {
  this.logger.log('Connection closed');
}

function invalid(client, msg) {
  var params = client.req.params,
      query  = client.req.query;

  this.logger.error('Connection rejected:',msg+'.','Parameters:', params, query);
}

function message(client, msg) {
  this.logger.info('Received message', msg.id, 'from', msg.data.routingKey, '(via '+msg.data.boundRoutingKey+')');
}

function subscribe(client, fanout, queue, ctag) {
  this.logger.log('Connected to user queue:', queue.name);
  this.logger.log('Ready to receive messages on fanout exchange: "'+fanout.name+'"');
}

function unsubscribe(client, queue, ctag) {
  this.logger.log('Disconnected from user queue:', queue.name);
}

function open() {
  this.logger.log('Opened stream');
}

function write(stream, packet, output) {
  this.logger.log('Wrote to stream:');
  output.forEach(function(line) {
    this.logger.log('  ', line);
  }.bind(this));
}

function close() {
  this.logger.log('Closed stream');
}

extend(ClientSubscriber.prototype, {
  close           : close,
  connectionClose : connectionClose,
  connectionEnd   : connectionEnd,
  invalid         : invalid,
  message         : message,
  open            : open,
  subscribe       : subscribe,
  unsubscribe     : unsubscribe,
  write           : write
});

module.exports = ClientSubscriber;