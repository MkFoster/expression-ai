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
        if (data.dominantEmotion && (data.imageList.length > 0)) {
            main.style.backgroundImage=`url(assets/photos/${data.dominantEmotion.type}/${data.imageList[0].filename})`;
            setPhotoCreditHtml(data.imageList[0].photographer_id, data.imageList[0].photographer_name);
        }
    })
    .catch(error => console.log(error)); // an error occurred
}

function setPhotoCreditHtml(photographerId, photographerName) {
    const photoCredit = `<a  style="background-color:black;color:white;text-decoration:none;padding:4px 6px;font-family:-apple-system, BlinkMacSystemFont, &quot;San Francisco&quot;, &quot;Helvetica Neue&quot;, Helvetica, Ubuntu, Roboto, Noto, &quot;Segoe UI&quot;, Arial, sans-serif;font-size:12px;font-weight:bold;line-height:1.2;display:inline-block;border-radius:3px" 
        href="https://unsplash.com/@${photographerId}?utm_medium=referral&amp;utm_campaign=photographer-credit&amp;utm_content=creditBadge" 
        target="_blank" 
        rel="noopener noreferrer" 
        title="Download free do whatever you want high-resolution photos from ${photographerName}">

        <span style="display:inline-block;padding:2px 3px">
            <svg xmlns="http://www.w3.org/2000/svg" style="height:12px;width:auto;position:relative;vertical-align:middle;top:-1px;fill:white" viewBox="0 0 32 32">
                <title>unsplash-logo</title>
                <path d="M20.8 18.1c0 2.7-2.2 4.8-4.8 4.8s-4.8-2.1-4.8-4.8c0-2.7 2.2-4.8 4.8-4.8 2.7.1 4.8 2.2 4.8 4.8zm11.2-7.4v14.9c0 2.3-1.9 4.3-4.3 4.3h-23.4c-2.4 0-4.3-1.9-4.3-4.3v-15c0-2.3 1.9-4.3 4.3-4.3h3.7l.8-2.3c.4-1.1 1.7-2 2.9-2h8.6c1.2 0 2.5.9 2.9 2l.8 2.4h3.7c2.4 0 4.3 1.9 4.3 4.3zm-8.6 7.5c0-4.1-3.3-7.5-7.5-7.5-4.1 0-7.5 3.4-7.5 7.5s3.3 7.5 7.5 7.5c4.2-.1 7.5-3.4 7.5-7.5z">
                </path>
            </svg>
        </span>
        <span style="display:inline-block;padding:2px 3px">
            ${photographerName}
        </span>
    </a>`;
    document.querySelector('.photo-credit').innerHTML = photoCredit;
}