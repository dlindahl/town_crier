(function(ES) {
  var globalCfg = {
    appName  : null,
    hostname : '',
    token    : '',
    userId   : ''
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
  }

  TownCrier.__defineGetter__('config', function() {
    return Object.create(globalCfg);
  });

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

  function onOpen(e) {
    this.trigger('open', e, this);
  }

  function onMessage() {
    this.trigger('message', this);
  }

  function onError(e) {
    var srcEvent = e.currentTarget;

    if (srcEvent.readyState === ES.CLOSED) {
      this.disconnect();
    } else if (srcEvent.readyState === ES.CONNECTING) {
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

    this.trigger('close', this);

    return this;
  }

  // Define the public API
  var TC = TownCrier;
  TC.configure = configure;
  TC.prototype = {
    connect    : connect,
    disconnect : disconnect,
    trigger    : trigger,
    bind       : bind,
    unbind     : unbind,
    on         : bind,
    off        : unbind
  };

  window.TownCrier = TC;
})(window.EventSource);