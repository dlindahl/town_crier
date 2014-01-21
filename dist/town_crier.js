/*! Town Crier - v0.0.1 - 2014-01-20
* https://github.com/dlindahl/town_crier
* Copyright (c) 2014 Derek Lindahl; Licensed MIT, GPL */
!function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = "function" == typeof require && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        throw new Error("Cannot find module '" + o + "'");
      }
      var f = n[o] = {
        exports: {}
      };
      t[o][0].call(f.exports, function(e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, f, f.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  for (var i = "function" == typeof require && require, o = 0; o < r.length; o++) s(r[o]);
  return s;
}({
  1: [ function(require, module) {
    // Global config settings
    function configure(options) {
      return options ? (Object.keys(options).forEach(function(k) {
        globalCfg[k] = options[k];
      }), globalCfg) : globalCfg;
    }
    // Main TownCrier constructor
    function TownCrier(options) {
      options || (options = {}), Object.keys(globalCfg).forEach(function(k) {
        "undefined" == typeof options[k] && (options[k] = globalCfg[k]);
      }), this.options = options, this.state = DISCONNECTED;
    }
    function autoReconnect(e) {
      this.trigger("reconnect", e, this), this.connect();
    }
    function onOpen(e) {
      this.state = CONNECTED, this.trigger("open", e, this);
    }
    function onMessage(e) {
      var data = e.data;
      try {
        data = JSON.parse(data);
      } catch (err) {}
      this.trigger("message", data, e, this);
    }
    function onError(e) {
      var srcEvent = e.currentTarget;
      srcEvent.readyState === ES.CLOSED ? this.state == CONNECTING ? // Enable auto reconnect in browsers that don't support it (i.e. FF 26.0)
      setTimeout(autoReconnect.bind(this, e), this.options.retryInterval) : this.disconnect() : srcEvent.readyState === ES.CONNECTING ? (this.state = CONNECTING, 
      this.trigger("reconnect", e, this)) : this.trigger("error", e, this);
    }
    function onClose(e) {
      this.trigger("close", e, this);
    }
    function validateConfiguration(opts) {
      var errs = [];
      if ((!opts.url || opts.url && !/\S/.test(opts.url)) && errs.push("URL cannot be blank"), 
      !opts.bindings || opts.bindings && !opts.bindings.length || 0 === opts.bindings.length ? errs.push("Bindings cannot be empty") : opts.bindings.forEach(function(binding) {
        return binding.exchange && "" !== binding.exchange ? binding.routingKey && "" !== binding.routingKey ? void 0 : (errs.push("Binding routing key cannot be blank"), 
        !1) : (errs.push("Binding exchange cannot be blank"), !1);
      }), errs.length > 0) throw new errors.InvalidConfiguration(errs.join(", "));
    }
    function connect() {
      validateConfiguration(this.options);
      var url = this.options.url;
      return this.options.token && (url += "?token=" + this.options.token), this.options.userId && (url += "&userId=" + this.options.userId), 
      this.options.bindings.forEach(function(binding) {
        url += "&exchanges[]=" + binding.exchange, url += "&routingKeys[]=" + binding.routingKey;
      }), this._onOpen = onOpen.bind(this), this._onMessage = onMessage.bind(this), this._onError = onError.bind(this), 
      this._onClose = onClose.bind(this), this.state = CONNECTING, this.source = new ES(url), 
      this.source.addEventListener("open", this._onOpen, !1), this.source.addEventListener("message", this._onMessage, !1), 
      this.source.addEventListener("error", this._onError, !1), this.source.addEventListener("close", this._onClose, !1), 
      this;
    }
    function disconnect() {
      return this.source.close(), this._onOpen && (this.source.removeEventListener("open", this._onOpen), 
      delete this._onOpen), this._onMessage && (this.source.removeEventListener("message", this._onMessage), 
      delete this._onMessage), this._onError && (this.source.removeEventListener("error", this._onError), 
      delete this._onError), this._onClose && (this.source.removeEventListener("close", this._onClose), 
      delete this._onClose), delete this.source, this.state = DISCONNECTED, this.trigger("close", this), 
      this;
    }
    var ES = window.EventSource, semver = require("./version"), errors = require("./errors"), events = require("./events"), bind = events.bind, unbind = events.unbind, trigger = events.trigger, DISCONNECTED = ES.CLOSED, CONNECTING = ES.CONNECTING, CONNECTED = ES.OPEN, globalCfg = {
      url: null,
      token: null,
      userId: null,
      retryInterval: 3e3
    };
    TownCrier.__defineGetter__("config", function() {
      return Object.create(globalCfg);
    });
    // Define the public API
    var TC = TownCrier;
    TC.configure = configure, TC.VERSION = semver, TC.prototype = {
      connect: connect,
      disconnect: disconnect,
      trigger: trigger,
      bind: bind,
      unbind: unbind,
      on: bind,
      off: unbind
    }, module.exports = TC;
  }, {
    "./errors": 2,
    "./events": 3,
    "./version": 5
  } ],
  2: [ function(require, module, exports) {
    // Base TownCrier Error.
    function TownCrierError(msg) {
      Error.call(this), Error.captureStackTrace(this, arguments.callee), this.message = msg;
    }
    TownCrierError.prototype = Error.prototype, TownCrierError.prototype.name = "TownCrierError", 
    exports.TownCrierError = TownCrierError;
    var errors = [ [ "InvalidConfiguration", "Invalid configuration" ] ];
    errors.forEach(function(err) {
      var errorName = err[0], defaultMsg = err[1];
      errorFn = exports[errorName] = function(msg) {
        TownCrierError.call(this, msg || defaultMsg);
      }, errorFn.prototype = TownCrierError.prototype, errorFn.prototype.name = "TownCrierError::" + errorName;
    });
  }, {} ],
  3: [ function(require, module) {
    function bind(event, callback) {
      var events = event.split(" "), cbs = this._callbacks || (this._callbacks = {});
      return events.forEach(function(name) {
        cbs[name] || (cbs[name] = []), cbs[name].push(callback);
      }), this;
    }
    function unbind(ev, callback) {
      if (0 === arguments.length) return this._callbacks = {}, this;
      if (!ev) return this;
      var list, evs = ev.split(" ");
      return evs.forEach(function(name) {
        return (list = this._callbacks[name]) ? callback ? void list.forEach(function(cb, i) {
          return cb ? cb !== callback ? !0 : (list = list.slice(), list.splice(i, 1), this._callbacks = list, 
          !1) : !0;
        }.bind(this)) : (delete this._callbacks[name], this) : this;
      }.bind(this)), this;
    }
    function trigger() {
      var args = 0 === arguments.length ? [] : Array.prototype.slice.call(arguments, 0), ev = args.shift(), list = this._callbacks[ev];
      if (list) return list.forEach(function(callback) {
        return callback.apply(this, args) === !1 ? !1 : void 0;
      }), !0;
    }
    module.exports = {
      bind: bind,
      unbind: unbind,
      trigger: trigger
    };
  }, {} ],
  4: [ function(require) {
    window.TownCrier = require("./client");
  }, {
    "./client": 1
  } ],
  5: [ function(require, module) {
    module.exports = "0.0.1";
  }, {} ]
}, {}, [ 4 ]);