var extend = require('node.extend');

exports = module.exports = createClient;

var OpenHeaders = {
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache',
  'Connection'    : 'keep-alive',
  'Access-Control-Allow-Origin' : '*'
};

var proto = {};

function createClient(req, res, next) {
  function client() {
    this.id            = req.query.userId + ':' + process.hrtime()[1];
    this.appName       = req.params.app_name   || req.query.appName || 'unknown';
    this.exchanges     = req.query.exchanges   || [];
    this.routingKeys   = req.query.routingKeys || [];
    this.subscriptions = [];

    this.openStream  = openStream.bind(this);
    this.writeStream = writeStream.bind(this);
    this.closeStream = closeStream.bind(this);
  }

  function openStream() {
    req.socket.setTimeout(Infinity);

    // Send headers for event-stream connection
    res.writeHead(200, OpenHeaders);
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
    if(status && !reason) {
      // Close on catch statements in the Middleware layer
      reason = status.message;
      status = 500;
    } else {
      // Omitting values causes very bad things
      // TODO: Throw an error
      status = status || 200;
      reason = reason || 'Ok';
    }

    res.set('Connection', 'close');
    res.send(status, reason);
    res.end();
  }

  extend(client.prototype, proto);

  client.prototype.__defineGetter__('subscriptionInfo', function subscriptions() {
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

proto.unsubscribe = function unsubscribe() {

};

proto.destroy = function closeStream() {

};