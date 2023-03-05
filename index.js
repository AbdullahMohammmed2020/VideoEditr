//Declare Variables
const express = require('express')
const multer = require('multer')
const fs = require('fs')
const sizeOf = require('image-size')
const videoshow = require('videoshow')
const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const sharp = require('sharp')
var Ffmpeg = require('ffmpeg')
const PORT = process.env.PORT || 5000
var dir = 'public';
var subDirectory = 'public/uploads';
var sub2Directory = 'public/ed_images'
const app = express()

//Check If The Dir Is Available
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);

    fs.mkdirSync(subDirectory);
    fs.mkdirSync(sub2Directory);
}

//Storage For Uploaded Files
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './public/uploads');
    },
    filename: function (req, file, callback) {
        if (file.originalname.length > 6)
            callback(null, file.fieldname + '-' + Date.now() + file.originalname.substr(file.originalname.length - 6, file.originalname.length));
        else
            callback(null, file.fieldname + '-' + Date.now() + file.originalname);

    }
});

//Var For Upload Files
var upload = multer({ storage: storage })

//Design Resolutions
////snapchat
// SnapchatAd = [1080, 1920]
// ////facebook
// FacebookAd = [1200, 628]
// ////tiktok
// TiktokAd = [540, 960]
FacebookVideo = [1080, 1080]

//App Use
app.use(express.static('public'))

//App Get
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

//Crop Function
let crop = function (img, w, h, t, l, outFile) {
    sharp(img).extract({
        width: w,
        height: h,
        left: l,
        top: t
    }).toFile(outFile, function (err) {
        console.log(err)
    })
}

//Resize Function
let resize = function (img, w, h, outFile) {
    sharp(img)
        .resize(w, h)
        .toFile(outFile, function (err) {
            console.log(err)
        })
}

//App Post
app.post('/videoshow', upload.fields([{ name: 'images', maxCount: 100 }, { name: 'audio', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
    //Declare Variables
    var to = req.body.to
    var audio = req.files.audio[0]
    var text1 = req.body.text1
    var text2 = req.body.text2
    var seconds = req.body.num
    var num = parseInt(seconds)
    var images = []
    var ed_images = []
    var videoOptions = {
        fps: 25,
        loop: num, // seconds
        transition: true,
        transitionDuration: 1, // seconds
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '640x?',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p'
    }
    //Push Uploaded Images To Image Array
    req.files.images.forEach(file => {
        images.push(`${__dirname}/${subDirectory}/${file.filename}`)
    })

    //Resize Every Image Or Crop It And Push It To Ed Image Array
    req.files.images.forEach(image => {
        let imgDIM = [sizeOf(image.path).width, sizeOf(image.path).height]

        if (to == 'Facebook Video') {
            if (imgDIM[0] >= FacebookVideo[0] && imgDIM[1] >= FacebookVideo[1]) {
                crop(image.path, FacebookVideo[0], FacebookVideo[1], ((imgDIM[1] - FacebookVideo[1]) / 2), ((imgDIM[0] - FacebookVideo[0]) / 2), `public/ed_images/${image.originalname}`)
            }
            else if (imgDIM[0] <= FacebookVideo[0] && imgDIM[1] <= FacebookVideo[1]) {
                resize(image.path, FacebookVideo[0], FacebookVideo[1], `public/ed_images/${image.originalname}`)
            }
        }
        ed_images.push(`${__dirname}/public/ed_images/${image.originalname}`)
    })

    //Create The VideoShow
    videoshow(ed_images, videoOptions)
        .audio(audio.path)
        .save('video.mp4')
        .on('start', function (command) {
            console.log('ffmpeg process started:', command)
        })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err)
            console.error('ffmpeg stderr:', stderr)
        })
        .on('end', function (output) {
            console.error('Video created in:', output)
            ffmpeg('./video.mp4')
                .videoFilters({
                    filter: 'drawtext',
                    options: {
                        fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
                        text: req.body.text1,
                        fontsize: 30,
                        box: 1,
                        boxcolor: 'black',
                        boxborderw: 10,
                        fontcolor: 'white',
                        x: '(main_w/2-text_w/2)',
                        y: 20,
                        shadowcolor: 'black',
                        shadowx: 2,
                        shadowy: 2
                    }
                },
                    {
                        filter: 'drawtext',
                        options: {
                            fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
                            text: req.body.text2,
                            fontsize: 30,
                            box: 1,
                            boxcolor: 'black',
                            boxborderw: 10,
                            fontcolor: 'white',
                            x: '(main_w/2-text_w/2)',
                            y: 600,
                            shadowcolor: 'black',
                            shadowx: 2,
                            shadowy: 2
                        }
                    }
                )
                .on('end', function () {
                    console.log('file has been converted succesfully');
                    res.download('./out.mp4', (err) => {
                        if (err) throw err
                        fs.unlinkSync('./video.mp4')
                        fs.unlinkSync('./out.mp4')
                    });
                })
                .on('error', function (err) {
                    console.log('an error happened: ' + err.message);
                })
                .save('./out.mp4');
        })
})
// app.post('/videoshow', upload.fields([{ name: 'images', maxCount: 100 }, { name: 'audio', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
//     //Declare Variables
//     var to = req.body.to
//     var y = 0
//     var audio = req.files.audio[0]
//     var text1 = req.body.text1
//     var text2 = req.body.text2
//     var seconds = req.body.num
//     var num = parseInt(seconds)
//     var images = []
//     var ed_images = []
//     var videoOptions = {
//         fps: 25,
//         loop: num, // seconds
//         transition: true,
//         transitionDuration: 1, // seconds
//         videoBitrate: 1024,
//         videoCodec: 'libx264',
//         size: '640x?',
//         audioBitrate: '128k',
//         audioChannels: 2,
//         format: 'mp4',
//         pixelFormat: 'yuv420p'
//     }
//     //Push Uploaded Images To Image Array
//     req.files.images.forEach(file => {
//         images.push(`${__dirname}/${subDirectory}/${file.filename}`)
//     })

//     //Resize Every Image Or Crop It And Push It To Ed Image Array
//     req.files.images.forEach(image => {
//         let imgDIM = [sizeOf(image.path).width, sizeOf(image.path).height]

//         if (to == 'FaceBook Ad') {
//             if (imgDIM[0] >= FacebookAd[0] && imgDIM[1] >= FacebookAd[1]) {
//                 crop(image.path, FacebookAd[0], FacebookAd[1], ((imgDIM[1] - FacebookAd[1]) / 2), ((imgDIM[0] - FacebookAd[0]) / 2), `public/ed_images/${image.originalname}`)
//             }
//             else if (imgDIM[0] <= FacebookAd[0] && imgDIM[1] <= FacebookAd[1]) {
//                 resize(image.path, FacebookAd[0], FacebookAd[1], `public/ed_images/${image.originalname}`)
//             }
//         }
//         else if (to == 'TikTok Ad') {
//             if (imgDIM[0] >= TiktokAd[0] && imgDIM[1] >= TiktokAd[1]) {
//                 crop(image.path, TiktokAd[0], TiktokAd[1], ((imgDIM[1] - TiktokAd[1]) / 2), ((imgDIM[0] - TiktokAd[0]) / 2), `public/ed_images/${image.originalname}`)
//             }
//             else if (imgDIM[0] <= TiktokAd[0] && imgDIM[1] <= TiktokAd[1]) {
//                 resize(image.path, TiktokAd[0], TiktokAd[1], `public/ed_images/${image.originalname}`)
//             }
//         }
//         else if (to == 'SnapChat Ad') {
//             if (imgDIM[0] >= SnapchatAd[0] && imgDIM[1] >= SnapchatAd[1]) {
//                 crop(image.path, SnapchatAd[0], SnapchatAd[1], ((imgDIM[1] - SnapchatAd[1]) / 2), ((imgDIM[0] - SnapchatAd[0]) / 2), `public/ed_images/${image.originalname}`)
//             }
//             else if (imgDIM[0] <= SnapchatAd[0] && imgDIM[1] <= SnapchatAd[1]) {
//                 resize(image.path, SnapchatAd[0], SnapchatAd[1], `public/ed_images/${image.originalname}`)
//             }
//         }
//         ed_images.push(`${__dirname}/public/ed_images/${image.originalname}`)
//     })

//     if (to == 'SnapChat Ad') {
//         y = 1920 - 340
//     }

//     //Create The VideoShow
//     videoshow(ed_images, videoOptions)
//         .audio(audio.path)
//         .save('video.mp4')
//         .on('start', function (command) {
//             console.log('ffmpeg process started:', command)
//         })
//         .on('error', function (err, stdout, stderr) {
//             console.error('Error:', err)
//             console.error('ffmpeg stderr:', stderr)
//         })
//         .on('end', function (output) {
//             console.error('Video created in:', output)
//             ffmpeg('./video.mp4')
//                 .videoFilters({
//                     filter: 'drawtext',
//                     options: {
//                         fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
//                         text: req.body.text1,
//                         fontsize: 30,
//                         box: 1,
//                         boxcolor: 'black',
//                         boxborderw: 10,
//                         fontcolor: 'white',
//                         x: '(main_w/2-text_w/2)',
//                         y: 20,
//                         shadowcolor: 'black',
//                         shadowx: 2,
//                         shadowy: 2
//                     }
//                 },
//                     {
//                         filter: 'drawtext',
//                         options: {
//                             fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
//                             text: req.body.text2,
//                             fontsize: 30,
//                             box: 1,
//                             boxcolor: 'black',
//                             boxborderw: 10,
//                             fontcolor: 'white',
//                             x: '(main_w/2-text_w/2)',
//                             y: y,
//                             shadowcolor: 'black',
//                             shadowx: 2,
//                             shadowy: 2
//                         }
//                     }
//                 )
//                 .on('end', function () {
//                     console.log('file has been converted succesfully');
//                     res.download('./out.mp4', (err) => {
//                         if (err) throw err
//                         fs.unlinkSync('./video.mp4')
//                         fs.unlinkSync('./out.mp4')
//                     });
//                 })
//                 .on('error', function (err) {
//                     console.log('an error happened: ' + err.message);
//                 })
//                 .save('./out.mp4');
//         })
// })

//App Listen
app.listen(PORT, () => {
    console.log(`App Is Listening To Port ${PORT}`)
})