var models = require('../models');

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
            output = "VARCHAR(20)"
            break;

        //CHAR
        case '6':
            output = "CHAR(1)"
            break;

        default: break;
    }

    return output;
}

const ruleOperation = (type) => {
    
}

const ddlGenerator = (model, devMac) => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < model.length; i++) {

            //디바이스 상태 값이라면
            if (model[i].modType === '0') {
                models.sequelize.query(
                    `CREATE TABLE ${model[i].dataKey + '_' + devMac.replace(/:/g, '')} 
                    (
                        data ${typeMapping(model[i].dataType)},
                        PRIMARY KEY (data)
                    )`
                )
            }
            //디바이스 센싱 값 이라면,
            else {
                models.sequelize.query(
                    `CREATE TABLE ${model[i].dataKey + '_' + devMac.replace(/:/g, '')} 
                    (
                        rec_time TIMESTAMP(2),
                        data ${typeMapping(model[i].dataType)},
                        PRIMARY KEY (rec_time)
                    )`
                )
            }
        }

        resolve(true);
    })
}

const dropTable = (tableName) => {
    return new Promise((resolve, reject) => {
        models.sequelize.query(`DROP TABLE ${tableName}`).then(() => {
            resolve(true)
        });
    })
}

module.exports = {

    createDataModelTable: async (model, devMac) => {
        return new Promise((resolve, reject) => {

            ddlGenerator(model, devMac).then((res) => {
                resolve(res)
            })
        })
    },

    deleteDataModelTable: (devMac) => {
        return new Promise((resolve, reject) => {
            const replaceMac = devMac.replace(/:/g, '')
            models.sequelize.query(`SHOW TABLES`).then(async (rows) => {
                for (let i = 0; i < rows[0].length; i++) {
                    if (rows[0][i].Tables_in_hub_system.indexOf(replaceMac) !== -1) {
                        await dropTable(rows[0][i].Tables_in_hub_system)
                    }
                }
                models.sequelize.query('COMMIT')
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
        );
    },

    updateDataModel: (record) => {
        const replaceMac = record.mac.replace(/:/g, '')
        models.sequelize.query(
            `UPDATE ${record.key + '_' + replaceMac}
            SET data = ${record.val}`
        );
    },

    getDataModel: (key, mac) => {
        return new Promise((resolve, reject) => {
            const replaceMac = mac.replace(/:/g, '')
            models.sequelize.query(
                `SELECT data FROM ${key + '_' + replaceMac}`
            ).then((rows) => {
                if(rows[0].length!==0){
                    console.log(rows[0][0].data)
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
        );
    },

    checkEventRule: (record) => {

    }
}