var express = require('express');
var router = express.Router();
var network = require('network')
var redisClient = require('../config/redis');
var models = require('../models');
var validationService = require('../services/validation-service')
var handleLockService = require('../services/handleLock-service')
var mqttService = require('../services/mqtt-service')

//허브 하위에 연결된 장비 목록 조회
router.get('/', [validationService.registerValidation,(req, res, next) => {
    try {
        models.dev.findAll({ attributes: ['dev_mac', 'dev_type'] }).then(devInfo => {
            res.json({
                status: true,
                devInfo: devInfo
            })
        });
    }
    catch (e) {
        res.json({
            status: false,
        })
    }
}]);

//허브 하위 디바이스로 명령
router.post('/:channel', [validationService.registerValidation, (req, res, next) => {
    //handleLockService.handleWithLock(req.params.devmac, apService.enable, res);

    let dev_channel = req.params.channel;
    const json_data = req.body;

    loggerFactory.info(`request to ${dev_channel}`);
    mqttService.publish(dev_channel, json_data, false, res);
}]);

module.exports = router;