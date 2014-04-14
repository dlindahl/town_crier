/* jshint browser:true */
'use strict';

var ES = window.EventSource;
var proto = {};
var handlers = {};

function autoReconnect(e) {
  this.emit('reconnect', e, this);
  this.connect();
}

handlers.onopen = function onopen(e) {
  this.state = this.constructor.CONNECTED;
  this.emit('open', e, this);
};

handlers.onmessage = function onmessage(e) {
  var data = e.data;
  try {
    data = JSON.parse(data);
  } catch(err) {
    // No-op. Payload wasn't JSON
  }
  this.emit('message', data, e, this);
};

handlers.onerror = function onerror(e) {
  var srcEvent = e.currentTarget;

  if(srcEvent.readyState === ES.CLOSED) {
    if(this.state === this.constructor.CONNECTING) {
      // Enable auto reconnect in browsers that don't support it (i.e. FF 26.0)
      setTimeout(autoReconnect.bind(this, e), this.options.retryInterval);
    } else {
      this.disconnect();
    }
  } else if(srcEvent.readyState === ES.CONNECTING) {
    this.state = this.constructor.CONNECTING;
    this.emit('reconnect', e, this);
  } else {
    this.emit('error', e, this);
  }
};

handlers.onclose = function onclose(e) {
  this.emit('close', e, this);
};

var events = ['open','message','error','close'];
function handleSourceEvents(method, client) {
  var fn = 'removeEventListener';
  if('bind' === method) {
    fn = 'addEventListener';
  }

  events.forEach(function(evt) {
    var cb = client['on'+evt];
    cb = cb || function() {
      handlers['on'+evt].apply(client, arguments);
    };
    client.source[fn](evt, cb, false);
  });
}

proto.connect = function connect() {
  this.constructor.validateConfiguration(this.options);

  var url = this.options.url;

  if(this.options.token) url += '?token='+this.options.token;
  if(this.options.userId) url += '&userId=' + this.options.userId;

  this.options.bindings.forEach(function(binding) {
    var key = binding.routingKey;
    // Escape hashes since they are a valid URL component and will interpretted
    // as such and will not be sent down the wire.
    key = key.replace(/#/g, encodeURIComponent('#'));

    url += '&exchanges[]=' + binding.exchange;
    url += '&routingKeys[]=' + key;
  });

  this.state = this.constructor.CONNECTING;
  this.source = new ES(url);
  handleSourceEvents('bind', this);

  return this;
};

proto.disconnect = function disconnect() {
  if(this.source) {
    this.source.close();
    handleSourceEvents('unbind', this);
    delete this.source;
  }

  this.state = this.constructor.DISCONNECTED;
  this.emit('close', this);

  return this;
};

module.exports = proto;