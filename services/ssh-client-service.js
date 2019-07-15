
//var app = require('express')();
//var http = require('http').Server(app);
//var io = require('socket.io')(http);
//var SSHClient = require('ssh2').Client;
var pty = require('node-pty');
 
const createNewServer = (machineConfig, socket) => {
    //var ssh = new SSHClient();

    let {msgId, ip, username, password} = machineConfig;

    const shell = pty.spawn('/bin/bash', [], {
        name: 'xterm-color',
        cwd: process.env.PWD,
        env: process.env
    });

      // For all shell data send it to the websocket
    shell.on('data', (data) => {
        socket.emit(msgId, data);
    });
      // For all websocket data send it to the shell
    socket.on(msgId, (msg) => {
        shell.write(msg+'\r');
    });

    /*ssh.on('ready', () => {

        socket.emit(msgId, '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n');

        ssh.shell((err, stream) => {
            if(err) {
                return socket.emit(msgId, '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
            }
            socket.on(msgId, data => {
                stream.write(data);
            });
            stream.on('data', d => {
                //utf8.decode(d.toString('binary'))
                socket.emit(msgId, Buffer.from(d));
            }).on('close', () => {
                ssh.end();
            });
        })
    }).on('close', () => {
        socket.emit(msgId, '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    }).on('error', (err) => {
        console.log(err);
        socket.emit(msgId, '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
    }).connect({
        host: '127.0.0.1',
        port: 22,
        username: 'pi',
        password: 'raspberry'
    });*/
}

module.exports = {
    init: (server) => {

        //http server를 socket.io로 업그레이드
        const io = require('socket.io')(server);

        io.on('connection', socket => {
            socket.on('createNewServer', machineConfig => {
                console.log("createNewServer")
                createNewServer(machineConfig, socket);
            })
         
            socket.on('disconnect', () => {
                console.log('user disconnected');
            });
        })
    }
}