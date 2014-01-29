exports = module.exports = subscriptionProto;

function subscriptionProto(provider) {
  var proto      = {},
      opts       = provider.providerCfg,
      exchange   = this.info.exchange,
      routingKey = this.info.routingKey,
      appName    = this.info.appName,
      clientId   = this.info.clientId;

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