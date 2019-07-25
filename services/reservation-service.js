var mqttService = require('./mqtt-service');
var models = require('../models');

const additionalDatasetFilter = (additional) => {

    console.log(additional)

    let idxLoc = {
        time: 0,
        dynamic: null
    }

    //dynamic이랑 time이 동시에 존재하는 경우
    if(additional.length===2){

        //time additional인 경우
        if(additional[0].type==='1'){
            idxLoc.dynamic=1;
        }
        else{
            idxLoc.time=1;
            idxLoc.dynamic=0;
        }
    }

    return idxLoc
}

module.exports = {

    reserve: (devMac, item)=>{

        const idxLoc = additionalDatasetFilter(item.additional);

        //예약 설정
        /*const timeoutEvent = setTimeout(()=>{
            mqttService.publishToEvent(devMac,{
                eventCode: item.eventCode,
                dataset: idxLoc.dynamic ? [item.additional[idxLoc.dynamic]] : [],
            })
        }, item.additional[idxLoc.time].value-Date.now()) //reservation - current*/

        console.log(item.additional[idxLoc.time].value);

        const actDate = new Date(item.additional[idxLoc.time].value)

        models.reserve.create({
            dev_mac: devMac,
            act_at: actDate.getTime(),
            ev_code: item.eventCode,
            opt_dt: item.additional[idxLoc.dynamic]
        })
    },

    reserveCancel: (reserveId, devMac)=>{
        
        models.reserve.destroy({where: {res_id: reserveId}})
            .then(result => {
            })
            .catch(err => {
                console.error(err);
            });
    },

}