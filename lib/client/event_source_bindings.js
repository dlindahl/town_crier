function onDestroy(es) {
  this.removeListener('unsubscribe', this.destroy);
  this.removeListener('destroy', this._onDestroy);
  this.removeListener('invalid', onInvalid);

  if(this._queueUnsubscriber) {
    this.req.connection.removeListener('end',   this._queueUnsubscriber);
    this.req.connection.removeListener('close', this._queueUnsubscriber);
  }

  this.req.connection.removeListener('end',   this._onConnectionEnd);
  this.req.connection.removeListener('close', this._onConnectionClose);

  es.removeListener('error',     this._onEventSourceError);
  es.removeListener('queueBind', this._onQueueBind);
}

function onInvalid(client) {
  this.stream.close(403, 'Forbidden');

  this.destroy();
}

function onEventSourceError(es, err) {
  this.stream.close(500, 'Server Error');

  this.destroy();
}

function onConnectionEnd() {
  this.emit('connectionEnd', this);
}

function onConnectionClose() {
  this.emit('connectionClose', this);
}

function queueUnsubscriber(fanout, queue, ctag) {
  this.unsubscribe(fanout, queue, ctag);
}

function onQueueBind(es, fanout, queue, ctag) {
  this._queueUnsubscriber = queueUnsubscriber.bind(this, fanout, queue, ctag);

  this.req.connection.on('end',   this._queueUnsubscriber);
  this.req.connection.on('close', this._queueUnsubscriber);

  this.subscribe(fanout, queue, ctag);
}

// TODO: This assumes that the message is a JSON string but does not have the
// Content-Type header set correctly. This is obviously a bad assumption.
function parsePayload(message, headers, deliveryInfo, rawMessage) {
  var payload = {},
      data    = message.data.toString();

  try {
    data = JSON.parse(data);
  } catch(err) {
    this.emit('parseError', this, err);
  }

  return {
    event : data.type || deliveryInfo.routingKey || rawMessage.routingKey,
    id    : +new Date(),
    data  : JSON.stringify(data)
  };
}

function onMessage(message, headers, deliveryInfo, rawMessage) {
  var payload = parsePayload.apply(this, arguments),
      key     = deliveryInfo.routingKey || rawMessage.routingKey;

  this.stream.write(payload);

  this.emit('message', this, headers, payload, key);
}

function Binder(es) {
  this._onDestroy          = onDestroy.bind(this, es);
  this._onEventSourceError = onEventSourceError.bind(this, es);
  this._onConnectionClose  = onConnectionClose.bind(this);
  this._onConnectionEnd    = onConnectionEnd.bind(this);
  this._onQueueBind        = onQueueBind.bind(this);
  this._onMessage          = onMessage.bind(this);

  // Make sure that any event bindings are removed in the onDestroy function
  this.on('unsubscribe', this.destroy);
  this.on('destroy',     this._onDestroy);
  this.on('invalid',     onInvalid);

  // Client TCP Connection
  this.req.connection.on('end',   this._onConnectionEnd);
  this.req.connection.on('close', this._onConnectionClose);

  // Town Crier EventSource Connection
  es.on('error',     this._onEventSourceError);
  es.on('queueBind', this._onQueueBind);
}

module.exports = Binder;