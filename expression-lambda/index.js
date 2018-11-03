'use strict';
const aws = require('aws-sdk');
const { Client } = require('pg');
const client = new Client();
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
                case 'getImageList':
                    data = await getImageList();
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

function analyzeImage(uuid, callback) {
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
    return new Promise(function(resolve, reject) {
        rekognition.detectFaces(params, function (err, data) {
            if (!err) {
                resolve(data);
            } else {
                reject(err);
            }
        });
    });
}

function getImageList() {

}
