const cluster = require('cluster');
const app = require('./app');
const logger = require('./logger');
const port = process.env.PORT || 3333;

if (cluster.isMaster) {
    const cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
} else {
    app.listen(port);
    logger.info('Worker server started on port %d (ID: %d, PID: %d)', port, cluster.worker.id, cluster.worker.process.pid);
}

process.on('uncaughtException', function (err) {
    logger.error(err.stack);
    logger.error("Node NOT Exiting...");
});
