// Base TownCrier Error.
function TownCrierError(msg) {
  this.name = this.name || 'TownCrierError';
  this.message = msg || this.name;
}
TownCrierError.prototype = new Error();
TownCrierError.prototype.constructor = TownCrierError;
exports.TownCrierError = TownCrierError;

var errors = [
  ['InvalidConfiguration', 'Invalid configuration']
];

errors.forEach(function(err) {
  var errorName  = err[0],
      defaultMsg = err[1];
      errorFn    = exports[errorName] = function(msg) {
        this.name = 'TownCrierError::'+errorName;
        TownCrierError.call(this, msg || defaultMsg);
      };
  errorFn.prototype = TownCrierError.prototype;
});
