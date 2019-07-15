var express = require('express');
var router = express.Router();
var apService = require('../services/ap-services');
var handleLockService = require('../services/handleLock-service');
var validationService = require('../services/validation-service')

router.get('/on', [
    validationService.registerValidation,
    (req, res, next) => {
        handleLockService.handleWithLock('aplock', apService.enable, res);
    }]);

router.get('/off', [
    validationService.registerValidation,
    (req, res, next) => {
        handleLockService.handleWithLock('aplock', apService.disable, res);
    }]);

module.exports = router;
