var hostapd = require('wireless-tools/hostapd');
var udhcpd = require('wireless-tools/udhcpd');
var ifconfig = require('wireless-tools/ifconfig');
var async = require('async');
var ledServices = require('../services/led-services');

const udhcpd_options = {
    interface: 'wlan0',
    start: '192.168.2.10',
    end: '192.168.2.254',
    option: {
        router: '192.168.2.1',
        subnet: '255.255.255.0',
        dns: ['8.8.4.4', '8.8.8.8']
    }
};

const hostapd_options = {
    channel: 6,
    driver: 'nl80211',
    hw_mode: 'g',
    interface: 'wlan0',
    ssid: 'IoT-Hub', //ssid는 owner id
    wpa: 2,
    wpa_passphrase: 'raspberry', //비밀번호
    //ieee80211n: 1, //enable 802.11n
    //wmm_enabled: 1, //enable wmm
    //macaddr_acl: 0, //accept all MAC address
    //auth_algs: 1, //Use WPA authentication
    //ignore_broadcast_ssid=0, //require clients to know the network name  
    //wpa_key_mgmt: 'WPA-PSK', //Use a pre-shared key
    //rsn_pairwise: 'CCMP' //Use AES, instead of TKIP
};

const ifconfig_options = {
    interface: 'wlan0',
    //link: 'ethernet',
    ipv4_address: '192.168.2.1',
    ipv4_broadcast: '192.168.2.255',
    ipv4_subnet_mask: '255.255.255.0'
}

var disable_tasks = [
    /*(callback)=>{
        ifconfig.down(ifconfig_options.interface,(err)=>{
            callback(null, err);
        });
    },*/
    (callback) => {
        hostapd.disable(hostapd_options.interface, (err) => {
            callback(null, err);
        });
    },
    (callback) => {
        udhcpd.disable(udhcpd_options.interface, (err) => {
            callback(null, err);
        });
    },
]

var enable_tasks = [
    (callback) => {
        ifconfig.up(ifconfig_options, (err) => {
            callback(null, err);
        });
    },
    (callback) => {
        hostapd.enable(hostapd_options, (err) => {
            if(err){
                hostapd.enable(hostapd_options, (err) => {
                    callback(null, err);   
                })
            }
            else callback(null, err);
        });
    },
    (callback) => {
        udhcpd.enable(udhcpd_options, (err) => {
            callback(null, err);// udhcpd enable error problem occured often
        });
    },
]

var apError = false;

module.exports = {

    disable: () => {
        return new Promise((resolve, reject) => {
            async.series(disable_tasks, (err, results) => {
                err ? ledServices.error() : ledServices.process();
                console.log(results);
                resolve(true);
            })
        });
    },

    enable: () => {
        return new Promise((resolve, reject)=>{setTimeout(() => {
            async.series(enable_tasks, (err, results) => {
                if (!apError) {
                    apError = err;
                    apError ? ledServices.error() : ledServices.enable();
                }
                console.log(results);
                resolve(true);
            });
        }, 3000)});//ap모드 기동

    },

    exportHostapdSettings: () => {
        return hostapd_options;
    }
}