var debug = require('debug')('notification:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');
var Joi = require('joi');

var VALID_MODELS = ['room', 'thing'];

function UserModelStoreServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(UserModelStoreServiceFacet, EventEmitter);

UserModelStoreServiceFacet.prototype.initialise = function() {
  return this.service.facets('modelStoreService').then(function(modelStoreService) {
    this._modelStoreService = modelStoreService;
  }.bind(this));
};

UserModelStoreServiceFacet.prototype.getUserspaceRPCMethods = function(rpcBroker) {
  rpcBroker.register('modelstore.calculate_sync_items', this._calculateSyncItems.bind(this));
  rpcBroker.register('modelstore.do_sync_items', this._doSyncItems.bind(this));
};

UserModelStoreServiceFacet.prototype._handleModelStoreRPC = function(remoteMethod, rpc, params) {
  debug(remoteMethod, 'for user', rpc.userId, 'device', deviceId);

  var callParams = [
    'modelstore.' + remoteMethod,
    {
      id: rpc.userId, // authenticated user ID (via mqtt-proxy)
    }
  ];

  callParams.push.apply(callParams, params);

  var internalResponse = this._modelStoreService.apply(
    this._modelStoreService,
    callParams
  );

  return internalResponse.then(function(response) {
    return {
      success: response.success, // only share success with userspace, not ARN etc
    };
  });
};

UserModelStoreServiceFacet.prototype._calculateSyncItems = function(rpc, modelName, nodeManifest) {
  Joi.assert(modelName, Joi.string().valid(VALID_MODELS));
  Joi.assert(nodeManifest, Joi.object());

  Object.keys(nodeManifest).forEach(function(objectId) {
    Joi.assert(objectId, Joi.string().token());
    Joi.assert(nodeManifest[objectId], Joi.number());
  });

  var user = {
    id: rpc.userId, // authenticated user ID (via mqtt-proxy)
  };

  return this._modelStoreService.call('modelstore.calculateSyncItems', user, modelName, nodeManifest).then(function(result) {
    return {
      model: result.model,
      cloud_requires: result.cloud_requires,
      node_requires: result.node_requires
    };
  });
};

UserModelStoreServiceFacet.prototype._doSyncItems = function(rpc, modelName, pushedItems, requestedObjectIds) {
  Joi.assert(modelName, Joi.string().valid(VALID_MODELS));
  Joi.assert(requestedObjectIds, Joi.array().includes(Joi.string().token()));
  Joi.assert(pushedItems, Joi.object());

  Object.keys(pushedItems).forEach(function(objectId) {
    Joi.assert(objectId, Joi.string().token());
    Joi.assert(pushedItems[objectId], Joi.object().keys({
      last_modified: Joi.number(),
      data: Joi.object().keys({
        id: Joi.string().token()
      })
    }));
  });

  var user = {
    id: rpc.userId, // authenticated user ID (via mqtt-proxy)
  };
  
  return this._modelStoreService.call('modelstore.doSyncItems', user, modelName, pushedItems, requestedObjectIds).then(function(result) {
    return {
      model: result.model,
      requestedObjects: result.requestedObjects,
      pushedObjects: result.pushedObjects
    };
  });
};

module.exports = UserModelStoreServiceFacet;