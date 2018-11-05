'use strict';
const aws = require('aws-sdk');
const _ = require('lodash');
const { Client } = require('pg');
const s3Bucket = 'markf-uploads';

/**
 * Handle API calls.  The "action" 
 */
exports.handler = async (event, context, callback) => {
    try {
        console.log(JSON.stringify(event, null, 4));
        let data;
        if ((typeof event.queryStringParameters != `undefined`) && (event.queryStringParameters != null) && 
          (typeof event.queryStringParameters.action != `undefined`) && (event.queryStringParameters.action != null)) {
            switch (event.queryStringParameters.action) {
                case 'analyzeImage':
                    if ((typeof event.queryStringParameters.uuid != `undefined`) && (event.queryStringParameters.uuid != null)) {
                        data = await analyzeImage(event.queryStringParameters.uuid, callback);
                    }
                    break;
                case 'pingDb':
                    data = await pingDb();
                    break;
            }
            const response = {
                "isBase64Encoded": false,
                "statusCode": 200,
                "headers": {
                    "content-type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": JSON.stringify(data)
            };
            callback(null, response);
        }
    } catch (err) {
        callback(err);
    }
};

async function analyzeImage(uuid, callback) {
    aws.region = "us-east-1";
    var rekognition = new aws.Rekognition();
    var params = {
        Image: {
            "S3Object": {
                "Bucket": s3Bucket,
                "Name": `expression-ai/${uuid}.jpg`
            }
        },
        "Attributes": [
            "ALL"
        ]
    };
    console.log(params);
    return new Promise(async function(resolve, reject) {
        rekognition.detectFaces(params, async function (err, faceData) {
            if (!err) {
                faceData.dominantEmotion = getDominantEmotion(faceData);
                if (faceData.dominantEmotion) {
                    faceData.imageList = await getImageList(faceData.dominantEmotion.type);
                } else {
                    faceData.imageList = null;
                }
                resolve(faceData);
            } else {
                reject(err);
            }
        });
    });
}

async function pingDb() {
    return new Promise(async function(resolve, reject) {
        const client = new Client();
        client.on('error', e => {
            console.log(e);
        });
        await client.connect();
        const res = await client.query('select testdata from mktest;');
        console.log(res.rows[0].testdata);
        const pong = (_.get(res, 'rows[0].testdata') == `myteststring`);
        await client.end();
        if (pong) {
            resolve({
                "response": "Pong!"
            });
        } else {
            reject('Failed to ping DB');
        }
    });
}

async function getImageList(emotion) {
    return new Promise(async function(resolve, reject) {
        try {
            const client = new Client();
            client.on('error', e => {
                console.log(e);
            });
            await client.connect();
            console.log('Connected to DB');
            const res = await client.query(`select filename, photographer_id, photographer_name, emotion from image where emotion = $1`, [emotion]);
            console.log('Got query result');
            const imageList = _.cloneDeep(res.rows);
            console.log(imageList);
            await client.end();
            resolve(imageList);
        } catch (err) {
            console.log(err);
            reject('Failed to get image list.');
        }
    });
}

function getDominantEmotion(faceData) {
    if (_.get(faceData, 'FaceDetails[0]')){
        const emotionTotals = {};
        for (const face of faceData.FaceDetails) {
            if (_.get(face, 'Emotions[0]')) {
                for (const emotion of face.Emotions) {
                    if (typeof emotionTotals[emotion.Type] == 'undefined') {
                        emotionTotals[emotion.Type] = 0;
                    }
                    emotionTotals[emotion.Type] = emotionTotals[emotion.Type] + emotion.Confidence;
                }
            }
        }
        const maxEmotion = {
            'type': 'happy',
            'total': 0
        };
        for (const i in emotionTotals) {
            if (emotionTotals[i] >= maxEmotion.total) {
                maxEmotion.type = i.toLowerCase();
                maxEmotion.total = emotionTotals[i];
            }
        }
        return maxEmotion;
    } else {
        return false;
    }
}