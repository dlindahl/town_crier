var EventStream = function(subscriber) {
  this.subscriber = subscriber;
};

var OpenHeaders = {
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache',
  'Connection'    : 'keep-alive'
};

EventStream.prototype.onConnectionEnd = function() {
  this.subscriber.logger('log', 'Event Source ended');
};

EventStream.prototype.onConnectionClose = function() {
  this.subscriber.logger('log', 'Event Source closed');
  this.subscriber.req.connection.removeAllListeners();
};

EventStream.prototype.open = function() {
  this.subscriber.req.connection.on('end',   this.onConnectionEnd.bind(this),   false);
  this.subscriber.req.connection.on('close', this.onConnectionClose.bind(this), false);

  // let request last as long as possible
  this.subscriber.req.socket.setTimeout(Infinity);

  // send headers for event-stream connection
  this.subscriber.res.writeHead(200, OpenHeaders);
  this.write('\n');

  return this;
};

EventStream.prototype.write = function(packet) {
  var res = this.subscriber.res;

  if(typeof packet === 'string') {
    res.write(packet);
  } else if(typeof packet == 'object') {
    var keys = Object.keys(packet),
        i    = 0,
        len  = keys.length;

    for(i; i < len; i++) {
      res.write(keys[i]+': '+packet[keys[i]]+'\n\n');
    }
  }
};

module.exports = EventStream;