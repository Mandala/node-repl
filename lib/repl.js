/**
 * Node.js REPL Waiting Console
 * Main library file
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

const REPL = require('repl');
const run = require('setlist');
const lo = require('lodash');
const esprima = require('esprima');

// Define function mapping
module.exports = repl;
// Expose debug stream and worker for testing
repl.stream = stream;
repl.worker = worker;
// Set default i/o to stdin and stdout
repl._input = process.stdin;
repl._output = process.stdout;

// Start new REPL session by passing eval function ($)=>eval($)
function repl($eval) {
  return (input)=>start($eval, input);
}

function start($eval, value) {
  if (lo.isFunction(repl._eval)) {
    // Inform user that they should not call more than one time when REPL is
    // running
    write('WARN: Another call to REPL console detected, ignoring.');
    return;
  }
  // Create new long-running evaluator
  repl._eval = $eval(`(function($input) {
    // Initialize evaluator generator
    var $Evaluator = (function* () {
      var $Evaluator, $command, _;
      while(true) {
        try {
          $command = yield { value: eval($command) };
        } catch(err) {
          $command = yield { error: err };
        }
      }
    })();
    $Evaluator.next();
    // Return simple eval function
    return function $eval(cmd, stop) {
      if (stop === true) {
        $Evaluator.return();
        return true;
      }
      var r = $Evaluator.next(cmd).value;
      if (r.error) {
        throw r.error;
      } else {
        return r.value;
      }
    }
  })`)(value);
  // Give greetings message to user
  write('Node.js RE-PL Development Console');
  write('Copyright (c) 2016 Fadhli Dzil Ikram\n');
  write('Type .help to show available REPL options.');
  if (!lo.isUndefined(value)) {
    write('\nInput value available, you can access them with $input');
  }
  // Setup REPLServer
  let server = REPL.start({
    eval: run.callbackify(worker),
    input: repl._input,
    output: repl._output
  });
  server.defineCommand('done', {
    help: 'Run optional evaluated code as return and continue code execution',
    action: function(toEval) {
      if (toEval.length > 0) {
        stop(repl._eval(toEval));
      } else {
        stop();
      }
      this.close();
    }
  });
  server.defineCommand('return', {
    help: 'Return last input value and continue code execution',
    action: function() {
      stop(repl._eval('$input'));
      this.close();
    }
  });
  // Return promise to user
  return new Promise(function(resolve) {
    repl._resolve = resolve;
  });
}

function* worker(raw) {
  let tasks, result;

  try {
    tasks = parser(raw);
  } catch(err) {
    if ('Recoverable' in REPL && isRecoverable(err)) {
      throw new REPL.Recoverable(err);
    } else {
      throw err;
    }
  }

  // Run parsed tasks
  for (let task of tasks) {
    // Declare new variable
    if (task.declare) {
      repl._eval(task.declare);
    }
    // Run command asynchronously
    result = yield repl._eval(task.command);
    // Return yielded result if available
    if (task.yield) {
      assign(task.yield, result);
    }
  }

  // Writeback last result
  assign('_', result);
  // Return last result to console
  return result;
}

function assign(name, value) {
  repl._eval('(function(value) { name = value })')(value);
}

function parser(raw) {
  let parsed = esprima.parse(raw, { range: true });
  let tasks = [];
  // Iterate body
  for (let line of parsed.body) {
    if (line.type === 'VariableDeclaration') {
      for (let decl of line.declarations) {
        tasks.push({
          declare: line.kind + ' ' + decl.id.name,
          command: raw.substring.apply(raw, decl.range),
          yield: decl.id.name
        })
      }
    } else if (line.type === 'ExpressionStatement' &&
        line.expression.type === 'AssignmentExpression') {
      tasks.push({
        command: raw.substring.apply(raw, line.range),
        yield: line.expression.left.name
      });
    } else if (line.type === 'ClassDeclaration') {
      // Fix class declaration statement
      tasks.push({ command: 'var ' + line.id.name + ' = ' +
          raw.substring.apply(raw, line.range) });
    } else {
      // Run command as-is
      tasks.push({ command: raw.substring.apply(raw, line.range) });
    }
  }

  // Return parsed tasks
  return tasks;
}

function write(str) {
  // Write to default output stream
  repl._output.write(str + '\n');
}

// Debug app by passing stream not to stdout/stdin
function stream(opts) {
  opts = lo.isObject(opts) ? opts : {};
  repl._input = opts.input || process.stdin;
  repl._output = opts.output || process.stdout;
}

function stop(value) {
  if (lo.isFunction(repl._eval) && lo.isFunction(repl._resolve)) {
    // Stop evaluator generator function
    repl._eval(null, true);
    // Get reference to resolve function
    let resolve = repl._resolve;
    // Clear eval and resolve function
    repl._eval = null;
    repl._resolve = null;
    // Resolve the holding repl session
    resolve(value);
  }
}

function isRecoverable(error) {
  return /(Unexpected end of input|Unexpected token)/.test(error.message);
}
