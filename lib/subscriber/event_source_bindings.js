function onDestroy(es) {
  this.removeListener('destroy', this._onDestroy);
  this.removeListener('invalid', onInvalid);

  this.stream.removeListener('connectionEnd',   this._onConnectionClose);
  this.stream.removeListener('connectionClose', this._onConnectionClose);

  es.removeListener('error', this._onConnectionError);
}

function onInvalid(subscriber) {
  this.logger.error('Event Source rejected. Invalid parameters', subscriber.req.params, subscriber.req.query);
  this.res.set('Connection', 'close');
  this.res.send(403, 'Forbidden');
  this.res.end();

  this.destroy();
}

function onConnectionError(es, err) {
  this.logger.error('Event Source failed to connect.', err);
  this.res.set('Connection', 'close');
  this.res.send(500, 'Server Error');
  this.res.end();

  this.destroy();
}

function onConnectionClose() {
  this.destroy();
}

function Binder(es) {
  this._onDestroy = onDestroy.bind(this, es);
  this._onConnectionError = onConnectionError.bind(this, es);
  this._onConnectionClose = onConnectionClose.bind(this, es);

  // Make sure that any event bindings are removed in the onDestroy function
  this.on('destroy', this._onDestroy);
  this.on('invalid', onInvalid);

  // Client TCP Connection
  this.stream.on('connectionEnd',   this._onConnectionClose);
  this.stream.on('connectionClose', this._onConnectionClose);

  // Town Crier EventSource Connection
  es.on('error', this._onConnectionError);
}

module.exports = Binder;