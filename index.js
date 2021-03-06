'use strict'

var eos = require('end-of-stream')
var through = require('through2')
var profLabel = process.platform === 'darwin' ? 'profile-1ms' : 'cpu-clock'
var debug = require('debug')('stacks-to-flamegraph')

function Node (name, mapFrames) {
  this.name = name
  this.value = 0
  this.top = 0
  this.children = {}
  this.mapFrames = mapFrames || ((frames, instance) => frames) 
}

Node.prototype.add = function (frames, value, topper, index = 0) {
  frames = this.mapFrames(frames, this)
  
  // stops the base block from not being flush with the flamegraph
  if (frames === false || frames.length === 1 && frames[0] === profLabel) return

  this.value += value
  if (frames && frames.length - index > 0) {
    var head = frames[index]
    var child = this.children[head]

    if (!child) {
      child = new Node(head, this.mapFrames)
      this.children[head] = child
    }

    if (head === topper) child.top += 1

    child.add(frames, value, topper, index + 1)
  }
}

Node.prototype.serialize = function () {
  var res = {
    name: this.name,
    value: this.value,
    top: this.top
  }

  var children = []

  for (var key in this.children) {
    children.push(this.children[key].serialize())
  }

  if (children.length > 0) res.children = children

  return res
}

function Profile (mapFrames) {
  this.samples = new Node('root', mapFrames)
  this.stack = null
  this.name = profLabel
}

Profile.prototype.openStack = function (name) {
  this.stack = []
  this.name = name
}

Profile.prototype.addFrame = function (frame) {
  if (!this.stack) this.stack = []
  frame = frame.trim()
  if (!frame.length) return
  this.stack.unshift(
    frame
      .replace(/^\w+ /, '') // removes the hex address in linux stacks, works in dtrace and v8 prof stacks because first word always has symbols
  )
}

Profile.prototype.closeStack = function () {
  if (this.stack) {
    this.stack.unshift(this.name)
    this.samples.add(this.stack, 1, this.stack[this.stack.length - 1])
  }
  this.stack = []
  this.name = profLabel
}

function stream (mapFrames) {
  var stackOpenRx = /(.+):(.+): ?$/
  var stackCloseRx = /^$/g
  var commentRx = /^#/g
  var profile = new Profile(mapFrames)

  var s = through(function (line, enc, cb) {
    if (commentRx.exec(line)) return cb()
    var matches = stackOpenRx.exec(line)
    if (matches) {
      profile.openStack(matches[2].trim())
      return cb()
    }

    matches = stackCloseRx.exec(line)
    if (matches) {
      profile.closeStack()
      return cb()
    }

    if (!/\[unknown\]/.test(line)) {
      profile.addFrame(line + '')
    }

    cb()
  })

  s.profile = profile

  return s
}

module.exports = function stacksToJsonTree (mapFrames, cb) {
  var s = stream(mapFrames)
  s.on('pipe', function (src) {
    eos(src, function () {
      var samples = s.profile.samples
      samples = samples.children['profile-1ms'] || samples.children['cpu-clock'] || samples
      samples.name = ''
      debug('serializing samples')
      samples = samples.serialize()
      debug('samples serialized')
      cb(null, samples)
    })
  })

  return s
}
