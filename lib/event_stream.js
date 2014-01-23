var util   = require('util'),
    events = require('events'),
    extend = require('node.extend');

var OpenHeaders = {
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache',
  'Connection'    : 'keep-alive',
  'Access-Control-Allow-Origin' : '*'
};

function EventStream(client) {
  events.EventEmitter.call(this);
  this.client = client;
}

function open() {
  // let request last as long as possible
  // TODO: Make this configurable
  this.client.req.socket.setTimeout(Infinity);

  // send headers for event-stream connection
  this.client.res.writeHead(200, OpenHeaders);
  this.write('\n');

  this.emit('open', this);

  return this;
}

function write(packet) {
  var res = this.client.res,
      out = [];

  if(typeof packet === 'string') {
    out.push(packet);
    res.write(packet);
  } else if(typeof packet === 'object') {
    var line;
    Object.keys(packet).forEach(function(key) {
      out.push(line = key+': '+packet[key]);
      res.write(line+'\n\n');
    });
  }

  this.emit('write', this, packet, out);
}

function close(status, reason) {
  // Omitting values causes very bad things
  // TODO: Throw an error
  status = status || 200;
  reason = reason || 'Ok';

  this.client.res.set('Connection', 'close');
  this.client.res.send(status, reason);
  this.client.res.end();

  this.emit('close', this);
}

// Declare the public API
util.inherits(EventStream, events.EventEmitter);
extend(EventStream.prototype, {
  open  : open,
  write : write,
  close : close
});

module.exports = EventStream;