var extend       = require('node.extend'),
    EventEmitter = require('events').EventEmitter;

exports = module.exports = createClient;

var OpenHeaders = {
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache',
  'Connection'    : 'keep-alive',
  'Access-Control-Allow-Origin' : '*'
};

var proto = {};

function createClient(req, res, next) {
  var allowHeaders = true;
  function client() {
    this.id            = req.query.userId + ':' + process.hrtime()[1];
    this.appName       = req.params.app_name   || req.query.appName || 'unknown';
    this.exchanges     = req.query.exchanges   || [];
    this.routingKeys   = req.query.routingKeys || [];
    this.subscriptions = [];

    this.openStream  = openStream.bind(this);
    this.writeStream = writeStream.bind(this);
    this.closeStream = closeStream.bind(this);
    this.disconnect  = disconnect.bind(this);
  }

  function openStream() {
    allowHeaders = true;

    res.on('end',   this.disconnect);
    res.on('close', this.disconnect);

    // Keep the socket open as long as possible
    req.socket.setTimeout(Infinity);

    // Send headers for event-stream connection
    res.writeHead(200, OpenHeaders);
    allowHeaders = false;
    res.write('\n');
  }

  function writeStream(sub, packet) {
    var out = [];

    if(typeof packet === 'string') {
      out.push(packet);
      res.write(packet);
    } else if(typeof packet === 'object') {
      var line;
      Object.keys(packet).forEach(function(key) {
        var value = packet[key];
        if('object' === typeof value) value = JSON.stringify(value);
        out.push(line = key+': '+value);
        res.write(line+'\n\n');
      });
    }
    console.log('wrote', out.join(', '));
  }

  function closeStream(status, reason) {
    if(res.socket.writable) {
      // Omitting values causes very bad things
      // TODO: Throw an error
      status = status || 200;
      reason = reason || 'Ok';

      if(allowHeaders) {
        res.set('Connection', 'close');
        res.send(status, reason);
      }
      res.end();
    }

    res.removeAllListeners();
    console.log('stream closed!');
  }

  function disconnect(err) {
    var status, reason;

    this.unsubscribeAll();

    if(err) {
      status = 500;
      reason = err.message;
    }

    this.closeStream(status, reason);
  }

  extend(client.prototype, proto);
  extend(client.prototype, EventEmitter.prototype);

  client.prototype.__defineGetter__('subscriptionInfo', function subscriptionInfo() {
    var exs      = this.exchanges,
        keys     = this.routingKeys,
        clientId = this.id,
        appName  = this.appName;

    return this.exchanges.map(function(ex, i) {
      return { exchange:ex, routingKey:keys[i], clientId:clientId, appName:appName };
    });
  });

  return new client();
}

proto.subscribe = function subscribe(info, provider) {
  var sub = provider.subscribe(info);
  sub.on('message', this.writeStream, sub);
  this.subscriptions.push(sub);
};

proto.subscribeAll = function subscribeAll(provider) {
  var c = this;
  c.subscriptionInfo.forEach(function(info, key) {
    c.subscribe(info, provider);
  });
};

proto.unsubscribe = function unsubscribe(sub) {
  var idx = this.subscriptions.indexOf(sub);

  if(idx > -1) this.subscriptions.splice(idx, 1);

  sub.emit('ended');

  sub.removeAllListeners();

  return sub;
};

proto.unsubscribeAll = function unsubscribe() {
  while(this.subscriptions.length > 0) {
    this.unsubscribe(this.subscriptions[0]);
  }
};