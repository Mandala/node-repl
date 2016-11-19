
const repl = require('./lib/repl');
const run = require('setlist');

run(function* () {
  let input = 20;
  input = yield repl(($)=>eval($))(input);
  console.log('This should not output', input);
});
