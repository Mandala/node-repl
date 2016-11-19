/**
 * Node.js REPL Waiting Console
 * REPL test suite
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

const repl = require('../lib/repl');
const run = require('setlist');
const should = require('should');
const StringReadable = require('./string-buffer').StringReadable;
const StringWritable = require('./string-buffer').StringWritable;

// Create stream object
const stream = {
  input: new StringReadable(),
  output: new StringWritable()
}

// Create promise access to stream output
function waitMatch(regexp) {
  return new Promise(function(resolve, reject) {
    stream.output.on('data', function listener(err, data) {
      if (regexp.test(data)) {
        stream.input.removeListener('data', listener);
        resolve();
      }
    });
  });
}
const write = stream.input.write.bind(stream.input);

const globalVar = true;

run(function* () {
  let localVar = true;

  // Default message
  yield eval(repl.yield)(undefined, stream);
  // With input reminder
  yield eval(repl.yield)(true, stream);
  
});


describe('Basic console behavior test', function() {
  it('Should display default welcome message', function() {
    // Get the portion of welcome 
    return waitMatch(/Console/).should.fulfilled();
  });
  it('Should display input reminder', function() {
    write('.done\n');
    return waitMatch(/\$input/).should.fulfilled();
  });
  it('Should mirror the text', function() {
    write('ast\n');
    return waitMatch(/test/).should.fulfilled();
  });
});

/*describe('Test stdout writes', function() {
  let buffer = '';
  it('Should tap the stdout', function() {

  });
});*/
