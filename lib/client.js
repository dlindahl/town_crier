var util          = require('util'),
    events        = require('events'),
    extend        = require('node.extend'),
    EventStream   = require('./event_stream'),
    Logger        = require('./logger'),
    Validations   = require('./client/Validations'),
    Binder        = require('./client/event_source_bindings'),
    logSubscriber = require('./log_subscribers/client_subscriber');

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

  // Watch for memory leaks?
  var logSub = new logSubscriber(this.logger);
  logSub.attachTo(this);

  Binder.call(this, es);
  Validations.call(this);
}

function unsubscribe(fanout, queue, ctag) {
  queue.unsubscribe(ctag);

  this.queue.removeListener('message', this._onMessage);

  this.queue = null;
  this.ctag  = null;

  this.emit('unsubscribe', this, queue, ctag);
}

function subscribe(fanout, queue, ctag) {
  this.queue = queue;
  this.ctag  = ctag;

  this.queue.on('message', this._onMessage);

  this.emit('subscribe', this, fanout, queue, ctag);
}

function openStream(eventsource) {
  this.stream.open();

  this.emit('streamOpen', this);
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