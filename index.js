global.XMLHttpRequest = require("xhr2")

const express = require('express')
const app = express()
const fs = require('fs')
const multer = require('multer')
const posenetUtils = require('./libs/posenet_utils')

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
    res.send('hello world')
})

const upload = multer({ dest: 'uploads/pose/' })
app.post('/pose', upload.single('image'), function (req, res) {
    posenetUtils.predict(req.file.path).then(function (pose) {
        pose['input_filename'] = req.file.originalname
        fs.unlinkSync(req.file.path)
	    res.send(JSON.stringify(pose))
    })
})

// listen on port
var port = process.env.port || 8080
app.listen(port, () =>
    console.log('Listening on port ' + port + '!'),
)
