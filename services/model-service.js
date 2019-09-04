var models = require('../models');
//var mqttService = require('./mqtt-service')

let publishToOther = null;

const typeMapping = (type) => {
    let output = ''
    switch (type) {

        //byte
        case '1':
            output = "TINYINT"
            break;

        //INTEGER
        case '2':
            output = "INTEGER"
            break;

        //LONG
        case '3':
            output = "INTEGER"
            break;

        //DOUBLE
        case '4':
            output = "DOUBLE"
            break;

        //STRING
        case '5':
            output = "VARCHAR(10)"
            break;

        //CHAR
        case '6':
            output = "CHAR(1)"
            break;

        default: break;
    }

    return output;
}

const ddlGenerator = (model, devMac, events) => {
    return new Promise(async (resolve, reject) => {

        const replaceMac = devMac.replace(/:/g, '')
        const eventTable = 'event' + '_' + replaceMac
        const thirdTable = 'third' + '_' + replaceMac
        const controlTable = 'control' + '_' + replaceMac
        for (let i = 0; i < model.length; i++) {
            const stateTable = model[i].dataKey + '_' + replaceMac

            //디바이스 상태 값이라면
            if (model[i].modType === '0') {
                models.sequelize.query(
                    `CREATE TABLE ${stateTable} 
                    (
                        data ${typeMapping(model[i].dataType)},
                        PRIMARY KEY (data)
                    )`
                )
            }
            //디바이스 센싱 값 이라면,
            else {
                models.sequelize.query(
                    `CREATE TABLE ${stateTable}
                    (
                        rec_time TIMESTAMP(2),
                        data ${typeMapping(model[i].dataType)},
                        PRIMARY KEY (rec_time)
                    )`
                )
            }
        }

        //이벤트를 담는 테이블 생성
        models.sequelize.query(
            `CREATE TABLE ${eventTable}
            (
                event_id    INTEGER,
                data_key    VARCHAR(10),
                output_type CHAR(1),
                rule_type CHAR(1),
                rule_value VARCHAR(20),
                priority    INTEGER,
                PRIMARY KEY (event_id)
            )`
        ).then(async () => {

            await models.sequelize.query(
                `CREATE TABLE ${thirdTable}
                (
                    event_id    INTEGER,
                    host    VARCHAR(15),
                    port    VARCHAR(5),
                    path    VARCHAR(100),
                    FOREIGN KEY (event_id)
                    REFERENCES ${eventTable}(event_id)
                )`
            )

            await models.sequelize.query(
                `CREATE TABLE ${controlTable}
                (
                    event_id    INTEGER,
                    ev_code     INTEGER,
                    auth_key    CHAR(32),
                    FOREIGN KEY (event_id)
                    REFERENCES ${eventTable}(event_id)
                )`
            )

            for (let i = 0; i < events.length; i++) {
                await models.sequelize.query(
                    `INSERT INTO ${eventTable}
                    (
                        event_id,
                        data_key,
                        output_type,
                        rule_type,
                        rule_value,
                        priority
                    )
                    VALUES(
                        ${events[i].eventId},
                        '${events[i].dataKey}',
                        ${events[i].outputType},
                        ${events[i].ruleType},
                        ${events[i].ruleValue ? events[i].ruleValue : 'NULL'},
                        ${events[i].priority}
                    )
                    `
                );

                //third
                if (events[i].outputType === '3') {
                    await models.sequelize.query(
                        `INSERT INTO ${thirdTable}
                        (
                            event_id,
                            host,
                            port,
                            path
                        )
                        VALUES(
                            ${events[i].eventId},
                            '${events[i].host}',
                            '${events[i].port}',
                            '${events[i].path}'
                        )
                        `
                    );
                }
                else if (events[i].outputType === '2') {
                    await models.sequelize.query(
                        `INSERT INTO ${controlTable}
                        (
                            event_id,
                            ev_code,
                            auth_key
                        )
                        VALUES(
                            ${events[i].eventId},
                            ${events[i].evCode},
                            '${events[i].authKey}'
                        )
                        `
                    );
                }
            }
            resolve(true);
        })
    })
}

const dropTable = (tableName) => {
    return new Promise((resolve, reject) => {
        models.sequelize.query(`DROP TABLE ${tableName}`).then(() => {
            resolve(true)
        });
    })
}

//이벤트 실행 함수
const actEvent = (type, replaceMac, mac, eventId) => {
    const controlTable = 'control' + '_' + replaceMac
    switch (type) {
        case '2':
            console.log('ctrl')
            models.sequelize.query(
                `SELECT * 
                FROM ${controlTable}
                WHERE event_id=${eventId}`
            ).then((rows) => {
                const authKey = rows[0][0].auth_key
                const evCode = rows[0][0].ev_code;
                const cmdList = [
                    {
                        e: evCode,
                        t: 1,
                        d: []
                    }
                ]

                //디바이스 등록 여부 조회
                models.dev.findAll({
                    attributes: ['dev_mac', 'dev_type'],
                    where: {
                        dev_type: authKey
                    }
                }).then(devInfo => {
                    //동일한 타입의 모든 디바이스에게 명령 전송
                    for (let i = 0; i < devInfo.length; i++) {
                        publishToOther(devInfo[i].dev_mac, {
                            c: cmdList
                        })
                    }
                })
            })
            break;
        case '3':
            console.log('third')
            break;
        default:
            break;
    }
}

const checkEventRule = (mac, macStr, key, val) => {
    models.sequelize.query(
        `SELECT * 
            FROM ${'event' + '_' + macStr}
            WHERE data_key='${key}'
            ORDER BY priority ASC`
    ).then((rows) => {
        let isMatch = false;
        for (let i = 0; i < rows[0].length; i++) {
            switch (rows[0][i].rule_type) {
                case '2':
                    isMatch = eval(`${val}==${rows[0][i].rule_value}`)
                    break;
                case '3':
                    isMatch = eval(`${val}!=${rows[0][i].rule_value}`)
                    break;
                case '4':
                    isMatch = eval(`${val}>${rows[0][i].rule_value}`)
                    break;
                case '5':
                    isMatch = eval(`${val}<${rows[0][i].rule_value}`)
                    break;
                //case '0'
                default:
                    isMatch = true;
                    break;
            }
            if (isMatch) {
                actEvent(rows[0][i].output_type, macStr, mac, rows[0][i].event_id)
                return;
            }
        }
    });
}

module.exports = {

    createDataModelTable: async (model, devMac, events) => {
        return new Promise((resolve, reject) => {

            ddlGenerator(model, devMac, events).then((res) => {
                resolve(res)
            })
        })
    },

    deleteDataModelTable: (devMac) => {
        return new Promise((resolve, reject) => {
            const replaceMac = devMac.replace(/:/g, '')
            let flag = false;
            models.sequelize.query(`SHOW TABLES`).then(async (rows) => {
                for (let i = 0; i < rows[0].length; i++) {
                    if (rows[0][i].Tables_in_hub_system.indexOf(replaceMac) !== -1) {
                        if (rows[0][i].Tables_in_hub_system.indexOf('event') === -1)
                            await dropTable(rows[0][i].Tables_in_hub_system)
                        else {
                            flag = true;
                        }
                    }
                }
                //await dropTable(rows[0][i].Tables_in_hub_system)
                //await dropTable('control_'+replaceMac)
                //await dropTable('third_'+replaceMac)
                if (flag) {
                    await dropTable('event_' + replaceMac)
                    models.sequelize.query('COMMIT')
                }
                resolve(true);
            })
        })
    },

    insertDataModel: (record) => {
        const replaceMac = record.mac.replace(/:/g, '')
        models.sequelize.query(
            `INSERT INTO ${record.key + '_' + replaceMac}
            (
                data
            )
            VALUES(
                ${record.val}
            )`
        )
    },

    updateDataModel: (record) => {
        const replaceMac = record.mac.replace(/:/g, '')
        models.sequelize.query(
            `UPDATE ${record.key + '_' + replaceMac}
            SET data = ${record.val}`
        ).then(() => {
            checkEventRule(record.mac, replaceMac, record.key, record.val)
        })
    },

    getDataModel: (key, mac) => {
        return new Promise((resolve, reject) => {
            const replaceMac = mac.replace(/:/g, '')
            models.sequelize.query(
                `SELECT data FROM ${key + '_' + replaceMac}`
            ).then((rows) => {
                if (rows[0].length !== 0) {
                    resolve(rows[0][0].data)
                }
                else
                    resolve(null)
            });
        })
    },

    insertSensingData: (record) => {
        const replaceMac = record.mac.replace(/:/g, '')
        models.sequelize.query(
            `INSERT INTO ${record.key + '_' + replaceMac}
            (
                rec_time,
                data
            )
            VALUES(
                NOW(),
                ${record.val}
            )`
        ).then(() => {
            checkEventRule(record.mac, replaceMac, record.key, record.val)
        })
    },

    init: (func) => {
        publishToOther =func;
    }
}