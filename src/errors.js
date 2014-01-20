// Base TownCrier Error.
function TownCrierError(msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
}
TownCrierError.prototype = Error.prototype;
TownCrierError.prototype.name = 'TownCrierError';
exports.TownCrierError = TownCrierError;

var errors = [
  ['InvalidConfiguration', 'Invalid configuration']
];

errors.forEach(function(err) {
  var errorName  = err[0],
      defaultMsg = err[1];
      errorFn    = exports[errorName] = function(msg) {
        TownCrierError.call(this, msg || defaultMsg);
      };
  errorFn.prototype = TownCrierError.prototype;
  errorFn.prototype.name = 'TownCrierError::'+errorName;
});
