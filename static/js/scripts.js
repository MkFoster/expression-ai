const video = document.querySelector('.player');
const canvas = document.querySelector('.monitor');
const main = document.querySelector('.main');
const title = document.querySelector('.title');
const overview = document.querySelector('.overview');
const ctx = canvas.getContext('2d');
const strip = document.querySelector('.strip');
const s3Url = `https://d183zisuhp1c4e.cloudfront.net/`;
const signedUrlEndpoint = `https://mgtoc5ns7i.execute-api.us-east-1.amazonaws.com/sign/aws-presigned-url`;
const expressionAiEndpoint = `https://l153r1gs0i.execute-api.us-east-1.amazonaws.com/prod/expression-ai`;
const s3Bucket = `markf-uploads`;
const okButton = document.querySelector('#ok');
const noButton = document.querySelector('#no');
let faceOutlines;
let vidInterval;

video.addEventListener('canplay', paintToCanvas);

video.addEventListener('play', () => {
    vidInterval = setInterval(detectFaces,2000); 
});

video.addEventListener('ended', () => {
    clearInterval(vidInterval);
});

okButton.addEventListener('click', getVideo);
noButton.addEventListener('click', () => window.location = 'https://www.unsplash.com');

function detectFaces() {
    // use the face detection library to find the face
    faceOutlines = ccv.detect_objects({ "canvas" : (ccv.pre(canvas)),
        "cascade" : cascade,
        "interval" : 5,
        "min_neighbors" : 1 });
    if (faceOutlines.length > 0) {
        takePhoto();
    } 
}

function outlineFaces(faceBox) {
    const topLeftX = faceBox.x;
    const topLeftY = faceBox.y;

    const topRightX = Math.round(topLeftX + (faceBox.width));
    const topRightY = topLeftY;

    const bottomLeftX = topLeftX;
    const bottomLeftY = Math.round(topLeftY + (faceBox.height));

    const bottomRightX = topRightX;
    const bottomRightY = bottomLeftY;

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'purple';
    ctx.beginPath();
    ctx.moveTo(topLeftX, topLeftY);
    ctx.lineTo(topRightX, topRightY);
    ctx.lineTo(bottomRightX, bottomRightY);
    ctx.lineTo(bottomLeftX, bottomRightY);
    ctx.lineTo(topLeftX, topRightY);
    ctx.stroke();
}

function getVideo() {
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(localMediaStream => {
            //canvas(localMediaStream);
            video.srcObject = localMediaStream;
            video.play();
            canvas.style.display = 'block';
            title.style.display = 'none';
            overview.style.display = 'none';
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
        ctx.putImageData(pixels, 0, 0);
        /*if (typeof faceOutlines != 'undefined') {
            for (var i = 0; i < faceOutlines.length; i++) {
                //console.log('face found');
                //console.log(faceOutlines[i]);
                outlineFaces(faceOutlines[i]);
            }
        }*/
    }, 100);
}

function takePhoto() {
    const data = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = data;
    link.setAttribute('download', 'handsome');
    link.innerHTML = `<img src="${data}" alt="Portrait" />`;
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
    let url = `${signedUrlEndpoint}?name=${fileName}&type=${fileType}`;
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
    let s3ImagePath = `expression-ai/${uuid}.jpg`;
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
        analyzeImage(uuid);
    })
    .catch( error => console.log(error));
};

//Calls detectFacesAws API and shows estimated ages of detected faces
function analyzeImage(uuid) {
    const url = `${expressionAiEndpoint}?action=analyzeImage&uuid=${uuid}`;
    fetch(url)
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        console.log(data);
        const numFacesDetected = data.FaceDetails.length;
        const emotionData = data.FaceDetails.map(face => face.Emotions);
        var htmlOutput = `Number of Faces Detected: ${numFacesDetected} <br>` +
        `Emotions: ${JSON.stringify(emotionData, null, 4)}`;
        //document.querySelector('#aws-output').innerHTML = htmlOutput;
        if (typeof emotionData[0] != 'undefined') {
            const happy = emotionData[0].find(emotion => {
                //console.log(emotion);
                //console.log((emotion.Type === `HAPPY`));
                //console.log(emotion.Confidence > 50);
                //console.log((emotion.Type === `HAPPY`) && (emotion.Confidence > 50));
                return (emotion.Type === `HAPPY`) && (emotion.Confidence > 50);
            });
            if (typeof happy != 'undefined') {
                //document.querySelector('#photo').src = `assets/photos/happy.jpg`;
                main.style.backgroundImage=`url(assets/photos/happy/happy.jpg)`;
            } else {
                //document.querySelector('#photo').src = `assets/photos/sad.jpg`;
                main.style.backgroundImage=`url(assets/photos/sad/sad.jpg)`;
            }
        }

    })
    .catch(error => console.log(error)); // an error occurred
}
