(function() {
  var TownCrier = function(options) {
    this.options = options || {};
  };

  function cbRunner(tc, name) {
    return function() {
      if(tc.options[name]) {
        tc.options[name].apply(tc, arguments);
      }
    };
  }
  function errorHandler(tc) {
    return function(e) {
      if (e.readyState === EventSource.CLOSED) {
        this.source.close();
        cbRunner(tc,'onClose').apply(tc, arguments);
      } else if (e.readyState === EventSource.CONNECTING) {
        cbRunner(tc,'onReconnect').apply(tc, arguments);
      } else {
        var cb = cbRunner(tc,'onError');
        if(cb) { cb.apply(tc, arguments); }
      }
    };
  }

  TownCrier.prototype.connect = function() {
    var url = '/firehose/'+this.options.appName+'/'+this.options.exchange+'/'+this.options.key + window.location.search;

    this.source = new EventSource(url);
    this.source.addEventListener('open', cbRunner(this,'onOpen'), false);
    this.source.addEventListener('message', cbRunner(this,'onMessage'), false);
    this.source.addEventListener('error', errorHandler(this), false);

    return this;
  };

  window.TownCrier = TownCrier;

  function onOpen(prefix) {
    return function() {
      document.getElementById(prefix+'Status').textContent = 'Connected';
      document.getElementById(prefix+'Connection').textContent = 'Disconnect';
    };
  }
  function onMessage(prefix) {
    return function(e) {
      console.log(prefix, e.data);
      var stream = document.getElementById(prefix+'Stream');
      stream.value += e.data + "\n";
      stream.scrollTop = stream.scrollHeight;
    };
  }
  function onReconnect(prefix) {
    return function() {
      document.getElementById(prefix+'Connection').textContent = 'Connect';
      document.getElementById(prefix+'Status').textContent = 'Reconnecting';
    };
  }
  function onClose(prefix) {
    return function() {
      document.getElementById(prefix+'Connection').textContent = 'Connect';
      document.getElementById(prefix+'Status').textContent = 'Connection closed';
    };
  }
  function onError(prefix) {
    return function() {
      document.getElementById(prefix+'Connection').textContent = 'Connect';
      document.getElementById(prefix+'Status').textContent = 'Connection Error!';
    };
  }

  var sap = new TownCrier({
    appName:'sap',
    exchange:'notes',
    key:'note.%23.orders.%23',
    onOpen : onOpen('sap'),
    onMessage : onMessage('sap'),
    onReconnect : onReconnect('sap'),
    onClose : onClose('sap'),
    onError : onError('sap')
  }).connect();

  var qct = new TownCrier({
    appName:'qct',
    exchange:'order_status',
    key:'%23',
    onOpen : onOpen('qct'),
    onMessage : onMessage('qct'),
    onReconnect : onReconnect('qct'),
    onClose : onClose('qct'),
    onError : onError('qct')
  }).connect();

  var onClick = function(tc) {
    return function() {
      var label = this.textContent;
      if(label == 'Connect') {
        tc.connect();
      } else if(label == 'Disconnect') {
        if(tc.source) {
          tc.source.close();
          tc.options.onClose.call(tc);
        }
      }
    };
  };

  document.getElementById('sapConnection').addEventListener('click', onClick(sap));
  document.getElementById('qctConnection').addEventListener('click', onClick(qct));
})();