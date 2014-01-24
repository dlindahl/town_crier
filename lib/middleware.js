var errors = require('./errors'),
    client = require('./client'),
    ES     = require('./event_source');

function Streamer(options) {
  console.log('[TownCrier] Middleware initialized');

  var provider     = options.provider,
      esProvider   = ES(provider)(options);
      openProvider = esProvider.connect();

  return function Middleware(req, res, next) {
    var c = client(req, res, next);

    openProvider
      .then(c.subscribeAll.bind(c))
      .tap(c.openStream)
      .catch(c.disconnect)
      .catch(function(err) {
        console.error(err);
        // node-amqp does not currently have reliable reconnect logic, so just
        // kill the process, dumping all socket connections in the process, and
        // allow monit, etc. to restart the application.
        process.exit(1);
      });
  };
}

module.exports = Streamer;