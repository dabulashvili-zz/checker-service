const request = require('request');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const intervals = {};

function dataParams(data) {
    data.check_interval = data.check_interval === undefined ? config.CHECK_INTERVAL : data.check_interval;
    data.check_count = data.check_count === undefined ? config.CHECK_COUNT : data.check_count;
    data.still_image_count = data.still_image_count === undefined ? config.STILL_IMAGE_COUNT : data.still_image_count;
    data.min_hit_count = data.min_hit_count === undefined ? config.MIN_HIT_COUNT : data.min_hit_count;
    data.exit_when_hit = data.exit_when_hit === undefined ? config.EXIT_WHEN_HIT : data.exit_when_hit;
    data.post_image = data.post_image === undefined ? config.POST_IMAGE : data.post_image;
    data.same_image = 0;
    data.ai_hit = 0;
    data.nudity_check_count = 0;
    data.checking = false;
}

function stopWatching(data, reason) {
    logger.warn(data.id + " closed. reason: " + reason);
    clearInterval(intervals[data.screenshots]);
    intervals[data.screenshots] = null;
}

function checkImage(data) {
    var aiResponse = '';
    return request.post(config.CHECK_URL).on('data', function (data) {
        aiResponse += data;
    }).on('end', function () {
        aiResponse = aiResponse.toString('ascii').trim();
        logger.info(data.id + " AI result " + aiResponse + ";");
        if (aiResponse === "1") {
            data.ai_hit++;
            if (data.ai_hit >= data.min_hit_count) {
                logger.info(data.id + " Callback hit;");
                if (data.post_image) {
                    fs.createReadStream(data.current_file).pipe(request.post(data.callback));
                } else {
                    request.get(data.callback);
                }
                if (data.exit_when_hit) {
                    stopWatching(data, "exit_when_hit")
                }
            }
            var name = path.basename(data.current_file);
            var newPath = config.NUDITY_FILES_PATH + name;
            fs.rename(data.current_file, newPath, function (err) {
                if (err) logger.error(err);
                else logger.debug("nodity file " + newPath + " saved");
            })
        } else {
            fs.unlink(data.current_file, function (err) {
                if (err) logger.error(err);
                else logger.debug("tmp file " + data.current_file + " deleted")
            })
        }
        data.checking = false;
    }).on('error', function (error) {
        logger.error(error);
    })
}

function hashCheck(imageStream, data) {
    var hash = crypto.createHash('sha256');
    var hashString = '';
    imageStream.pipe(hash).on('data', function (data) {
        hashString += data;
    }).on('end', function () {

        if (data.hash === hashString) {
            data.same_image++;
            logger.warn(data.id + " same hash, stopping after " + (data.still_image_count - data.same_image) + " match")
        } else {
            data.same_image = 0;
        }

        data.hash = hashString;

        if (data.same_image === data.still_image_count) stopWatching(data, "same_image")
    });
}

function saveToFile(imageStream, data) {
    var path = config.TMP_FILES_PATH + data.id + '-' + (++data.nudity_check_count);
    var writeStream = fs.createWriteStream(path);
    data.current_file = path;
    imageStream.pipe(writeStream);
}

function startWatching(data) {
    if (intervals[data.screenshots]) stopWatching(data);
    dataParams(data);
    intervals[data.screenshots] = setInterval(function () {
        if (data.checking) {
            logger.warn(data.id + " checking missed, current checking " + data.current_file);
            return;
        }
        data.checking = true;
        var imageStream = request.get(data.screenshots).on('error', function (error) {
            data.check_count -= 1;
            if (data.check_count <= 0) {
                stopWatching(data, "check_count");
            }
            return logger.error(error);
        }).on('response', function (response) {
            if (response.statusCode !== 200) {
                data.check_count -= 1;
                if (data.check_count <= 0) {
                    stopWatching(data, "check_count");
                }
                data.checking = false;
                return logger.error(data.id + " status code: " + response.statusCode);
            } else {
                imageStream.pipe(checkImage(data));
                hashCheck(imageStream, data);
                saveToFile(imageStream, data);
            }
        });
    }, data.check_interval);
}

module.exports = {
    startWatching: startWatching
};
