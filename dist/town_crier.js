(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

function autoReconnect() {
  this.trigger('reconnect', e, this);
  this.connect();
}

function onOpen(e) {
  this.state = CONNECTED;
  this.trigger('open', e, this);
}

function onMessage() {
  this.trigger('message', this);
}

function onError(e) {
  var srcEvent = e.currentTarget;

  if (srcEvent.readyState === ES.CLOSED) {
    if(this.state == CONNECTING) {
      // Enable auto reconnect in browsers that don't support it (i.e. FF 26.0)
      setTimeout(autoReconnect.bind(this), this.options.retryInterval);
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

  this.source.addEventListener('open',    this._onOpen,  false);
  this.source.addEventListener('message', this._onOpen,  false);
  this.source.addEventListener('error',   this._onError, false);
  this.source.addEventListener('close',   this._onClose, false);

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
},{"./events":2,"./version":4}],2:[function(require,module,exports){
function bind(event, callback) {
  var name,
      events = event.split(' '),
      cbs = this._callbacks || (this._callbacks = {});

  events.forEach(function(name) {
    cbs[name] || (cbs[name] = []);
    cbs[name].push(callback);
  });

  return this;
}

function unbind(ev, callback) {
  if(arguments.length === 0) {
    this._callbacks = {};
    return this;
  }

  if(!ev) return this;

  var list,
      evs = ev.split(' ');

  evs.forEach(function(name) {
    list = this._callbacks[name];

    if(!list) return this;

    if(!callback) {
      delete this._callbacks[name];
      return this;
    }

    list.forEach(function(cb, i) {
      if(!cb) return true;

      if(cb !== callback) return true;

      list = list.slice();
      list.splice(i, 1);
      this._callbacks = list;

      return false;
    }.bind(this));
  }.bind(this));

  return this;
}

function trigger() {
  var args = arguments.length === 0 ? [] : Array.prototype.slice.call(arguments, 0),
      ev = args.shift(),
      list = this._callbacks[ev];

  if(!list) return;

  list.forEach(function(callback) {
    if(callback.apply(this, args) === false) {
      return false;
    }
  });

  return true;
}

module.exports = {
  bind    : bind,
  unbind  : unbind,
  trigger : trigger
};
},{}],3:[function(require,module,exports){
window.TownCrier = require('./client');
},{"./client":1}],4:[function(require,module,exports){
module.exports = '0.0.1';
},{}]},{},[3])