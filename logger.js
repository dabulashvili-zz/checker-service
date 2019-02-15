const log4js = require('log4js');
const gelp = require('@log4js-node/gelf');

log4js.configure({
    appenders: {
        console: { type: 'console' },
        gelp: {type: '@log4js-node/gelf', host: 'localhost', 'port': 12201 }
    },
    categories: {
        default: { appenders: ['gelp', 'console'], level: 'debug' }
    }
});

const logger = log4js.getLogger();
logger.level = 'debug';

global.logger = logger;
module.exports = logger;
