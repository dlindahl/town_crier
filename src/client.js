var ES      = window.EventSource,
    semver  = require('./version'),
    events  = require('./events'),
    bind    = events.bind,
    unbind  = events.unbind,
    trigger = events.trigger;

var DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    globalCfg = {
      appName  : null,
      hostname : '',
      token    : '',
      userId   : '',
      retryInterval : 3000,
    };

// Global config settings
function configure(options) {
  if(!options) return globalCfg;

  Object.keys(options).forEach(function(k) {
    globalCfg[k] = options[k];
  });

  return globalCfg;
}

// Main TownCrier constructor
function TownCrier(options) {
  Object.keys(globalCfg).forEach(function(k) {
    if(typeof options[k] === 'undefined') options[k] = globalCfg[k];
  });

  this.options = options;
  this.state = DISCONNECTED;
}

TownCrier.__defineGetter__('config', function() {
  return Object.create(globalCfg);
});

function autoReconnect(e) {
  this.trigger('reconnect', e, this);
  this.connect();
}

function onOpen(e) {
  this.state = CONNECTED;
  this.trigger('open', e, this);
}

function onMessage(e) {
  var data = e.data;
  try {
    data = JSON.parse(data);
  } catch(err) {
    // No-op. Payload wasn't JSON
  }
  this.trigger('message', data, e, this);
}

function onError(e) {
  var srcEvent = e.currentTarget;

  if (srcEvent.readyState === ES.CLOSED) {
    if(this.state == CONNECTING) {
      // Enable auto reconnect in browsers that don't support it (i.e. FF 26.0)
      setTimeout(autoReconnect.bind(this, e), this.options.retryInterval);
    } else {
      this.disconnect();
    }
  } else if (srcEvent.readyState === ES.CONNECTING) {
    this.state = CONNECTING;
    this.trigger('reconnect', e, this);
  } else {
    this.trigger('error', e, this);
  }
}

function onClose() {
  this.trigger('close', this);
}

function connect() {
  var host = this.options.hostname,
      url = host+'/firehose/'+this.options.appName;

  if(this.options.token) url += '?token='+this.options.token;

  this.options.bindings.forEach(function(binding) {
    if(binding.exchange === '') {
      throw new Error('Invalid Exchange name: "'+binding.exchange+'"');
    }
    url += '&exchanges[]=' + binding.exchange;
    url += '&routingKeys[]=' + binding.routingKey;
  });
  url += '&userId=' + this.options.userId;

  this._onOpen    = onOpen.bind(this);
  this._onMessage = onMessage.bind(this);
  this._onError   = onError.bind(this);
  this._onClose   = onClose.bind(this);

  this.state = CONNECTING;

  this.source = new ES(url);

  this.source.addEventListener('open',    this._onOpen,    false);
  this.source.addEventListener('message', this._onMessage, false);
  this.source.addEventListener('error',   this._onError,   false);
  this.source.addEventListener('close',   this._onClose,   false);

  return this;
}

function disconnect() {
  this.source.close();

  if(this._onOpen) {
    this.source.removeEventListener('open', this._onOpen);
    delete this._onOpen;
  }
  if(this._onMessage) {
    this.source.removeEventListener('message', this._onMessage);
    delete this._onMessage;
  }
  if(this._onError) {
    this.source.removeEventListener('error', this._onError);
    delete this._onError;
  }
  if(this._onClose) {
    this.source.removeEventListener('close', this._onClose);
    delete this._onClose;
  }

  delete this.source;

  this.state = DISCONNECTED;

  this.trigger('close', this);

  return this;
}

// Define the public API
var TC = TownCrier;
TC.configure = configure;
TC.VERSION = semver;
TC.prototype = {
  connect    : connect,
  disconnect : disconnect,
  trigger    : trigger,
  bind       : bind,
  unbind     : unbind,
  on         : bind,
  off        : unbind
};

module.exports = TC;