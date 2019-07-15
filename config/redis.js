var redis = require('redis');
var redisClient = redis.createClient(
    process.env.REDIS_PORT || 6379,
    process.env.REDIS_HOST || 'localhost',
);

redisClient.auth('foobared', (err) => {
    if (err){
        loggerFactory.error(`redis authorization exception occured: ${err}`);
        throw err;
    }
});

redisClient.on('error', (err) => {
    loggerFactory.error(`redis error occured: ${err}`);
});

module.exports = redisClient;