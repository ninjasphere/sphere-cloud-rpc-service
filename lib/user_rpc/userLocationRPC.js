var debug = require('debug')('location:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');
var Joi = require('joi');

var ObjectId = Joi.string().regex(/^[a-zA-Z0-9\-_]+$/);

function UserLocationRPCServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(UserLocationRPCServiceFacet, EventEmitter);

UserLocationRPCServiceFacet.prototype.initialise = function() {
  return this.service.facets('locationService').spread(function(locationService) {
    this._locationService = locationService;
  }.bind(this));
};

UserLocationRPCServiceFacet.prototype.getUserspaceRPCMethods = function(rpcBroker) {
  rpcBroker.register('Location.flushuser', this._flushuser.bind(this));
  rpcBroker.register('Location.flushzone', this._flushzone.bind(this));
  rpcBroker.register('Location.locate', this._locate.bind(this));
  rpcBroker.register('Location.calibrationScore', this._calibrationScore.bind(this));
  rpcBroker.register('Location.score', this._score.bind(this));
  rpcBroker.register('Location.lastSeen', this._lastSeen.bind(this));
};

// Location.flushuser(user=str) -> Object
UserLocationRPCServiceFacet.prototype._flushuser = function(rpc) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.flushuser', user); // pass raw internal result back to user
};

// Location.flushzone(user=str, zone=str) -> Object
UserLocationRPCServiceFacet.prototype._flushzone = function(rpc, zone) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.flushzone', user, zone); // pass raw internal result back to user
};

// Location.locate(user=str, device=str, readings=Object) -> str
UserLocationRPCServiceFacet.prototype._locate = function(rpc, device, readings) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.locate', user, device, readings); // pass raw internal result back to user
};

// Location.calibrationScore(user=str) -> float
UserLocationRPCServiceFacet.prototype._calibrationScore = function(rpc) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.calibrationScore', user); // pass raw internal result back to user
};

// Location.score(user=str) -> str
UserLocationRPCServiceFacet.prototype._score = function(rpc) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.score', user); // pass raw internal result back to user
};

// Location.lastSeen(user=str, device=str) -> Object
UserLocationRPCServiceFacet.prototype._lastSeen = function(rpc, device) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.lastSeen', user, device); // pass raw internal result back to user
};

module.exports = UserLocationRPCServiceFacet;
