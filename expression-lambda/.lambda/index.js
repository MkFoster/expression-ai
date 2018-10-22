'use strict';
const aws = require('aws-sdk');
const s3Bucket = 'markf-upload';

/**
 * Handle API calls.  The "action" 
 */
exports.handler = (event, context, callback) => {
    try {
        console.log(JSON.stringify(event, null, 4));
    } catch (err) {
        callback(err);
    }
};

function rekCall(uuid) {
    AWS.region = "us-east-1";
    var rekognition = new AWS.Rekognition();
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
    rekognition.detectFaces(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log(data);
            const numFacesDetected = data.FaceDetails.length;
            const emotionData = data.FaceDetails.map(face => face.Emotions);
            var htmlOutput = `Number of Faces Detected: ${numFacesDetected} <br>` +
            `Emotions: ${JSON.stringify(emotionData, null, 4)}`;
            document.querySelector('#aws-output').innerHTML = htmlOutput;
        }
    });
}

