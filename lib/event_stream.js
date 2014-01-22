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

function open() {
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

function close(status, reason) {
  // Omitting values causes very bad things
  // TODO: Throw an error
  status = status || 200;
  reason = reason || 'Ok';

  this.client.res.set('Connection', 'close');
  this.client.res.send(status, reason);
  this.client.res.end();
}

// Declare the public API
util.inherits(EventStream, events.EventEmitter);
extend(EventStream.prototype, {
  open  : open,
  write : write,
  close : close
});

module.exports = EventStream;