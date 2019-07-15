var apServices = require('./ap-services')
var nrf24=require("nrf24");
var rf24= new nrf24.nRF24(22,0); //ce:6, cs:10

const rf_options = {
    PALevel: nrf24.RF24_PA_ULTRA,
    DateRate: nrf24.RF24_1MBPS,
    Channel: 115
}

const hostapd_options = apServices.exportHostapdSettings();

const sendDataset = {
    "ssid": hostapd_options.ssid,
    "psw": hostapd_options.wpa_passphrase //wpa_passphrase는 암호화 시켜야
}

module.exports = {

    init: ()=>{
        loggerFactory.info('initializing nrf24...');
        rf24.begin();
        rf24.config(rf_options);
        rf24.powerDown();
    },

    broadcast: ()=>{
        loggerFactory.info('nrf24l01 send ssid, password info success');
        rf24.begin();
        rf24.useWritePipe("0x72646f4e31");

        //json포맷의 데이터를 암호화 시켜서 전송해야
        var dataset = JSON.stringify(sendDataset);

        var originData = Buffer.from(JSON.stringify(sendDataset));

        for(let i=0; i<originData.length; i+=30){ //데이터 패킷은 30byte
            let len = originData.length-i;
            rf24.write(originData.slice(i,len>=30 ? i+30:i+len));
        }

        rf24.powerDown();
    }
}