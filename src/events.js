function bind(event, callback) {
  var name,
      events = event.split(' '),
      cbs = this._callbacks || (this._callbacks = {});

  events.forEach(function(name) {
    cbs[name] || (cbs[name] = []);
    cbs[name].push(callback);
  });

  return this;
}

function unbind(ev, callback) {
  if(arguments.length === 0) {
    this._callbacks = {};
    return this;
  }

  if(!ev) return this;

  var list,
      evs = ev.split(' ');

  evs.forEach(function(name) {
    list = this._callbacks[name];

    if(!list) return this;

    if(!callback) {
      delete this._callbacks[name];
      return this;
    }

    list.forEach(function(cb, i) {
      if(!cb) return true;

      if(cb !== callback) return true;

      list = list.slice();
      list.splice(i, 1);
      this._callbacks = list;

      return false;
    }.bind(this));
  }.bind(this));

  return this;
}

function trigger() {
  var args = arguments.length === 0 ? [] : Array.prototype.slice.call(arguments, 0),
      ev = args.shift(),
      list = this._callbacks[ev];

  if(!list) return;

  list.forEach(function(callback) {
    if(callback.apply(this, args) === false) {
      return false;
    }
  });

  return true;
}

module.exports = {
  bind    : bind,
  unbind  : unbind,
  trigger : trigger
};