var models = require('../models');
var redisClient = require('../config/redis');
const {promisify} = require('util');
const getAsync = promisify(redisClient.get).bind(redisClient);
var mqtt = require('mqtt');
var handleLockService = require('./handleLock-service');
var client = mqtt.connect({
    host: 'localhost',
    port: 1883
});

//관리되는 topic들
const DEV_REGISTER = 'dev/register';
const DEV_CONTROL = 'dev/control';
const DEV_CONTROL_END = 'dev/control/end';

const mqtt_connect = () => {
    client.subscribe(DEV_REGISTER, (err) => {
        if(err) console.log(err);
    })
    client.subscribe(DEV_CONTROL_END, (err) => {
        if(err) console.log(err);
    })
}

const mqtt_receive = () => {
    client.on('message', (topic, message) => {
        let subData = JSON.parse(message.toString());
        console.log(subData)

        switch (topic) {
            //하위 장비가 연결되고 등록 정보를 전송했을 때,
            case DEV_REGISTER:
                devRegisterOrUpdate(subData);
                break;
            case DEV_CONTROL_END:
                sendResultToSkill(subData);
                break;
            default:
        }
    })
}

//모듈에게 전송했던 명령이 끝나고 난 후의 처리.
const sendResultToSkill = (subData) => {
    //스킬 서버에게 명령 결과를 전송해줘야 함.

    //명령 수행이 완료되었으므로 lock 해제
    handleLockService.deviceUnlock(subData.dev_mac); 
    loggerFactory.info(`device receive: ${subData.dev_mac}`);
    console.log('some action is finish');
}

const devRegisterOrUpdate = subData => {

    loggerFactory.info('try device regist or updata');

    models.dev.findAll({
        attributes: ['dev_mac', 'dev_type', 'cur_ip'],
        where: {
            dev_mac: subData.dev_mac
        }
    }).then(devInfo => {
        // 이전에 장비가 등록되었었다면,
        if (devInfo.length === 1) {
            //기존에 연결된 장비의 세부 정보가 변경되었다면 업데이트
            if (devInfo[0].cur_ip !== subData.cur_ip || devInfo[0].dev_type !== subData.dev_type) {
                models.dev.update({
                    cur_ip: subData.cur_ip,
                    dev_type: subData.dev_type
                }, {
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
            redisClient.get("mac", (err, reply) => {
                models.dev.create({
                    dev_mac: subData.dev_mac,
                    cur_ip: subData.cur_ip,
                    dev_type: subData.dev_type,
                    mac: reply
                });
                loggerFactory.info('regist new device');
            });
        }

        //다중 명령이 전송되는 것을 방지하기위해 직전에 연결된 장비의 MAC 주소 등록
        handleLockService.deviceUnlock(subData.dev_mac); 

        //regist or update 결과를 모듈에게 전송
        publishToDev(subData.dev_mac, {
            cmd: [
                {cmd_code: 0, data: ""} //cmd_code 0은 모듈이 허브에 등록되었음을 알려주는 코드
            ]
        }, true); 
    });
}

//하위 장비에게 제어 명령 전송
const publishToDev = async (dev_channel, data, init = false, res = null) => {
    //redis로 부터 명령을 전송하고자 하는 장비의 mac address 가져옴

    let result = {
        status: false,
        msg: '디바이스가 다른 명령 수행 중 입니다.'
    }

    let reply = await getAsync(dev_channel);

    if(!reply){ //redis에 등록된 장비의 MAC 주소가 없는경우
        result = {
            status: false,
            msg: '등록된 디바이스가 아닙니다.'
        }
    } 
    else if (reply === 'unlock'){
        if(!init) //초기화 작업이 아닌 경우는 lock 설정
            handleLockService.deviceLock(dev_channel);
        loggerFactory.info(`device publish: ${dev_channel}`);
        const buf = JSON.stringify(data);
        client.publish(DEV_CONTROL + `/${dev_channel}`, buf);
        
        result = {
            status: true,
            msg: '명령을 성공적으로 전송하였습니다.'
        }
    }

    if(res)
        res.json(result);
}

module.exports = {

    //제어 모듈 control 시에 사용
    publish: publishToDev,

    //MQTT 초기화
    init: () => {
        mqtt_connect(); //subscribe 등록
        mqtt_receive();
    }
}