var amqp = require('amqplib/callback_api')


const AMQP_URL = `amqp://temp:temp@192.168.0.31:5672`
const QUEUE = 'keepalive.queue'
const ROUTE = 'keepalive.route'
const TOPIC = 'keepalive'



module.exports = {
    init: (config) => {

        const hubAuthKey = config.hubAuthKey;

        amqp.connect(AMQP_URL, (err,conn)=>{

            //에러 발생 시 초기화 중지
            if(err){
                console.log(err)
                return;
            }
            
            conn.createChannel((err,ch)=>{

                if(err){
                    console.log(err)
                    return;
                }

                //2초마다 keep-alive packet 전송
                setInterval(()=>{
                    ch.publish(TOPIC, ROUTE, Buffer.from(JSON.stringify({
                        id:hubAuthKey
                    })), {contentType: 'application/json'})
                }, 2000)
            })
        })
    }
}