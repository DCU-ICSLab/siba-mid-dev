var express = require('express');
var router = express.Router();
var network = require('network')
var redisClient = require('../config/redis');
var models = require('../models');
var rerservationService = require('../services/reservation-service')

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
            reservationList: set,
        })
    })
})

router.post('/reservation/:res_id', (req, res, next) => {
    //const dev_channel = req.params.channel;
    const res_id = req.params.res_id;

    //예약 취소 수행
    models.reserve.findAll({
        attributes: ['res_id'],
    },{
        where: {
            res_id: res_id
        }
    }).then(set => {
        if(set.length!==0){
            rerservationService.reserveCancel(res_id)
            res.json({
                status: 200,
                msg: '예약 명령 삭제가 성공적으로 수행되었습니다.'
            })
        }
        else{
            res.json({
                status: 200,
                msg: '삭제하고자 하는 예약 명령이 존재하지 않습니다.'
            })
        }
    })
})

router.post('/live', (req, res, next) => {
    res.json({
        status: 200,
        msg: 'hub is OK'
    })
})

module.exports = router;
