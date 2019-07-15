var internetAvailable = require('internet-available');
//var ip = require('ip');
var ledService = require('./led-services');
var upnpService = require('./upnp-services');
var apService = require('./ap-services');
var nrf24Service = require('./nrf24-services');
var mqttService = require('./mqtt-service');
var requestService = require('./request-service');
var models = require('../models');
var redisClient = require('../config/redis');
var natUpnp = require('nat-upnp');
var getMac = require('getmac');
var client = natUpnp.createClient();

var KeepAiveService = require('./keep-alive-service')
var ReadYamlFileService = require('./read-yaml-file-service')
var RpiMonitoringService = require('./rpi-monitoring-service')

const mac_interface = {
    iface: 'eth0'
}

const systemInfoToRedis = (systemInfo) => {
    if(!systemInfo.mac){ 
        loggerFactory.error('MAC addr is empty');
        throw new Error('MAC addr is empty');
    }

    //자주 사용되는 데이터들을 캐싱
    redisClient.set('isreg', systemInfo.isReg ? 'Y' : 'N');
    redisClient.set('mac', systemInfo.mac);
    redisClient.set('aplock', 'unlock');

    console.log(`hub registration is: ${systemInfo.isReg}`);
    console.log(`hub MAC addr is: ${systemInfo.mac}`);
}

const compareIpAndUpdate = (cmpInfo) => {
    //이전 IP랑 현재 IP랑 같은지 비교
    if (cmpInfo.hubInfo[0].cur_ip !== cmpInfo.external_ip) {
        let sendData = {
            ip_update: isUpdate,
            hub_info: { //다르다면 스킬 서버에 변경된 정보 전송할 수 있게
                mac_addr: cmpInfo.hubInfo[0].mac,
                external_ip: cmpInfo.external_ip,
                before_ip: cmpInfo.hubInfo[0].cur_ip,
                external_port: cmpInfo.hubInfo[0].upnp_port
            }
        };

        //skill server에 갱신된 정보 전송
        requestService.req('', sendData, 'UPDATE', () => {
            //skill server에 갱신된 정보 전송 후 local DB에 변경사항 삽입
            models.hub.update({
                cur_ip: cmpInfo.external_ip,
                prev_ip: cmpInfo.hubInfo[0].cur_ip,
                //upnp_port: hubInfo[0].upnp_port
            }, {
                    where: {
                        mac: cmpInfo.hubInfo[0].mac
                    }
                }
            );
        });
    }
}

const hubSetup = () => {

    const connectionObj = setInterval(() => {
        internetAvailable({
            domainName: 'www.google.com',
            timeout: 4000,
            host: '8.8.8.8'
        }).then(() => {
            //internet 연결이 되어 있다면 초기화 시작
            //전체 수행 단계에서 예외 발생 시 role back해야
            clearInterval(connectionObj); //Interval 중지
            loggerFactory.info('internet available');

            //upnp 수행
            upnpService.init();

            //NAT에 허브가 여러대 연결 된 경우?
            //허브가 원선에 바로 물려있다면 예외 발생시켜야

            //nrf24 초기화
            nrf24Service.init();

            models.hub.findAll().then(hubInfo => {
                let isReg = false;
                let mac = null;

                //let isHubFirstStartup = hubInfo.length !== 1;
                //let isHubRegist = isHubFirstStartup ? false : hubInfo[0].is_reg === 1;

                //허브 기동 시 시스템 기본 정보 초기화
                if (hubInfo.length !==1 || !(hubInfo[0].is_reg === 1)) {
                    getMac.getMac(mac_interface, (err, macAddress) => {
                        if (err) {
                            ledService.error();
                            loggerFactory.error('cannot search mac address');
                            throw err;
                        }

                        if(hubInfo.length !== 1)
                            models.hub.create({ mac: macAddress, is_reg: 0 });

                        //시스템 정보 redis로
                        systemInfoToRedis({isReg: false, mac: macAddress});

                        ledService.process();
                    });
                }

                //허브가 등록이 된 경우
                else if (!(hubInfo.length !== 1) && hubInfo[0].is_reg === 1) {

                    client.externalIp((err,external_ip) => {

                        if (err) {
                            ledService.error();
                            loggerFactory.error('cannot search public ip address');
                            throw err;
                        }

                        compareIpAndUpdate({hubInfo: hubInfo, external_ip: external_ip});

                        apService.disable().then(() => {
                            apService.enable(); //ap 기동
                        })

                        mqttService.init();

                        //시스템 정보 redis로
                        systemInfoToRedis({isReg: true, mac: hubInfo[0].mac});
                        loggerFactory.info('hub setup success');
                    });
                }

            });
        }).catch(() => {
            //internet연결이 되어 있지 않다면, error led 점등
            ledService.error();
            console.log('No internet connected');
        })
    }, 5000);
}

module.exports = {
    start: () => {
        //hubSetup();
    }
}
