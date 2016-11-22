/**
 * Node.js REPL Waiting Console
 * REPL test suite
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

const repl = require('../lib/repl')
const run = require('setlist')
const should = require('should')
const StringReadable = require('./string-stream').StringReadable
const StringWritable = require('./string-stream').StringWritable

// Create input output stream
const input = new StringReadable()
const output = new StringWritable()

// Reset stream to stdin/stdout
repl.stream()
// Configure REPL to use our custom stream instead of stdin/stdout
repl.stream({input: input, output: output})

describe('REPL input/output test', function () {
  // Consume I/O stream so it won't affects another test case
  beforeEach(function () {
    input.read()
    output.removeAllListeners('data')
    output.read()
  })

  // Kill the REPL by using done method
  afterEach(function () {
    repl.stop()
  })

  it('Should display default welcome message', function () {
    // Call REPL
    repl(($)=>eval($))()
    // Get the portion of welcome
    return isMatch(/Console/).should.fulfilled()
  })
  it('Should display input reminder', function () {
    // Call REPL with input
    repl(($)=>eval($))(true)
    // Get the input message
    return isMatch(/\$input/).should.fulfilled()
  })
  it('Should output value from variable', function () {
    // Create new variable
    var outputValue = true
    // Call REPL
    repl(($)=>eval($))()
    // Give command
    input.write('outputValue\n')
    // Get value return
    return isMatch(/true/).should.fulfilled()
  })
  it('Should throw error to stdout', function () {
    // Call REPL
    repl(($)=>eval($))()
    // Write something
    input.write('objectNotDefined\n')
    // Get error message
    return isMatch(/Error/).should.fulfilled()
  })
  it('Should throw parse error', function () {
    // Call REPL
    repl(($)=>eval($))()
    // Intentionally bungle input
    input.write('\\\n')
    // Get warning message
    return isMatch(/Error/).should.fulfilled()
  })
  it('Should warn on multiple REPL calls', function () {
    // Call REPL
    repl(($)=>eval($))()
    // Call REPL again
    repl(($)=>eval($))()
    // Get warning message
    return isMatch(/WARN/).should.fulfilled()
  })
  it('Should recover error (Not working on Node 4)', function () {
    // Call REPL
    repl(($)=>eval($))()
    // Intentionally error'd output
    input.write('function a () {\n')
    // Get ... output/Error (node 4)
    var nodeVer = parseInt(/^v([0-9])+/.exec(process.version)[1])
    if (nodeVer < 6) {
      return isMatch(/Error/).should.fulfilled()
    } else {
      return isMatch(/\.\.\./).should.fulfilled()
    }
  })
  it('Should .done without eval value', function () {
    return run(function* () {
      // Fill input
      input.write('.done\n')
      // Return the value
      return yield repl(($)=>eval($))()
    }).should.be.fulfilled()
  })
  it('Should .done with correct eval', function () {
    return run(function* () {
      // Fill input
      input.write('.done 2 + 2\n')
      // Return the value
      return yield repl(($)=>eval($))()
    }).should.be.fulfilledWith(4)
  })
  it('Should .return with correct value', function () {
    return run(function* () {
      // Fill input
      input.write('.return\n')
      // Return the value
      return yield repl(($)=>eval($))(true)
    }).should.be.fulfilledWith(true)
  })
  describe('Exit behavior on production environment', function () {
    var exit = process.exit
    var nodeEnv = process.env.NODE_ENV
    // Override node env
    before(function () {
      process.env.NODE_ENV = 'production'
    })
    // Restore processes after test
    after(function () {
      process.env.NODE_ENV = nodeEnv
      process.exit = exit
    })
    it('Should exit on REPL execution', function () {
      return new Promise(function (resolve, reject) {
        process.exit = resolve
        repl(($)=>eval($))().catch(reject)
      }).should.fulfilledWith(-1)
    })
  })
  describe('Exit behavior on .exit keyword', function () {
    var exit = process.exit
    // Restore processes after test
    after(function () {
      process.exit = exit
    })
    it('Should exit on keyword invoke', function () {
      return new Promise(function (resolve, reject) {
        process.exit = resolve
        input.write('.exit\n')
        repl(($)=>eval($))().catch(reject)
      }).should.fulfilled()
    })
  })
})

describe('Worker functional test', function () {
  // Consume I/O stream so it won't affects another test case
  beforeEach(function () {
    input.read()
    output.removeAllListeners('data')
    output.read()
    repl(($)=>eval($))()
  })

  // Kill the REPL by using done method
  afterEach(function () {
    repl.stop()
  })

  it('Should be able to declare variable', function () {
    return run(function* () {
      var r = yield repl.worker('var x = true')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to declare and resolve promise', function () {
    return run(function* () {
      var r = yield repl.worker('var x = Promise.resolve(true)')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to assign variable', function () {
    return run(function* () {
      yield repl.worker('var x')
      var r = yield repl.worker('x = true')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to assign and resolve promise', function () {
    return run(function* () {
      yield repl.worker('var x')
      var r = yield repl.worker('x = Promise.resolve(true)')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to return value', function () {
    return run(function* () {
      var r = yield repl.worker('true')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to return resolved promise', function () {
    return run(function* () {
      var r = yield repl.worker('Promise.resolve(true)')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should be able to define class', function () {
    return run(function* () {
      yield repl.worker('class test {}')
      var r = yield repl.worker('test.name')
      r.value.should.equal('test')
    }).should.be.fulfilled()
  })
  it('Should writeback underscore on worker return', function () {
    return run(function* () {
      yield repl.worker('true')
      var r = yield repl.worker('_')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should not writeback underscore when overriden', function () {
    return run(function* () {
      yield repl.worker('_ = true')
      yield repl.worker('false')
      var r = yield repl.worker('_')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
  it('Should disable promise resolution on .disable', function() {
    return run(function* () {
      input.write('.disable\n')
      var r = yield repl.worker('Promise.resolve(true)')
      r.value.should.be.a.Promise()
    }).should.be.fulfilled()
  })
  it('Should re-enable promise resolution on .enable', function() {
    return run(function* () {
      input.write('.disable\n')
      input.write('.enable\n')
      var r = yield repl.worker('Promise.resolve(true)')
      r.value.should.equal(true)
    }).should.be.fulfilled()
  })
})

// Create regular expression hook to REPL output
function isMatch(regexp) {
  return new Promise(function (resolve, reject) {
    var timeout = setTimeout(
      ()=>reject(new Error('Regexp match not found')), 1000
    )
    output.on('data', function listener (err, data) {
      if (regexp.test(data)) {
        clearTimeout(timeout)
        resolve()
      }
    })
  })
}
