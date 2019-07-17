var express = require('express');
var router = express.Router();
var network = require('network')
var redisClient = require('../config/redis');
var models = require('../models');

//허브 기본 정보 조회 (NAT ip, mac address, etc...)
router.get('/', (req, res, next) => {

    res.json({
        status: true,
    })
})

module.exports = router;
