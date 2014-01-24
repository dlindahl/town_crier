var when = require('when');

var noop = exports = module.exports = {};

noop.name = 'No-op';

noop.connect = function connect() {
  var deferred = when.defer();

  deferred.reject(this);

  return deferred.promise;
};

noop.subscribe = function subscribe() {
  console.log('Noop#subscribe', arguments);
};