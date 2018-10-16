const video = document.querySelector('.player');
const canvas = document.querySelector('.photo');
const ctx = canvas.getContext('2d');
const strip = document.querySelector('.strip');
const snap = document.querySelector('.snap');
const s3Url = 'https://d183zisuhp1c4e.cloudfront.net/';
const signedUrlEndpoint = 'https://kl3oydpj38.execute-api.us-east-1.amazonaws.com/sign';
const s3Bucket = 'cbipoc'

getVideo();

video.addEventListener('canplay', paintToCanvas);

function getVideo() {
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(localMediaStream => {
            console.log(localMediaStream);
            video.srcObject = localMediaStream;
            video.play();
        })
        .catch(err => console.error(`OH NO!!`, err));
}

function paintToCanvas() {
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    setInterval(() => {
        ctx.drawImage(video, 0, 0, width, height);
        let pixels = ctx.getImageData(0, 0, width, height);
        //pixels = redEffect(pixels);
        //pixels = rgbSplit(pixels);
        //ctx.globalAlpha = 0.1;
        //pixels = greenScreen(pixels);
        ctx.putImageData(pixels, 0, 0);
        //debugger;
    }, 16);
}

function redEffect(pixels) {
    for (let i = 0; i< pixels.data.length; i+=4) {
        pixels.data[i + 0] = pixels.data[i + 0] + 100; //R
        pixels.data[i + 1] = pixels.data[i + 1] - 50;  //G
        pixels.data[i + 2] = pixels.data[i + 2] * 0.5; //B
    }
    return pixels;
}

function rgbSplit(pixels) {
    for (let i = 0; i< pixels.data.length; i+=4) {
        pixels.data[i - 150] = pixels.data[i + 0]; //R
        pixels.data[i + 100] = pixels.data[i + 1]; //G
        pixels.data[i - 150] = pixels.data[i + 2]; //B
    }
    return pixels;
}

function greenScreen(pixels) {
    const levels = {};

    document.querySelectorAll('.rgb input').forEach((input) => {
        levels[input.name] = input.value;
    });

    for (let i = 0; i< pixels.data.length; i+=4) {
        red = pixels.data[i];
        green = pixels.data[i + 1];
        blue = pixels.data[i + 2];
        alpha = pixels.data[i + 3];

        if (red >= levels.rmin
          && green >= levels.gmin
          && blue >= levels.bmin
          && red <= levels.rmax
          && green <= levels.bmax
          && blue <= levels.bmax) {
              pixels.data[i + 3] = 0;
          }
    }
    return pixels;
}

function takePhoto() {
    snap.currentTime = 0;
    snap.play();

    const data = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = data;
    link.setAttribute('download', 'handsome');
    link.innerHTML = `<img src="${data}" alt="Portrait" />`;
    if (strip.firstChild) {
        strip.replaceChild(link, strip.firstChild);
    } else {
        strip.appendChild(link);
    }
    upload(dataURLToBlob(data));
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/* Utility function to convert a canvas to a BLOB */
function dataURLToBlob(dataURL) {
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];

        return new Blob([raw], {type: contentType});
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
}

function blobToFile(theBlob, fileName) {
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
}

function getSignedUrlPromise(fileName, fileType) {
    let url = `${signedUrlEndpoint}/signedurl?name=${fileName}&type=${fileType}`;
    return fetch(url)
        .then(
            response => response.json() // if the response is a JSON object
        ).catch(
            error => console.log(error) // Handle the error response object
        );
}

// This will upload the file after having read it
async function upload(imageBlob) {

    //Upload the image
    //showModal('Uploading and analyzing image...');
    let file = blobToFile(imageBlob, 'inputimage.jpg');
    let fileType = 'image/jpeg';
    let uuid = uuidv4();
    let s3ImagePath = `upload/${uuid}.jpg`;
    const presignedUrlObj = await getSignedUrlPromise(s3ImagePath, fileType);
    const s3ImageUrl = s3Url + s3ImagePath;
    const s3Upload = await fetch(presignedUrlObj.url, {
        method: 'PUT',
        body: file,
        headers: {
            "Content-Type": fileType
        }
    })
    .then((response) => {
        detectFacesAws(s3ImagePath);
    })
    .catch( error => console.log(error));
    // Post data for prediction
    /*
    fetch(predictionEndpoint, { // Your POST endpoint
        method: 'POST',
        headers: {
            "Prediction-Key": "5e78a8e3a0f44c8ca0c3126df7ba40b4",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({'Url': s3ImageUrl})
    })
    .then(response => response.json())
    .then(
        success => {
            jsonBox = document.querySelector('#json');
            jsonBox.innerHTML = JSON.stringify(success, undefined, 4);
            predictionData = success.predictions;
            //Get the new filter list of predictions
            const filteredPredictionData = getFilteredPredictionData();
            //Draw the legend
            drawLegend(filteredPredictionData);
            //Draw predictions on canvas
            drawPredictions(filteredPredictionData);
            //Switch the prediction page
            showPage('#page-prediction');
            //Hide the modal
            hideModal();
        } // Handle the success response object
    ).catch(
        error => console.log(error) // Handle the error response object
    );*/
};

//Calls detectFacesAws API and shows estimated ages of detected faces
function detectFacesAws(s3ImagePath) {
    AnonLog();
    AWS.region = "us-east-1";
    var rekognition = new AWS.Rekognition();
    var params = {
        Image: {
            "S3Object": {
                "Bucket": s3Bucket,
                "Name": s3ImagePath
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

//Provides anonymous log on to AWS services
function AnonLog() {
    // Configure the credentials provider to use your identity pool
    AWS.config.region = 'us-east-1'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-east-1:26a5d751-6c47-4616-aad7-2367cd6aa5fa',
    });
    // Make the call to obtain credentials
    AWS.config.credentials.get(function () {
        // Credentials will be available when this function is called.
        var accessKeyId = AWS.config.credentials.accessKeyId;
        var secretAccessKey = AWS.config.credentials.secretAccessKey;
        var sessionToken = AWS.config.credentials.sessionToken;
    });
}


