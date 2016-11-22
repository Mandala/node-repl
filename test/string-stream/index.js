/**
 * Node.js REPL Waiting Console
 * Simple stream module for tapping REPL input/output
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

'use strict'

const Writable = require('stream').Writable
const Readable = require('stream').Readable

class StringWritable extends Writable {
  constructor (options) {
    // Set default encoding
    options = options || {}
    options.encoding = 'utf8'
    // Pass options to base class
    super(options)
    // Create simple string buffer
    this._buffer = ''
    // Add new listener handler
    this.on('newListener', function(event, listener) {
      if (event === 'data') {
        // Flush all data to receiver
        listener(null, this.read())
      }
    })
  }

  // Store chunk from internal buffer to string buffer
  _write (chunk, encoding, callback) {
    this._buffer += chunk.toString()
    if (this.emit('data', null, this._buffer)) {
      // Flush buffer if data event listened
      this.flush()
    }
    if (typeof callback === 'function') callback()
  }

  flush () {
    this._buffer = ''
  }

  read () {
    // Copy string to temporary buffer
    let buf = this._buffer
    // Empty current buffer
    this.flush()
    // Return copied buffer
    return buf
  }
}

class StringReadable extends Readable {
  constructor (options) {
    // Set default encoding
    options = options || {}
    options.encoding = 'utf8'
    // Call parent constructor
    super(options)
  }

  _read () {
    
  }

  write (string) {
    // Directly push input to internal buffer
    this.push(string)
  }
}

module.exports = {
  StringWritable: StringWritable,
  StringReadable: StringReadable
}
