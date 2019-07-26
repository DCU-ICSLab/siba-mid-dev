var models = require('../models');
var redisClient = require('../config/redis');
const {promisify} = require('util');
const getAsync = promisify(redisClient.get).bind(redisClient);
var mqtt = require('mqtt');
var handleLockService = require('./handleLock-service');
var keepAliveService = require('./keep-alive-service');
var ReservationService = require('./reservation-service');
var client = mqtt.connect({
    host: 'localhost',
    port: 1883
});
var HttpStatus = require('http-status-codes');

//관리되는 topic들
const DEV_REGISTER = 'dev/register';
const DEV_CONTROL = 'dev/control';
const DEV_CONTROL_END = 'dev/control/end';

const SYSTEM_BROKER_CLIENT_INACTIVE = 'dev/will'

const mqttTopcicSubscription = () => {

    //디바이스 등록 토픽
    client.subscribe(DEV_REGISTER, (err) => {
        if(err) console.log(err);
    })

    //디바이스 제어 종료 토픽
    client.subscribe(DEV_CONTROL_END, (err) => {
        if(err) console.log(err);
    })

    client.subscribe(SYSTEM_BROKER_CLIENT_INACTIVE, (err) => {
        if(err) console.log(err);
    })
}

const mqttReceiveDefine = () => {
    client.on('message', (topic, message) => {
        if(topic===SYSTEM_BROKER_CLIENT_INACTIVE){
            console.log(topic)
            const msg = message.toString().split(',')
            deivceDisconnect(msg[0], msg[1])
            return;
        }

        let subData = JSON.parse(message.toString());
        console.log(topic)
        console.log(subData)

        switch (topic) {
            //하위 장비가 연결되고 등록 정보를 전송했을 때,
            case DEV_REGISTER:
                devRegisterOrUpdate(subData);
                break;
            case DEV_CONTROL_END:
                sendResultToSkill(subData);
                break;
            case DEV_KEEP_ALIVE:
                break;
            case SYSTEM_BROKER_CLIENT_INACTIVE:
                break;
            default:
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
        msg: '디바이스 명령이 정상적으로 수행되었습니다.'
    })
}

//디바이스 연결 해제시 수행
const deivceDisconnect = (dev_mac, dev_type) => {
    if(dev_mac && dev_mac.length===17){
        models.clog.create({
            clog_time: Date.now(),
            dev_mac: dev_mac,
            clog_res: 0
        })

        //서버에 연결 정보 전송
        keepAliveService.sendToSibaPlatform(dev_type,dev_mac,0)
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
            else{
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

        //연결 정보 저장
        models.clog.create({
            clog_time: Date.now(),
            dev_mac: subData.dev_mac,
            clog_res: 1
        })

        //서버에 연결 정보 전송
        keepAliveService.sendToSibaPlatform(subData.dev_type,subData.dev_mac,1)
        
        //등록이 완료됬음을 디바이스에게 전송
        //cmd_code 0은 모듈이 허브에 등록되었음을 알려주는 코드
        registerFinish(subData.dev_mac, [{eventCode: -1}]); 
    });
}

const registerFinish = async (dev_channel, data) => {
    loggerFactory.info(`device register info return: ${dev_channel}`);
    client.publish(DEV_CONTROL + `/${dev_channel}`, JSON.stringify({
        cmdList: data
    }));
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

        //명령 리스트 필터링, undefined 처리 해야함.
        let cmdList = []

        for(let i=0; i < data.length; i++){
            console.log(item.additional)

            //제어 커맨드인 경우
            if(item.btnType==='1'){
                cmdList.push({
                    eventCode: item.eventCode,
                    dataset: item.additional,
                })   
            }

            //예약 커맨드인 경우
            else if(item.btnType==='5'){
                //예약 수행
                ReservationService.reserve(dev_channel,item)
            }

            //예약 취소 커맨드인 경우
            else if(item.btnType==='6'){
                ReservationService.reserve(dev_channel,item)
            }
        }

        console.log(cmdList)

        //디바이스에게 전송해야 하는 명령이 존재한다면 전송
        if(cmdList.length!==0){
            loggerFactory.info(`device publish: ${dev_channel}`);

            client.publish(DEV_CONTROL + `/${dev_channel}`, JSON.stringify({
                cmdList:cmdList
            }));
        }

        result = {
            status: HttpStatus.OK,
            msg: '명령이 정상적으로 허브에게 전송되었습니다.'
        }

        res.json(result);
    },

    publishToEvent: (dev_channel, json)=>{
        client.publish(DEV_CONTROL + `/${dev_channel}`, JSON.stringify(json));
    },

    //MQTT 초기화
    init: () => {

        //topic subscribe 설정
        mqttTopcicSubscription(); 

        //mqtt consumer 정의
        mqttReceiveDefine();
    },

}