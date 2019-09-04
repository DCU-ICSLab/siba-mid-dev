const request = require('request');

const DEVERLOPER_SERVER_URL = 'http://39.117.253.166:4000/model/'

module.exports = {

    request: async (devType) => {
        return new Promise((resolve, reject)=>{
            request.get({
                uri: DEVERLOPER_SERVER_URL+devType,
                json: true
            }, (error, response, body) => {
                resolve(body)
            });
        })
    }
}