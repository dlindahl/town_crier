/* jshint node:true, strict:false */
exports = module.exports = subscriptionProto;

function subscriptionProto(provider) {
  var proto = {};
  var opts = provider.providerCfg;
  var exchange = this.info.exchange;
  var routingKey = this.info.routingKey;
  var appName = this.info.appName;
  var clientId = this.info.clientId;

  proto.__defineGetter__('fanoutName', function fanoutName() {
    if(opts.fanoutName) return opts.fanoutName;

    var env = process.env.NODE_ENV;

    return 'town_crier-'+env+'-'+exchange+'-'+routingKey;
  }.bind(this));

  proto.__defineGetter__('queueName', function queueName() {
    if(opts.queueName) return opts.queueName;

    var env = process.env.NODE_ENV;

    return 'town_crier-'+env+'-'+appName+'-'+clientId;
  }.bind(this));

  return proto;
}