Node.js RE-PL Console
======================
[![Build Status](https://travis-ci.org/withmandala/node-repl.svg?branch=master)](https://travis-ci.org/withmandala/node-repl)
[![Coverage Status](https://coveralls.io/repos/github/withmandala/node-repl/badge.svg?branch=master)](https://coveralls.io/github/withmandala/node-repl?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/withmandala/node-repl/badge.svg)](https://snyk.io/test/github/withmandala/node-repl)

This package will help you debug and halt asynchronous operations with included
automatic promise and generator resolution, so no more hassle on writing
promise chains in REPL console.

This package is written purely for debugging purposes only because it contains
`eval()` code that should be entirely avoided on production environment and
will automatically terminate current running application if executed on
`NODE_ENV` set to `production`.

## Setup

Grab the package from NPM by

```
npm install --save re-pl
```

And import them in your project. Note that importing this package **DOES NOT**
activate the REPL or any eval() codes, so it is okay to include them in your
production code.

```javascript
const repl = require('re-pl');
```

> **Important Notice About `'use strict'` Directive**  
> The `'use strict'` directive will **PREVENT** you from creating new variables
> in the REPL console because of the inconsistent behavior of `eval()` function
> in strict mode. The strict mode on the library does not affects the `eval()`
> behavior of your application.

## Usage

To start the REPL session, you shoud pass anonymous function containing eval
code to attach the working eval code to your current scope.

```javascript
// This is the shorthand
var debug = repl(($)=>eval($))

// But this is also okay
var debug = repl(function($) { return eval($) })
```

The debug now will contain function that will run the REPL if executed.

```javascript
// This will run the REPL
debug();

// This is also will run the REPL, but with input variable
debug(value);

// You can also chain the debug with promise
someAsyncPromise().then(debug);

// Or, if you prefer invoking with shorthand is also okay
repl(($)=>eval($))();

repl(($)=>eval($))(value);

someAsyncPromise().then(repl(($)=>eval($)));
```

### Start Using REPL

Now, you can start the debugging process. The promise resolution only works
if you pass them in one of three ways:

- `var|const|let resolved = promiseFunction()`
- `resolved = promiseFunction()`
- `promiseFunction()`

Note that if you chain assignment `resolved = anotherVar = ...` only variable
on the mostleft will be resolved (the other would be containing promises).
You can access the last result displayed on terminal by using underscore (`_`).

```
> var x = Promise.resolve(3);
3

> x
3

> Promise.resolve(4);
4

> _
4
```

### Using Input value

Value passed from the `debug()` function (either by hand or from promise result)
can be accessed by using `$input`.

Here is the example code.

```javascript
debug('test');
```

And this is the result on REPL console

```
> $input
'test'
```

## Continue Code execution

### Continue Using `.done`

You can continue ongoing asynchronous execution with optional to-be-evaluated
code.

Here is the example code.

```javascript
asyncPromise()
    .then(debug)
    .then((result)=>console.log('Hello,', result));
```

And this is from terminal

```
> .done 2 + 2
Hello, 4
```

### Continue using `.return`

Same as `.done` keyword but instead of returning evaluated code, `.return`
will return `$input` variable.

## Usage with Generator Functions

The debug function will return promises with held resolve so you can put them
in the middle of asynchronous process to suspend them and start making changes.
If you use generator runner such as `co` or my own implementation package
`setlist`, you can chain the debug function with yield to suspend the generator
until returned from REPL.

```javascript
const repl = require('re-pl');
const run = require('setlist');

run(function* () {
  // Initialize variables and do some work here
  ...
  let value = yield someWorkHere();

  // Pause execution to inspect ongoing process
  value = yield repl(($)=>eval($))(value);

  // The edited/unedited return value can be used later
  return lastWorkHere(value);
});
```

## Bugs

Please report any issues related to RE-PL here 
<https://github.com/withmandala/node-repl/issues>

## License

Copyright (c) 2016 Fadhli Dzil Ikram. Node.js RE-PL is MIT Licensed.
