var Router   = require('express').Router,
    streamer = require('./streamer.js');

module.exports = function townCrier(options) {
  options = options || {};
  options.mount = options.mount || '/stream';

  var router = new Router();
  router.route('get', options.mount+'/:exchange/:routing_key');

  return function(req, res, next) {
    var routeMatch = router.matchRequest(req, 0);

    if(routeMatch) {
      req.params = routeMatch.params;
      streamer(req, res, next);
    } else {
      next();
    }
  };
};