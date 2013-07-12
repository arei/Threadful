Threadful
=========
Common "Thread" behavior for Browsers (using Web Workers) or Node (using Child Process).

Description
-----------

This package attempts to provide thread-like behavior to JavaScript using Web Workers for the Browser or Child Process for Node.js.  It has several advantages over some of its peers:
* Create a Thread or a ThreadPool of multiple threads.
* Install a function to the Thread/ThreadPool without having to predefine it in the slave/child loading file.
* Once installed installed functions can be repeatedly called without the performance penalty of installing the function each time.
* In a ThreadPool with more than one thread Install is done on all Threads, and execution is done on a single thread, (whichever is the next thread in the pool.)
* Uses a common module file for both the master and slave/child processes, thus taking advantage of browser caching.
* Provides the ability to execute certain functions (called "Selfies") back on the master from a slave/child (one way).  For example, Web Workers do not have a `console` option, but with a `console.log` selfie, the slave/child can do `console.log` back on the server.
* "Threadify" a function so all calls of that function are automatically run on the Thread/ThreadPool.
* Single Execution of a function without the need to install for one-off behavior.  (Incurrs the perfromance penalty of having to install though).

Performance
-----------

Because JavaScript lacks real thread support it uses thread like abstractions such as Web Workers or Child Process.  These abstractions are actually spawning an entirely separate VM for execution.  This can be expensive from both a time and a memory point of view.  For this reason, Threadful (and any thread solution) should be used with thought and caution.

Threadful attempts to shave millis off the performance costs whereever possible.  By having an `Install` mechanism, Threadful allows the developer to minimize the performance penalty assocated with dynamically executing functions in a Thread.

On average we have seen the following performance... Your own results may vary.

```
Require Threadful (on Node) ........ 4 ms.
Creating a Thread .................. 8 ms.
Install a Function ................. 74 ms.
Execute an Installed Function ...... 3 ms.
Execute an Uninstalled Function .... 78 ms.
Threadify a Function ............... 74 ms.
Execute a Threadified Function ..... 3 ms.
```

Installation
------------

You can get Threadful from npm using the command
```
npm install Threadful
```

Once obtained you can use Threadful in your own code thus

Node.js - via require
```javascript
// Require Threadful
var Threadful = require("Threadful");
```

Browser - Insert a script tag
```html
<!-- Install Threadful -->
<script src="Threadful.js"></script>
```

Please Note: Installing Threadful in a browser create the global object Threadful.

Callbacks
---------

Threadful uses callbacks to notify when things are complete.  All callbacks have the form `callback(error,result)`.  If error is not null, some error occured during execution.  Otherwise a valid result will be populated, if any was sent back.

Usage: `Threadful`
------------------

#### `Threadful.Thread`

You can create a single Thread using the `new Threadful.Thread()` constructor..  Note that creating a single thread is really jsut a wrapper for creating a thread pool with 1 thread and a timeout of500ms.

Threadful.Thread returns a new ThreadPool object.  See below for details.

```javascript
// Create a new Thread
var thread = new Threadful.Thread();
```

#### `Threadful.ThreadPool`

You can create a pool of threads just as easily using the `new Threadful.ThreadPool(options)` constructor.  You just need to specify the number threads you wish in the pool.  Threads can added or removed after the pool has been created with `increaseThreadPoolSizeBy()` and `decreaseThreadPoolSizeBy()`.  

Threadful.ThreadPool returns a new ThreadPool object.  See below for details.

```javascript
var threadpool = new Threadful.ThreadPool({
	threads: 4,
  timeout: 500
});
````

#### `Threadful.Threadify`

Threadify is a process that when given a function will create a Thread, install the function into the thread, and return a new function.  When the new function is executed the actual execution is passed off to the original function in the thread.  It essentially wraps a function in a Thread execution.  It is provided purely for quick and easy access but does have some limitations...

* Threadify functions are self contained Threads and not shared with other functions.
* Threadify functions cannot (at this time) be unwound from their Thread.
* Threadify functions do not expose thier underlying Thread (yet).
* Threadify functions cannot be closed (yet).

Instead of using Threadful.Threadify consider creating a new Thread and using the Thread.threadify() method there.

Threadful.Threadify returns a new function, which serves as the means to execute the original function but on the thread created.  The function will take any number of parameters, but the last parameter should be a callback function to be notified of the result of execution.

```javascript
// Define some function
var f = function() { ... };

// Create a Threadify version of that function
var threaded = Threadful.Threadify(f);

// Execute the function f on a Thread.
threaded(1,2,3,callback); // execute function f on the thread, return result in the callback.
```

#### `Threadful.Execute`

Execute is a one time thread execution for a passed in function.  It create a single use Thread, installs the function into it, and then executes the function immediately.  Once execution is complete the Thread is closed and no longer usable.  Threadful.Execute has some very consquental limitations, so use with care.

* It is single use.
* Each time you use Execute you pay the performance of creating a new thread, installing the function, and executing the function all at once.
* The created thread cannot be reused.

Instead of using Threadful.Execute consider creating a new Thread, installing the function to the Thread, and using Thread.execute() to run it.

Execute returns nothing.

```javascript
// Define some function
var f = function() { ... };

// Execute that function on a Thread.
Threadful.Execute(f,arg1,arg2,arg3,argEtc,callback);
```

#### `Threadful.CloseAll`

Closes all previously created ThreadPool objects including those created by Threadful.Threadify and Threadful.Execute.  Once a ThreadPool is closed it cannot be reused.

```javascript
Threadful.CloseAll();
```

Usage: `ThreadPool`
-----------------

#### `ThreadPool.install(name,f,callback)`

#### `ThreadPool.uninstall(name,callback)`

#### `ThreadPool.execute(name,arg,arg,arg,etc,callback)`

#### `ThreadPool.list()`

#### `ThreadPool.status()`

#### `ThreadPool.close()`

#### `ThreadPool.threadify(f)`

#### `ThreadPool.increaseThreadPoolSizeBy(int)`

#### `ThreadPool.decreaseThreadPoolSizeBy(int)`

#### `ThreadPool.getThreadPoolSize()`

