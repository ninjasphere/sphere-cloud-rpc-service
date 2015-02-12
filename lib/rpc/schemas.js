var Joi = require('joi');

exports.ObjectId = Joi.string().regex(/^[a-zA-Z0-9\-_]+$/);
exports.UserRecord = Joi.object().keys({id: exports.ObjectId}).unknown(true);
exports.MQTTTopic = Joi.string();
exports.MQTTPayload = Joi.string();
