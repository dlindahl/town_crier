var errors = require('./errors'),
    Client = require('./client'),
    AMQP   = require('./eventsource/amqp');

function Streamer(options) {
  console.log('[TownCrier] Middleware initialized');

  var EventSource  = new AMQP(options.amqp, options.connection),
      esConnection = EventSource.connect();

  return function Middleware(req, res, next) {
    var client = new Client(EventSource, options, req, res);

    if(!client.valid) return;

    esConnection
      .then(client.openStream.bind(client))
      .then(EventSource.bindSubscriber.bind(EventSource, client));
  };
}

module.exports = Streamer;