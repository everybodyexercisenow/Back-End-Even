const tf = require('@tensorflow/tfjs-node-gpu')
const posenet = require('@tensorflow-models/posenet')
const sizeOf = require('image-size')
const { createCanvas, loadImage } = require('canvas')
const sleep = require('system-sleep')
const fs = require('fs')

// Preparations: load the network

var net = null
posenet.load().then(function (model) {
    net = model
})

// Helper functions

function getCropCoords (width, height) {
    let source_center_x = width / 2
    let source_center_y = height / 2

    let source_side_length = Math.min(width, height)
    let source_x = source_center_x - source_side_length / 2
    let source_y = source_center_y - source_side_length / 2

    return {
        "sx": source_x,
        "sy": source_y,
        "sw": source_side_length,
        "sh": source_side_length
    }
}

// Exported methods

const inputImageSize = 200

module.exports = {
    inputImageSize: inputImageSize,
    predict: async function (path) {
        const imageScaleFactor = 0.5
        const flipHorizontal = false
        const outputStride = 16

        const size = sizeOf(path)
        const { width, height } = size

        const cropCoords = getCropCoords(width, height)

        const canvas = createCanvas(cropCoords['sw'], cropCoords['sh'])
        const ctx = canvas.getContext('2d')
        
        const image = await loadImage(path)
        ctx.drawImage(image, cropCoords['sx'], cropCoords['sy'],
                      cropCoords['sw'], cropCoords['sh'],
                      0, 0, inputImageSize, inputImageSize)

        while(net == null) {
            sleep(100)
        }

        const pose = await net.estimateSinglePose(canvas, imageScaleFactor, flipHorizontal, outputStride)
        
        return pose
    }
}
