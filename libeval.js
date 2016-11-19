
module.exports = libeval;

function libeval($ev) {
  // Create long lived eval runner
  let $eval = $ev(`(function() {
    // Initialize evaluator generator
    var $Evaluator = (function* () {
      var $cmd;
      while(true) {
        try {
          $cmd = yield { value: eval($cmd) };
        } catch(err) {
          $cmd = yield { error: err };
        }
      }
    })();
    $Evaluator.next();
    // Return simple eval function
    return function $eval(cmd) {
      var r = $Evaluator.next(cmd).value;
      if (r.error) {
        throw r.error;
      } else {
        return r.value;
      }
    }
  })()`);
  console.log($eval('var x = 1'));
  console.log($eval('x'));
  console.log($eval('abc'));
}