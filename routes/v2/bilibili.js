var url = require('url');
var logger = require('../../tools/logger');
var redis = require('../../tools/redis');
var fetch = require('node-fetch');
var parseString = require('xml2js').parseString;

module.exports = function (req, res) {
    res.header('content-type', 'application/json; charset=utf-8');

    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    var query = url.parse(req.url, true).query;
    var aid = query.aid;
    var cid = query.cid;

    function addZero (str, length) {
        return new Array(Math.max(length - str.length + 1, 0)).join("0") + str;
    }

    if (cid) {
        redis.client.get(`v2bilibilicid2dan${cid}`, function (err, reply) {
            if (reply) {
                logger.info(`v2: Bilibili cid2dan ${cid} form redis, IP: ${ip}`);
                res.send(reply);
            }
            else {
                logger.info(`v2: Bilibili cid2dan ${cid} form origin, IP: ${ip}`);

                var dan = {
                    code: 0,
                    danmaku: []
                };

                fetch(`http://comment.bilibili.com/${cid}.xml`).then(
                    response => response.text()
                ).then((data) => {
                    parseString(data, function (err, result) {
                        var danOriginal = result.i.d;
                        for (var i = 0; i < danOriginal.length; i++) {
                            var info = danOriginal[i].$.p.split(',');
                            var type = '';
                            if (info[1] === '4') {
                                type = 2;
                            }
                            else if (info[1] === '5') {
                                type = 1;
                            }
                            else {
                                type = 0;
                            }
                            var danOne = [parseInt(info[0]), type, '#' + addZero(parseInt(info[3]).toString(16), 6), 'bilibili' + info[6], danOriginal[i]._];
                            dan.danmaku.push(danOne);
                        }
                        var sendDan = JSON.stringify(dan);
                        res.send(sendDan);

                        redis.set(`v2bilibilicid2dan${cid}`, sendDan);
                    });
                }
                    ).catch(
                    e => logger.error("Bilibilib Error: getting danmaku", e)
                    );
            }
        });
    }
    else {
        redis.client.get(`v2bilibiliaid2dan${aid}`, function (err, reply) {
            if (reply) {
                logger.info(`v2: Bilibili aid2dan ${aid} form redis, IP: ${ip}`);
                res.send(reply);
            }
            else {
                logger.info(`v2: Bilibili aid2dan ${aid} form origin, IP: ${ip}`);

                var dan = {
                    code: 0,
                    danmaku: []
                };

                fetch(`http://www.bilibili.com/widget/getPageList?aid=${aid}`).then(
                    response => response.json()
                ).then((data) => {
                    fetch(`http://comment.bilibili.com/${data[0].cid}.xml`).then(
                        response => response.text()
                    ).then((data) => {
                        parseString(data, function (err, result) {
                            var danOriginal = result.i.d;
                            for (var i = 0; i < danOriginal.length; i++) {
                                var info = danOriginal[i].$.p.split(',');
                                var type = '';
                                if (info[1] === '4') {
                                    type = 2;
                                }
                                else if (info[1] === '5') {
                                    type = 1;
                                }
                                else {
                                    type = 0;
                                }
                                var danOne = [parseInt(info[0]), type, '#' + addZero(parseInt(info[3]).toString(16), 6), 'bilibili' + info[6], danOriginal[i]._];
                                dan.danmaku.push(danOne);
                            }
                            var sendDan = JSON.stringify(dan);
                            res.send(sendDan);

                            redis.set(`v2bilibiliaid2dan${aid}`, sendDan);
                        });
                    }
                        ).catch(
                        e => logger.error("Bilibilib Error: getting danmaku", e)
                        );
                }
                    ).catch(
                    e => logger.error("Bilibilib Error: getting cid", e)
                    );
            }
        });
    }
};