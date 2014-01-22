var util     = require('util'),
    events   = require('events'),
    extend = require('node.extend'),
    EventStream = require('./event_stream'),
    Logger = require('./logger'),
    Validations = require('./client/Validations'),
    Binder = require('./client/event_source_bindings');

function Client(es, options, req, res) {
  events.EventEmitter.call(this);

  this.req   = req;
  this.res   = res;
  this.queue = null;
  this.ctag  = null;
  this.options = options || {};

  if(this.req.params.userId) {
    this.userId = this.req.params.userId;
  } else if(this.req.query.userId) {
    this.userId = this.req.query.userId;
  } else {
    this.userId = this.req.sessionID;
  }

  this.stream = new EventStream(this);

  this.logger = new Logger('[TownCrier:'+this.userId+']');

  Binder.call(this, es);
  Validations.call(this);
}

function unsubscribe(fanout, queue, ctag) {
  queue.unsubscribe(ctag);

  this.queue.removeListener('message', this._onMessage);

  this.queue = null;
  this.ctag  = null;

  this.logger.log('Client disconnected from user queue: '+queue.name);

  this.emit('unsubscribe', this, queue, ctag);
}

function subscribe(fanout, queue, ctag) {
  this.queue = queue;
  this.ctag  = ctag;

  this.logger.log('Client connected to user queue: '+queue.name);
  this.logger.log('Ready to receive messages on fanout exchange: "'+fanout.name+'"');

  this.queue.on('message', this._onMessage);

  this.emit('subscribe', this, fanout, queue, ctag);
}

function openStream(eventsource) {
  this.stream.open();

  this.logger.log('Event Source opened', this.req.params);
}

function destroy() {
  this.emit('destroy', this);

  return true;
}

// Declare the public API
util.inherits(Client, events.EventEmitter);
extend(Client.prototype, {
  subscribe    : subscribe,
  unsubscribe  : unsubscribe,
  openStream   : openStream,
  destroy      : destroy
});

module.exports = Client;