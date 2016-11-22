/**
 * Node.js REPL Waiting Console
 * Main library file
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

'use strict'

const REPL = require('repl')
const run = require('setlist')
const lo = require('lodash')
const esprima = require('esprima')

// Define function mapping
module.exports = repl
// Expose debug stream and worker for testing
repl.stream = stream
repl.worker = worker
repl.stop = stop
// Set default i/o to stdin and stdout
repl._input = process.stdin
repl._output = process.stdout

// REPL application configuration
let config = {
  input: process.stdin,
  output: process.stdout
}
let session

// Start new REPL session by passing eval function ($)=>eval($)
function repl ($eval) {
  return (input)=>start($eval, input)
}

function start ($eval, value) {
  // Failsafe on NODE_ENV=production
  if (process.env.NODE_ENV === 'production') {
    write('ERR: You cannot run RE-PL on production environment, quitting...')
    return process.exit(-1)
  }
  if (session) {
    // Do not continue if REPL session exists
    return write('WARN: Another call to REPL console detected, ignoring.')
  }
  // Give greetings message to user
  write('Node.js RE-PL Development Console by @adzil')
  write('Type .help to show available REPL options')
  // Inform user that it has input value
  if (!lo.isUndefined(value)) {
    write('Input value available, you can access them with $input')
  }
  // Create new session object
  session = {
    // Evaluator function
    eval: $eval(`;(function ($input) {
      // Initialize evaluator generator
      var $Evaluator = (function* () {
        var $Evaluator, $command, _
        do {
          try {
            $command = yield {value: eval($command)}
          } catch (err) {
            $command = yield {error: err}
          }
        } while ($command !== false)
      })()
      $Evaluator.next()
      // Return simple eval function
      return function $eval (cmd, nextdone) {
        var r = $Evaluator.next(cmd).value
        // Terminate eval runner if requested
        if (nextdone === true) $Evaluator.next(false)
        if (r.error) {
          throw r.error
        } else {
          return r.value
        }
      }
    })`)(value),
    // Underscore writeback override value
    override: false,
    resolver: true,
    server: REPL.start({
      eval: workerHandler,
      input: config.input,
      output: config.output
    })
  }
  // Set command extension for REPL server 
  session.server.defineCommand('done', {
    help: 'Run optional evaluated code as return and continue code execution',
    action: function(toEval) {
      if (toEval.length > 0) {
        stop(toEval)
      } else {
        stop()
      }
    }
  })
  session.server.defineCommand('return', {
    help: 'Return last input value and continue code execution',
    action: function() {
      stop('$input')
    }
  })
  session.server.defineCommand('disable', {
    help: 'Disable automatic promise and generator resolution',
    action: function() {
      session.resolver = false
      this.bufferedCommand = ''
      write('Automatic promise and generator resolution has been disabled')
      this.displayPrompt()
    }
  })
  session.server.defineCommand('enable', {
    help: 'Enable automatic promise and generator resolution',
    action: function() {
      session.resolver = true
      this.bufferedCommand = ''
      write('Automatic promise and generator resolution has been enabled')
      this.displayPrompt()
    }
  })
  // Force exit REPL on CTRL-C
  session.server.on('exit', () => process.exit())

  // Return promise to user
  return new Promise(function(resolve) {
    // Get done function for session
    session.done = resolve
  })
}

function workerHandler(raw, ctx, file, callback) {
  run(worker(raw))
    .then((r) => callback(null, r.value))
    .catch((error) => callback(error, null))
}

function* worker(raw) {
  let tasks
  let result
  let lastResult

  if (!session.override) lastResult = session.eval('_')

  try {
    tasks = parser(raw)
  } catch (err) {
    if ('Recoverable' in REPL && isRecoverable(err)) {
      throw new REPL.Recoverable(err)
    } else {
      throw err
    }
  }

  // Run parsed tasks
  for (let task of tasks) {
    // Declare new variable
    if (task.declare) {
      session.eval(task.declare)
    }

    // Run task command value
    if (session.resolver) {
      // Run command asynchronously-wait
      result = yield session.eval(task.command)
    } else {
      // Run command synchronously
      result = session.eval(task.command)
    }

    // Return yielded result if available
    if (task.yield) {
      assign(task.yield, result)
    }
  }

  // Writeback last result
  if (!session.override) {
    if (lastResult === session.eval('_')) {
      assign('_', result)
    } else {
      write('Underscore writeback has been disabled.')
      session.override = true
    }
  }

  // Return last result to console
  return {value: result}
}

function assign(name, value) {
  session.eval(';(function(value) { ' + name + ' = value })')(value)
}

function parser(raw) {
  let parsed = esprima.parse(raw, { range: true })
  let tasks = []
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
      })
    } else if (line.type === 'ClassDeclaration') {
      // Fix class declaration statement
      tasks.push({ command: 'var ' + line.id.name + ' = ' +
          raw.substring.apply(raw, line.range) })
    } else {
      // Run command as-is
      tasks.push({ command: raw.substring.apply(raw, line.range) })
    }
  }

  // Return parsed tasks
  return tasks
}

function write(str) {
  // Write to default output stream
  config.output.write(str + '\n')
}

// Debug app by passing stream not to stdout/stdin
function stream(opts) {
  opts = lo.isObject(opts) ? opts : {}
  config.input = opts.input || process.stdin
  config.output = opts.output || process.stdout
}

function stop(raw) {
  let value
  // Do nothing if no REPL session available
  if (!session) return
  // Execute last raw command
  if (lo.isString(raw)) {
    // Execute and end current generator
    value = session.eval(raw, true)
  } else {
    // Just end current generator
    session.eval(null, true)
  }
  // Get reference to resolve function
  let done = session.done
  // Remove all exit listener to prevent process.exit on .done
  session.server.removeAllListeners('exit')
  // Stop REPL server
  session.server.close()
  // Unset session variable
  session = undefined
  // Give back resolve value to parent Promise
  done(value)
}

function isRecoverable(error) {
  return /(Unexpected end of input)/.test(error.message)
}
