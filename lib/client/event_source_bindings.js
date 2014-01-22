function onDestroy(es) {
  this.removeListener('unsubscribe', this.destroy);
  this.removeListener('destroy', this._onDestroy);
  this.removeListener('invalid', onInvalid);

  this.stream.removeListener('connectionEnd',   this._onConnectionClose);
  this.stream.removeListener('connectionClose', this._onConnectionClose);

  es.removeListener('error',     this._onConnectionError);
  es.removeListener('queueBind', this._onQueueBind);
}

function onInvalid(client) {
  this.stream.close(403, 'Forbidden');

  this.destroy();
}

function onConnectionError(es, err) {
  this.stream.close(500, 'Server Error');

  this.logger.error('Event Source failed to connect.', err);

  this.destroy();
}

function onConnectionClose(fanout, queue, ctag) {
  this.unsubscribe(fanout, queue, ctag);
}

function onQueueBind(es, fanout, queue, ctag) {
  this.req.connection.once('close', onConnectionClose.bind(this, fanout, queue, ctag));

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
    this.logger.error('JSON Parsing Error:', err);
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

  this.logger.info('Received message', payload.id, 'from', key);
  this.emit('message', this, headers, payload, key);
}

function Binder(es) {
  this._onDestroy = onDestroy.bind(this, es);
  this._onConnectionError = onConnectionError.bind(this, es);
  this._onConnectionClose = onConnectionClose.bind(this, es);
  this._onQueueBind = onQueueBind.bind(this);
  this._onMessage = onMessage.bind(this);

  // Make sure that any event bindings are removed in the onDestroy function
  this.on('unsubscribe', this.destroy);
  this.on('destroy',     this._onDestroy);
  this.on('invalid',     onInvalid);

  // Client TCP Connection
  this.stream.on('connectionEnd',   this._onConnectionClose);
  this.stream.on('connectionClose', this._onConnectionClose);

  // Town Crier EventSource Connection
  es.on('error',     this._onConnectionError);
  es.on('queueBind', this._onQueueBind);
}

module.exports = Binder;