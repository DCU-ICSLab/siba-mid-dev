var express = require('express');
var router = express.Router();
var network = require('network')
var nrf24Service = require('../services/nrf24-services');
var upnpService = require('../services/upnp-services');
var ledService = require('../services/led-services');
var redisClient = require('../config/redis');
var models = require('../models');
var mqttService = require('../services/mqtt-service');
var apService = require('../services/ap-services');

//허브 기본 정보 조회 (NAT ip, mac address, etc...)
router.get('/', (req, res, next) => {

    //허브가 등록여부 조회
    redisClient.get("isreg", (err, reply) => {
        //등록이 되었거나 에러가 발생한다면
        if (err) {
            if (err) {
                loggerFactory.error('redis client get error');
            }
            else if (reply === 'Y')
                loggerFactory.error('hub already regist');
            res.json({
                status: false,
                external_ip: '',
                mac_addr: ''
            })
        }

        //허브가 등록이 안되어 있다면
        else {
            network.get_public_ip((err, ip) => {

                //public ip를 받아올 수 없으면 에러 throw
                if (err) {
                    loggerFactory.error('cannot search public ip address');
                    throw err;
                }

                models.hub.findAll().then(hubInfo => {

                    const upnp_options = upnpService.getUpnpOptions();

                    //허브 기본 정보 react측으로 응답
                    res.json({
                        status: true,
                        external_ip: ip,
                        mac_addr: hubInfo[0].mac,
                        external_port: upnp_options.out,
                        before_ip: null,
                    })
                });
            })
        }
    });
})

//허브 등록
router.post('/', (req, res, next) => {

    //허브 등록 여부 조회
    redisClient.get("isreg", (err, reply) => {

        //등록이 되었거나 에러가 발생한다면
        if (err || reply === 'Y') {
            if (err) {
                loggerFactory.error('redis client get error');
            }
            else if(reply === 'Y')
                loggerFactory.error('hub already regist');
            res.json({
                status: false
            })
        }
        //등록이 안되었다면
        else {

            network.get_public_ip((err, external_ip) => {

                //public ip를 받아올 수 없으면 에러 throw
                if (err) {
                    loggerFactory.error('cannot search public ip address');
                    throw err;
                }

                //mac address 조회
                require('getmac').getMac({ iface: 'eth0' }, (err, macAddress) => {
                    const upnp_options = upnpService.getUpnpOptions();

                    //mac 주소를 받아올 수 없다면
                    if (err) {
                        loggerFactory.error('cannot search mac address');
                        throw err;
                    }

                    //등록여부는 Yes로
                    redisClient.set('isreg', 'Y');

                    //hub table정보 업데이트
                    models.hub.update({
                        is_reg: 1,
                        reg_date: new Date().getTime(),
                        upnp_port: upnp_options.out,
                        cur_ip: external_ip,
                    }, {
                            where: {
                                mac: macAddress
                            }
                        });

                    //등록 성공 후 필요한 작업들 수행
                    mqttService.init();
                    apService.disable().then(() => {
                        apService.enable(); //ap 기동
                    })

                    ledService.enable();
                    res.json({
                        status: true
                    })
                });
            });
        }
    });

});

router.get('/rf', function (req, res, next) {
    //명령이 수행 중에는 lock을 걸어야
    nrf24Service.broadcast();
    res.json({ status: 'ok' });
});

module.exports = router;
