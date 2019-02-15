const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const status = require('http-status');

const app = express();
app.use(compression());
app.use(bodyParser.json());

const server = require('http').Server(app);
const watcher = require('./watcher');

const router = express();

router.post('/', function (req, res) {
    logger.info(req.body);
    var data = req.body;
    if (!data.id) {
        logger.error("No id!");
        res.status(status.BAD_REQUEST).send({error:"No id!"});
        return;
    }
    if (!data.screenshots) {
        logger.error("No screenshots url!");
        res.status(status.BAD_REQUEST).send({error:"No screenshots url!"});
        return;
    }
    if (!data.callback) {
        logger.error("No callback url!");
        res.status(status.BAD_REQUEST).send({error:"No callback url!"});
        return;
    }

    if (data.check_interval !== undefined) {
        if (typeof data.check_interval !== "number") {
            logger.error("Bad check interval!");
            res.status(status.BAD_REQUEST).send({error:"Bad check interval!"});
            return;
        }
        if (data.check_interval < 5000) {
            logger.error("Too low check interval!");
            res.status(status.BAD_REQUEST).send({error: "Too low check interval!"});
            return;
        }
    }

    if (data.check_count !== undefined) {
        if (typeof data.check_count !== "number") {
            logger.error("Bad check count!");
            res.status(status.BAD_REQUEST).send({error:"Bad check count!"});
            return;
        }
        if (data.check_count < 1) {
            logger.error("Too low check count!");
            res.status(status.BAD_REQUEST).send({error: "Too low check count!"});
            return;
        }
    }

    if (data.still_image_count !== undefined) {
        if (typeof data.still_image_count !== "number") {
            logger.error("Bad still image count!");
            res.status(status.BAD_REQUEST).send({error:"Bad still image count!"});
            return;
        }
        if (data.still_image_count && data.still_image_count < 2) {
            logger.error("Too low still image count!");
            res.status(status.BAD_REQUEST).send({error: "Too low still image count!"});
            return;
        }
    }

    if (data.min_hit_count !== undefined) {
        if (typeof data.min_hit_count !== "number") {
            logger.error("Bad min hit count!");
            res.status(status.BAD_REQUEST).send({error:"Bad min hit count!"});
            return;
        }
        if (data.min_hit_count && data.min_hit_count < 1) {
            logger.error("Too low min hit count!");
            res.status(status.BAD_REQUEST).send({error: "Too low min hit count!"});
            return;
        }
    }

    res.send();
    watcher.startWatching(data);
});

app.use('/', router);

app.use(function errorHandler(err, req, res, next) {

    var code = err.code || status.INTERNAL_SERVER_ERROR;
    var error = err.error || err;
    if (code === status.INTERNAL_SERVER_ERROR)
        logger.error(error);
    res.status(code).send(error.message);
});

module.exports = server;
