var util   = require('util'),
    events = require('events'),
    extend = require('node.extend');

var logSubscriber = require('./log_subscribers/event_stream_subscriber');

var OpenHeaders = {
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache',
  'Connection'    : 'keep-alive',
  'Access-Control-Allow-Origin' : '*'
};

function EventStream(client) {
  events.EventEmitter.call(this);
  this.client = client;

  // Watch for memory leaks?
  var logSub = new logSubscriber();
  logSub.attachTo(this);
}

function onConnectionEnd() {
  this.emit('connectionEnd', this);
}

function onConnectionClose() {
  this.emit('connectionClose', this);
  this.client.req.connection.removeAllListeners();
}

function open() {
  this.client.req.connection.on('end',   onConnectionEnd.bind(this),   false);
  this.client.req.connection.on('close', onConnectionClose.bind(this), false);

  // let request last as long as possible
  // TODO: Make this configurable
  this.client.req.socket.setTimeout(Infinity);

  // send headers for event-stream connection
  this.client.res.writeHead(200, OpenHeaders);
  this.write('\n');

  return this;
}

function write(packet) {
  var res = this.client.res;

  if(typeof packet === 'string') {
    res.write(packet);
  } else if(typeof packet == 'object') {
    Object.keys(packet).forEach(function(key) {
      res.write(key+': '+packet[key]+'\n\n');
    });
  }
}

// Declare the public API
util.inherits(EventStream, events.EventEmitter);
extend(EventStream.prototype, {
  open  : open,
  write : write
});

module.exports = EventStream;