var si = require('systeminformation');
var os 	= require('os-utils');

module.exports = {
    monitoring: () => {
        //si.cpu().then(data => console.log(data))
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