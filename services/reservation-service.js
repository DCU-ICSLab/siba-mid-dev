//var mqttService = require('./mqtt-service');
var models = require('../models');

const timerList = []

const additionalDatasetFilter = (additional) => {

    console.log(additional)

    let idxLoc = {
        time: 0,
        dynamic: null
    }

    //dynamic이랑 time이 동시에 존재하는 경우
    if (additional.length === 2) {

        //time additional인 경우
        if (additional[0].type === '1') {
            idxLoc.dynamic = 1;
        }
        else {
            idxLoc.time = 1;
            idxLoc.dynamic = 0;
        }
    }

    return idxLoc
}

module.exports = {

    reserve: (devMac, item, func) => {

        const idxLoc = additionalDatasetFilter(item.additional);
        const actDate = new Date(item.additional[idxLoc.time].value)

        //예약 정보 저장
        models.reserve.create({
            dev_mac: devMac,
            act_at: actDate.getTime(),
            ev_code: item.eventCode,
            opt_dt: item.additional[idxLoc.dynamic]
        }).then(row => {

            //예약 설정
            const timeoutEvent = setTimeout(() => {
                models.reserve.destroy({ where: { res_id: row.dataValues.res_id } })
                .then(result => {
                    func(devMac, {
                        eventCode: item.eventCode,
                        dataset: idxLoc.dynamic ? [item.additional[idxLoc.dynamic]] : [],
                    })

                    //배열에서 제거
                    const idx = timerList.findIndex(item=>item.key === row.dataValues.res_id)
                    timerList.splice(idx,1)
                })
            }, actDate.getTime() - Date.now()) //reservation - current

            timerList.push({
                key: row.dataValues.res_id,
                instance: timeoutEvent
            })
        })
    },

    reserveCancel: (reserveId) => {

        console.log(reserveId)

        //예약 정보 삭제
        models.reserve.destroy({ where: { res_id: reserveId } })
            .then(result => {
                const idx = timerList.findIndex(item=>item.key === reserveId)
                if(idx){
                    const instance = timerList[idx].instance
                    if(instance){
                        clearTimeout(instance)
                        timerList.splice(idx,1)
                    }
                }
            })
            .catch(err => {
                console.error(err);
            });
    },

}