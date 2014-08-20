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
  rpcBroker.register('location.get_simple_calibration_score', this._getSimpleCalibrationScore.bind(this));
};

UserLocationRPCServiceFacet.prototype._getSimpleCalibrationScore = function(rpc) {
  var user = rpc.userId; // authenticated user ID (via mqtt-proxy)

  return this._locationService.call('Location.calibrationScore', user); // pass raw internal result back to user
};

module.exports = UserLocationRPCServiceFacet;
