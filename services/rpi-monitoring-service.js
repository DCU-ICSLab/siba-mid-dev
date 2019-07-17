var si = require('systeminformation');
var os 	= require('os-utils');
var getId = require('docker-container-id');

module.exports = {
    monitoring: async () => {
        console.log(await getId())
        si.dockerContainerStats(await getId(), data=>{
            console.log(data)
        })
        si.dockerContainerProcesses(await getId(), data=>{
            console.log(data)
        })
        si.dockerInfo().then(data => console.log(data))
        si.dockerInfo().then(data => console.log(data))
        si.cpu().then(data => console.log(data))
        si.system().then(data => console.log(data))
        si.bios().then(data => console.log(data))
        si.mem().then(data => {
            const freeMem = Math.round((data.free/data.total)*100)
            const usedMem = Math.round((data.used/data.total)*100)
            const buffCached = Math.round((data.buffcache/data.total)*100)
            console.log(freeMem)
            console.log(usedMem)
            console.log(buffCached)
        })
        os.cpuUsage(function(v){
            console.log( 'CPU Usage (%): ' + Math.round(v*100) );
        });        
        //console.log(os.totalmem())
        //console.log(Math.round(os.freememPercentage()*100));
    }
}