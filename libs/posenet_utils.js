const tf = require('@tensorflow/tfjs-node-gpu')
const posenet = require('@tensorflow-models/posenet')
const sizeOf = require('image-size')
const { createCanvas, loadImage } = require('canvas')
const sleep = require('system-sleep')

var net = null
posenet.load().then(function (model) {
    net = model
})

module.exports = {
    predict: async function (path) {
        const imageScaleFactor = 0.5
        const flipHorizontal = false
        const outputStride = 16

        const size = sizeOf(path)
        const { width, height } = size

        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        
        const image = await loadImage(path)
        ctx.drawImage(image, 0, 0, width, height)

        while(net == null) {
            sleep(100)
        }

        const pose = await net.estimateSinglePose(canvas, imageScaleFactor, flipHorizontal, outputStride)
        
        return pose
    }
}
