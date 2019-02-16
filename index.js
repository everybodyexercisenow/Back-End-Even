global.XMLHttpRequest = require("xhr2")

const express = require('express')
const app = express()
const fs = require('fs')
const multer = require('multer')
const posenetUtils = require('./libs/posenet_utils')
const path = require('path')
const extractFrame = require('ffmpeg-extract-frame')

app.get('/', function (req, res) {
    res.send('Hello World!')
})

app.get('/catalog/:category', function (req, res) {
    var catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'))
    res.send(JSON.stringify(catalog[req.params.category]))
})

app.get('/exercise/icon/:id', function (req, res) {
    const tempFilename = 'uploads/screenshot-' + req.params.id + '.jpg'
    const tempFilePath = path.join(__dirname, tempFilename) 
    extractFrame({
        input: 'data/demos/' + req.params.id + '.mp4',
        output: tempFilename,
        offset: 0
    }).then(function() {
        res.sendFile(tempFilePath, function () {
            fs.unlinkSync(tempFilePath)
        })
    })
})

app.get('/exercise/video/:id', function (req, res) {
    res.sendFile(path.join(__dirname, 'data/demos/' + req.params.id + '.mp4'))
})

app.get('/exercise/pose/:id', function (req, res) {
    var poses = JSON.parse(fs.readFileSync('data/poses.json', 'utf8'))
    res.send(JSON.stringify(poses[req.params.id]))
})

const upload = multer({ dest: 'uploads/pose/' })
app.post('/pose', upload.single('image'), function (req, res) {
    posenetUtils.predict(req.file.path).then(function (pose) {
        pose['input_filename'] = req.file.originalname
        pose['keypoints'] = pose['keypoints'].reduce(function (dict, item) {
            dict[item['part']] = [
                item['position']['x'] / posenetUtils.inputImageSize, 
                item['position']['y'] / posenetUtils.inputImageSize
            ]
            return dict
        }, {})
        delete pose['score']
        fs.unlinkSync(req.file.path)
	    res.send(JSON.stringify(pose))
    })
})

// listen on port
var port = process.env.port || 8080
app.listen(port, () =>
    console.log('Listening on port ' + port + '!'),
)
