var hostapd = require('wireless-tools/hostapd');
var udhcpd = require('wireless-tools/udhcpd');
var ifconfig = require('wireless-tools/ifconfig');
var async = require('async');

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

let hostapd_options = {
    channel: 6,
    driver: 'nl80211',
    hw_mode: 'g',
    interface: 'wlan0',
    ssid: '', //ssid는 owner id
    wpa: 2,
    wpa_passphrase: '', //비밀번호
};

const ifconfig_options = {
    interface: 'wlan0',
    //link: 'ethernet',
    ipv4_address: '192.168.2.1',
    ipv4_broadcast: '192.168.2.255',
    ipv4_subnet_mask: '255.255.255.0'
}

var disable_tasks = [
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
            callback(null, err);
        });
    },
]

module.exports = {

    init: (ssid, password)=>{
        hostapd_options.ssid = ssid;
        hostapd_options.wpa_passphrase = password;
        console.log(hostapd_options)
    },

    disable: () => {
        return new Promise((resolve, reject) => {
            async.series(disable_tasks, (err, results) => {
                resolve(true);
            })
        });
    },

    enable: () => {
        return new Promise((resolve, reject)=>{setTimeout(() => {
            async.series(enable_tasks, (err, results) => {
                console.log(results)
                resolve(true);
            });
        }, 3000)});//ap모드 기동
    },

    exportHostapdSettings: () => {
        return hostapd_options;
    },
}