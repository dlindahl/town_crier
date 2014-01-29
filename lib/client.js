var extend        = require('node.extend'),
    EventEmitter  = require('events').EventEmitter,
    logSubscriber = require('./log_subscriber');

exports = module.exports = createClient;

var DEFAULT_PULSE = 1000,
    OpenHeaders = {
      'Content-Type'  : 'text/event-stream',
      'Cache-Control' : 'no-cache',
      'Connection'    : 'keep-alive',
      'Access-Control-Allow-Origin' : '*'
    };

var proto = {};

function createClient(options, req, res, next, mwLogger) {
  var allowHeaders = true,
      heartbeat    = null;

  function client() {
    this.appName       = req.params.app_name   || req.query.appName || 'unknown';
    this.id            = [this.appName, req.query.userId, process.hrtime()[1]].join(':');
    this.exchanges     = req.query.exchanges   || [];
    this.routingKeys   = req.query.routingKeys || [];
    this.subscriptions = [];

    this.openStream  = openStream.bind(this);
    this.writeStream = writeStream.bind(this);
    this.closeStream = closeStream.bind(this);
    this.connect     = connect.bind(this);
    this.disconnect  = disconnect.bind(this);

    // Make a copy of the defined logger and append the client ID to the prefix.
    var logger = Object.create(mwLogger);
    logger.prefix += ':'+this.id;
    this.logger = logger;

    logSubscriber('client').attachTo(this);
  }

  function openStream() {
    allowHeaders = true;

    req.on('end',   this.disconnect);
    req.on('close', this.disconnect);

    // Keep the socket open as long as possible
    req.socket.setTimeout(options.timeout || Infinity);

    // Send headers for event-stream connection
    res.writeHead(200, OpenHeaders);
    allowHeaders = false;
    res.write('\n');

    this.emit('streamopen', this);
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

    this.emit('streamwrite', this, out);
  }

  function closeStream(status, reason) {
    // Omitting values causes very bad things
    // TODO: Throw an error?
    status = status || 200;
    reason = reason || 'Ok';

    if(res.socket.writable) {
      if(allowHeaders) {
        res.set('Connection', 'close');
        res.send(status, reason);
      }
      res.end();
    }

    res.removeAllListeners();

    this.emit('streamclose', this, status, reason);
  }

  function connect() {
    this.openStream();

    if('undefined' === typeof options.heartbeat || options.heartbeat) startHeartBeat(this);

    this.emit('connect', this);
  }

  function pulse() {
    this.writeStream(null, ': Heartbeat ' + (+new Date()));
  }

  function startHeartBeat(client) {
    heartbeat = setInterval(pulse.bind(client), options.heartbeat || DEFAULT_PULSE);
  }

  function disconnect(err) {
    var status, reason;

    this.unsubscribeAll();

    if(err) {
      status = 500;
      reason = err.message ? err.message : err;
      this.logger.error(reason);
    }

    clearInterval(heartbeat);

    this.closeStream(status, reason);

    this.emit('disconnect', this, status, reason);

    this.removeAllListeners();
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
  sub.logger = this.logger;
  sub.on('message', this.writeStream, sub);
  this.subscriptions.push(sub);

  sub.emit('begin', sub, this, info, provider);
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

  sub.emit('ended', sub, this);

  sub.removeAllListeners();

  return sub;
};

proto.unsubscribeAll = function unsubscribe() {
  while(this.subscriptions.length > 0) {
    this.unsubscribe(this.subscriptions[0]);
  }
};