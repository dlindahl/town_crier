var util = require('util');

// Base TownCrier Error.
function TownCrierError(msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
}
TownCrierError.prototype.name = 'TownCrierError';
util.inherits(TownCrierError, Error);
exports.TownCrierError = TownCrierError;

var errors = [
  ['InvalidConfiguration', 'Invalid configuration']
];

errors.forEach(function(err) {
  var errorName  = err[0],
      defaultMsg = err[1];
      errorFn    = exports[errorName] = function(msg) {
        errorFn.super_.call(this, msg || defaultMsg);
      };
  util.inherits(errorFn, TownCrierError);
  errorFn.prototype.name = errorName;
});
