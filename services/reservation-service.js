//var mqttService = require('./mqtt-service');
var models = require('../models');

const timerList = []

const additionalDatasetFilter = (additional) => {

    console.log(additional)

    return {
        time: additional.length >= 2 ? 0 : null,
        dynamic: additional.length > 2 ? 1 : null,
        interval: additional.length - 1
    }
}

const reservationActor = (devMac, item, idxLoc, res_id, res_type, func) => {
    let date = new Date()
    let timeoutEvent = null
    let index = -1

    switch (res_type) {

        //일회 예약 이라면
        case '1':
            models.reserve.destroy({ where: { res_id: res_id } })
                .then(result => {
                    func(devMac, {
                        c:
                            [
                                {
                                    e: item.eventCode,
                                    t: 5,
                                    d: idxLoc.dynamic ? [item.additional[idxLoc.dynamic]] : [],
                                }
                            ]
                    })

                    //배열에서 제거
                    const idx = timerList.findIndex(item => item.key === res_id)
                    timerList.splice(idx, 1)
                })
            break

        //주기 예약 이라면
        case '2':
            date.setDate(date.getDate()+1)

            models.reserve.update({
                act_at: date.getTime(),
            }, 
            {
                where: { res_id: res_id }
            })

            //예약 설정
            timeoutEvent = setTimeout(()=>reservationActor(
                devMac,
                item,
                idxLoc,
                res_id,
                res_type,
                func
            ), date.getTime() - Date.now()) //reservation - current

            index = timerList.findIndex(item => {
                return item.key === res_id
            })

            timerList[index].instance = timeoutEvent

            break;

        //월별 예약 이라면
        case '3':
            date.setMonth(date.getMonth()+1)

            models.reserve.update({
                act_at: date.getTime(),
            }, 
            {
                where: { res_id: res_id }
            })

            //예약 설정
            timeoutEvent = setTimeout(()=>reservationActor(
                devMac,
                item,
                idxLoc,
                res_id,
                res_type,
                func
            ), date.getTime() - Date.now()) //reservation - current

            index = timerList.findIndex(item => {
                return item.key === res_id
            })

            timerList[index].instance = timeoutEvent

            break;

        default:
            break
    }
}

module.exports = {

    reserve: (devMac, item, func) => {

        item.additional.sort((a, b) => {
            if (a.type == b.type) {
                return 0;
            }
            return a.type > b.type ? 1 : -1
        })

        const idxLoc = additionalDatasetFilter(item.additional);
        const actDate = new Date(item.additional[idxLoc.time].value)

        loggerFactory.info(`set new reservation: ${devMac}`);

        //예약 정보 저장
        models.reserve.create({
            dev_mac: devMac,
            act_at: actDate.getTime(),
            ev_code: item.eventCode,
            opt_dt: idxLoc.dynamic ? item.additional[idxLoc.dynamic].value : null,
            res_type: item.additional[idxLoc.interval].value
        }).then(row => {

            //예약 설정
            const timeoutEvent = setTimeout(()=>reservationActor(
                devMac,
                item,
                idxLoc,
                row.dataValues.res_id,
                row.dataValues.res_type,
                func
            ), actDate.getTime() - Date.now()) //reservation - current

            timerList.push({
                key: row.dataValues.res_id,
                instance: timeoutEvent,
                type: row.dataValues.res_type
            })
        })
    },

    reserveCancel: (reserveId) => {

        //예약 정보 삭제
        models.reserve.destroy({ where: { res_id: reserveId } })
            .then(result => {
                if (timerList.length !== 0) {

                    const idx = timerList.findIndex(item => {
                        return item.key === parseInt(reserveId)
                    })

                    if (idx && timerList[idx]) {
                        const instance = timerList[idx].instance
                        if (instance) {
                            clearTimeout(instance)
                            timerList.splice(idx, 1)
                        }
                    }
                }
            })
            .catch(err => {
                loggerFactory.error(`reservation cancel error: ${reserveId}`);
            });
    },

    //DB로 부터 예약 설정 정보 리로드
    reserveReload: (func) => {
        /*models.reserve.findAll({
            attributes: ['res_id', 'act_at', 'ev_code', 'opt_dt', 'dev_mac'],
        }).then(set => {
            for(let i=0; i< set.length; i++){
                const reservationAt = set[i].act_at - Date.now()
                if(reservationAt>0){
                    const timeoutEvent = setTimeout(() => {
                        models.reserve.destroy({ where: { res_id: set[i].res_id } })
                        .then(result => {
                            func(set[i].dev_mac, {
                                cmdList:
                                [
                                    {
                                        eventCode: set[i].ev_code,
                                        dataset: idxLoc.dynamic ? [item.additional[idxLoc.dynamic]] : [],
                                    }
                                ]
                            })
        
                            //배열에서 제거
                            const idx = timerList.findIndex(item=>item.key === set[i].res_id)
                            timerList.splice(idx,1)
                        })
                    }, actDate.getTime() - Date.now()) //reservation - current
        
                    timerList.push({
                        key: row.dataValues.res_id,
                        instance: timeoutEvent
                    })
                }
            }
        })*/
    }

}