var models = require('../models');
var redisClient = require('../config/redis');
const { promisify } = require('util');
const getAsync = promisify(redisClient.get).bind(redisClient);
var mqtt = require('mqtt');
var handleLockService = require('./handleLock-service');
var keepAliveService = require('./keep-alive-service');
var ReservationService = require('./reservation-service');
var requestService = require('./request-service');
var modelService = require('./model-service');
var client = mqtt.connect({
    host: 'localhost',
    port: 1883
});
var HttpStatus = require('http-status-codes');

//관리되는 topic들
const DEV_REGISTER = 'dev/register';
const DEV_CONTROL = 'dev/control';
const DEV_CONTROL_END = 'dev/control/end';
const DEV_SET_STATE = 'dev/state/update'
const DEV_INIT_STATE = 'dev/state/create'
const DEV_SENSING_RECV = 'dev/sensing'

const SYSTEM_BROKER_CLIENT_INACTIVE = 'dev/will'

const mqttTopcicSubscription = () => {

    //디바이스 등록 토픽
    client.subscribe(DEV_REGISTER, (err) => {
        if (err) console.log(err);
    })

    //디바이스 제어 종료 토픽
    client.subscribe(DEV_CONTROL_END, (err) => {
        if (err) console.log(err);
    })

    //디바이스 상태값 설정 토픽
    client.subscribe(DEV_SET_STATE, (err) => {
        if (err) console.log(err);
    })

    //디바이스 상태 값 초기화 토픽
    client.subscribe(DEV_INIT_STATE, (err) => {
        if (err) console.log(err);
    })

    client.subscribe(SYSTEM_BROKER_CLIENT_INACTIVE, (err) => {
        if (err) console.log(err);
    })

    client.subscribe(DEV_SENSING_RECV, (err) => {
        if (err) console.log(err);
    })
}

const mqttReceiveDefine = () => {
    client.on('message', async (topic, message) => {
        if (topic === SYSTEM_BROKER_CLIENT_INACTIVE) {
            let dt = Date.now();
            console.log(topic)
            const msg = message.toString().split(',')
            deviceDisconnect(msg[0], msg[1], dt)
            return;
        }

        const subData = JSON.parse(message.toString());
        //console.log(topic)
        //console.log(subData)

        switch (topic) {
            //하위 장비가 연결되고 등록 정보를 전송했을 때,
            case DEV_REGISTER:
                if(await getAsync('isreg')==='Y')
                    devRegisterOrUpdate(subData);
                break;
            case DEV_CONTROL_END:
                sendResultToSkill(subData);
                break;
            case DEV_SET_STATE:
                modelService.updateDataModel(subData)
                break;
            case DEV_INIT_STATE:
                modelService.insertDataModel(subData)
                break;
            case DEV_SENSING_RECV:
                modelService.insertSensingData(subData)
                break;
            case SYSTEM_BROKER_CLIENT_INACTIVE:
                break;
            default:
                break;
        }
    })
}

//모듈에게 전송했던 명령이 끝나고 난 후의 처리.
const sendResultToSkill = async (subData) => {
    //스킬 서버에게 명령 결과를 전송해줘야 함.

    //명령 수행이 완료되었으므로 lock 해제
    //handleLockService.deviceUnlock(subData.dev_mac); 

    const reply = await getAsync(subData.dev_mac);
    const tempObject = JSON.parse(reply)

    console.log(tempObject)

    loggerFactory.info(`device receive: ${subData.dev_mac}`);
    keepAliveService.deviceControlFinishResultResponse({
        devMac: subData.dev_mac,
        status: subData.status,
        testId: tempObject.testId,
        userId: tempObject.userId,
        devId: tempObject.devId,
        msg: subData.status === 200 ? '디바이스 명령이 정상적으로 수행되었습니다.' : '명령 수행 오류가 발생했습니다.'
    })
}

//디바이스 연결 해제시 수행
const deviceDisconnect = (dev_mac, dev_type, dt) => {
    if (dev_mac && dev_mac.length === 17) {
        //서버에 연결 정보 전송
        keepAliveService.sendToSibaPlatform(dev_type, dev_mac, 0)

        models.clog.create({
            clog_time: dt,
            dev_mac: dev_mac,
            clog_res: 0
        })
    }
}

const devRegisterOrUpdate = subData => {

    //디바이스 등록 여부 조회
    models.dev.findAll({
        attributes: ['dev_mac', 'dev_type'],
        where: {
            dev_mac: subData.dev_mac
        }
    }).then(devInfo => {

        modelService.deleteDataModelTable(subData.dev_mac).then((res) => {

            // 이전에 장비가 등록되었었다면,
            if (devInfo.length === 1) {
                //기존에 연결된 장비의 인증키가 변경되었다면 업데이트
                if (devInfo[0].dev_type !== subData.dev_type) {

                    models.dev.update({
                        dev_type: subData.dev_type,
                        dev_status: true
                    },
                        {
                            where: {
                                dev_mac: devInfo[0].dev_mac
                            }
                        })
                    loggerFactory.info('update device state latest');
                }
                else {
                    loggerFactory.info('device state is up to date');
                }
            }

            //등록된 장비가 아니라면
            else {
                models.dev.create({
                    dev_mac: subData.dev_mac,
                    dev_type: subData.dev_type,
                    dev_status: true
                });
                loggerFactory.info('regist new device');
            }

            let dt = new Date()
            dt.setSeconds(dt.getSeconds() + 1)

            //연결 정보 저장
            models.clog.create({
                clog_time: dt.getMilliseconds(),
                dev_mac: subData.dev_mac,
                clog_res: 1
            })

            //상태 모델 DB 생성
            requestService.request(subData.dev_type).then((item) => {

                modelService.createDataModelTable(item.data.model, subData.dev_mac, item.data.events).then((res) => {

                    //서버에 연결 정보 전송
                    keepAliveService.sendToSibaPlatform(subData.dev_type, subData.dev_mac, 1)

                    //등록이 완료됬음을 디바이스에게 전송
                    //cmd_code -1은 모듈이 허브에 등록되었음을 알려주는 코드
                    registerFinish(subData.dev_mac, [{ e: -1 }]);
                })
            });
        })
    });
}

const registerFinish = async (dev_channel, data) => {
    loggerFactory.info(`device register info return: ${dev_channel}`);
    client.publish(DEV_CONTROL + `/${dev_channel}`, `${1}/${1}/${JSON.stringify({
        c: data
    })}`, {
            qos: 1
        });
}

const publishToEvent = (dev_channel, json) => {
    const sendCommand = JSON.stringify(json)

    const last = sendCommand.length - 1
    const lastCount = Math.ceil((sendCommand.length - 1) / 90)
    let i = 0;
    let cnt = 1;
    while (true) {
        const fin = i + 89
        const index = fin > last ? last : fin
        client.publish(DEV_CONTROL + `/${dev_channel}`, `${cnt}/${lastCount}/${sendCommand.slice(i, index + 1)}`, {
            qos: 1
        });
        if (index === last) {
            break;
        }
        i += 90;
        cnt++;
    }
}

module.exports = {

    registerFinish: registerFinish,

    //제어 모듈 control 시에 사용
    publish: async (dev_channel, data, res = null) => {
        //redis로 부터 명령을 전송하고자 하는 장비의 mac address 가져옴

        let result;

        /*let result = {
            status: false,
            msg: '디바이스가 다른 명령 수행 중 입니다.'
        }
    
        let reply = await getAsync(dev_channel);
    
        if(!reply){ //redis에 등록된 장비의 MAC 주소가 없는경우
            result = {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '등록된 디바이스가 아닙니다.'
            }
        } 
        else if (reply === 'unlock'){
            if(!init) //초기화 작업이 아닌 경우는 lock 설정
                handleLockService.deviceLock(dev_channel);
            loggerFactory.info(`device publish: ${dev_channel}`);
            const buf = JSON.stringify(data);
            client.publish(DEV_CONTROL + `/${dev_channel}`, buf);
            
            
        }*/

        //명령 리스트 필터링
        let cmdList = []

        for (let i = 0; i < data.length; i++) {
            const item = data[i];

            //제어 커맨드인 경우
            if (item.btnType === '1') {
                cmdList.push({
                    e: item.eventCode,
                    t: 1,
                    d: item.additional.map((data) => {
                        if (data.type === '1') {
                            return {
                                type: parseInt(data.type, 10),
                                value: new Date(data.value)
                            }
                        }
                        else {
                            return {
                                type: parseInt(data.type, 10),
                                value: data.value.toString()
                            }
                        }
                    }),
                })
            }

            //예약 커맨드인 경우
            else if (item.btnType === '5') {
                //예약 수행
                ReservationService.reserve(dev_channel, item, publishToEvent)
            }

            //예약 취소 커맨드인 경우
            else if (item.btnType === '6') {
                ReservationService.reserveCancel(item.additional[0].value, dev_channel)
            }
        }

        console.log(cmdList)

        //디바이스에게 전송해야 하는 명령이 존재한다면 전송
        if (cmdList.length !== 0) {
            loggerFactory.info(`device publish: ${dev_channel}`);

            const sendCommand = JSON.stringify({
                c: cmdList
            })

            const last = sendCommand.length - 1
            const lastCount = Math.ceil((sendCommand.length - 1) / 90)
            let i = 0;
            let cnt = 1;
            while (true) {
                const fin = i + 89
                const index = fin > last ? last : fin
                client.publish(DEV_CONTROL + `/${dev_channel}`, `${cnt}/${lastCount}/${sendCommand.slice(i, index + 1)}`, {
                    qos: 1
                });
                if (index === last) {
                    break;
                }
                i += 90;
                cnt++;
            }
        }

        result = {
            status: HttpStatus.OK,
            msg: '명령이 정상적으로 허브에게 전송되었습니다.'
        }

        res.json(result);
    },

    //MQTT 초기화
    init: () => {

        //topic subscribe 설정
        mqttTopcicSubscription();

        //mqtt consumer 정의
        mqttReceiveDefine();
    },

}