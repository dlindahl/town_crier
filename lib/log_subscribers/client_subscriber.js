var util = require('util'),
    extend = require('node.extend'),
    LogSubscriber = require('../log_subscriber');

function ClientSubscriber() {
  LogSubscriber.apply(this, arguments);
}
util.inherits(ClientSubscriber, LogSubscriber);

function invalid(client, msg) {
  var params = client.req.params,
      query  = client.req.query;

  this.logger.error('Connection rejected:',msg+'.','Parameters:', params, query);
}

function message(client, headers, payload, key) {
  this.logger.info('Received message', payload.id, 'from', key);
}

function streamOpen(client) {
  this.logger.log('Event Source opened', client.req.params);
}

function subscribe(client, fanout, queue, ctag) {
  this.logger.log('Connected to user queue:', queue.name);
  this.logger.log('Ready to receive messages on fanout exchange: "'+fanout.name+'"');
}

function unsubscribe(client, queue, ctag) {
  this.logger.log('Disconnected from user queue:', queue.name);
}

function parseError(client, err) {
  this.logger.error('JSON Parsing Error:', err);
}

extend(ClientSubscriber.prototype, {
  invalid     : invalid,
  message     : message,
  streamOpen  : streamOpen,
  subscribe   : subscribe,
  parseError  : parseError,
  unsubscribe : unsubscribe
});

module.exports = ClientSubscriber;