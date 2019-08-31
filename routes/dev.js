var express = require('express');
var router = express.Router();
var network = require('network')
var redisClient = require('../config/redis');
var models = require('../models');
var validationService = require('../services/validation-service')
var handleLockService = require('../services/handleLock-service')
var mqttService = require('../services/mqtt-service')
var modelService = require('../services/model-service')

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
router.post('/:channel', (req, res, next) => {

    const dev_channel = req.params.channel;

    const json_data = req.body;

    console.log(json_data)

    //test id 정보 저장
    redisClient.set(json_data.devMac, JSON.stringify({
        testId: json_data.testId,
        userId: json_data.userId,
        devId: json_data.devId,
    }));

    mqttService.publish(dev_channel, json_data.cmdList, res);
});

//디바이스의 상태 값 조회
router.post('/:channel/state', async (req, res, next) => {
    const dev_channel = req.params.channel;

    const json_data = req.body;

    let keySet = [];

    for(let i=0; i< json_data.keySet.length; i++){
        keySet.push({
            key: json_data.keySet[i],
            value: String(await modelService.getDataModel(json_data.keySet[i],dev_channel))
        })
        console.log(keySet[i])
    }

    res.json({
        keySet: keySet,
    })
})

//judgement 수행
router.post('/:channel/judge', (req, res, next) => {

    const dev_channel = req.params.channel;

    const statement = req.body.statement;

    let result = 500

    try{

        console.log(statement);

        const trimStatement = statement.trim();

    
        const key = trimStatement.match('#{[a-zA-Z]+}')[0].replace('#{', '').replace('}','')
        modelService.getDataModel(key, dev_channel).then(data=>{
            const execStatement = trimStatement.replace('#{'+key+'}',data)
            const evalRes = eval(execStatement)
            //console.log(execStatement)
            //console.log(evalRes)
            result =  evalRes ? 200 : 500

            res.json({
                status: result
            })
        })
    }
    catch(e){
        res.json({
            status: 500
        })
    }

});

module.exports = router;