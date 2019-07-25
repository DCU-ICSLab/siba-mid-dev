var express = require('express');
var router = express.Router();
var network = require('network')
var redisClient = require('../config/redis');
var models = require('../models');

//허브 기본 정보 조회 (NAT ip, mac address, etc...)
router.get('/', (req, res, next) => {

    models.clog.findAll({
        attributes: ['clog_time', 'dev_mac','clog_res'],
        order: [
            ['clog_time', 'DESC']
        ]
    }).then(logInfo => {
        models.dev.findAll({
            attributes: ['dev_mac', 'dev_type','dev_status'],
        }).then(devInfo => {

            res.json({
                status: true,
                logInfo: logInfo,
                devInfo: devInfo,
            })
        })
    })
})

router.get('/:channel/reservation', (req, res, next) => {
    const dev_channel = req.params.channel;

    models.reserve.findAll({
        attributes: ['res_id', 'ev_code','act_at'],
        
    },{
        where: {
            mac: dev_channel
        }
    }).then(set => {
        res.json({
            status: true,
            reserveList: set,
        })
    })
})

module.exports = router;
