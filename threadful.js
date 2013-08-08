(function(){
	var isBrowser = (typeof window !== "undefined" || typeof self !== "undefined");
	var isNode = (typeof process !== "undefined");	
	var isMaster = (isBrowser && typeof window !== "undefined") || (isNode && process !== "undefined" && process.env._IS_NODE_SLAVE_PROCESS!=="true");
	var isSlave = (isBrowser && typeof window === "undefined") || (isNode && process !== "undefined" && process.env._IS_NODE_SLAVE_PROCESS==="true");
	
	if (!isBrowser && !isNode) throw new Error("Unable to understand execution context, neither Browser nor Node.");

	var threadfulName = "threadful.js";
	var threadfulPath = threadfulName;
	
	var oneup = 1;

	var getId = function() {
		return new Date().getTime()+"."+(oneup++);
	};
	
	var toArray = function(a) {
		return Array.prototype.slice.call(a);
	};

	var keys = function(o) {
		if (Object.keys) return Object.keys(o);

		var keys = [];
		for (var key in o) keys.push(key);
		return keys;
	};

	var extend = function(src,dest) {
		each(keys(src),function(key){
			if (dest[key]===undefined) dest[key] = src[key];
		});
		return dest;
	};

	var each = function(a,f) {
		if (Array.prototype.forEach) a.forEach(f);
		else if (Array.prototype.each) a.each(f);
		else for (var i=0;i<a.length;i++) f(a[i],i);
		return a;
	};

	var indexOf = function(a,x) {
		if (Array.prototype.indexOf) return a.indexOf(x);
		for (var i=0;i<a.length;i++) {
			if (a[i]===x) return i;
		}
		return -1;
	};

	var isFunction = function(f) {
		return typeof f === "function";
	};

	var sanatizeArguments = function(a) {
		a = toArray(a);
		each(a,function(v,i){
			if (isFunction(v)) v = v.toString();
			if (v.toString()==="[object Arguments]") v = toArray(v);
			if (typeof self !=="undefined" && v===self) v = "[object Self]";
			a[i] = v;
		});
		return a;
	};

	var functionToString = function(f) {
		if (!f || !isFunction(f)) throw new Error("Not a Function.");
		var s = f.toString();
		s = s.replace(/\/\/(.*)[\n\r\v\f]/g,"/* $1 */");
		s = s.replace(/[\n\r\v\f]/g," ");
		s = s.replace(/\s\s|\t/g," ");
		return s;
	};

	var stringToFunction = function(s) {
		try {
			var f = eval("("+s+")");
			return f;
		}
		catch (ex) {
			throw wrapError(ex,"Compilation Error");
		}
	};

	var wrapError = function(ex,msg) {
		var s = "";
		if (ex.name) s += (msg?": ":"")+ex.name;
		if (ex.message) s += (msg?": ":"")+ex.message;
		if (ex.fileName) s += (msg?": ":"")+ex.fileName;
		if (ex.lineNumber) s += (msg?": ":"")+ex.lineNumber;
		if (!s) s = ex.toString();
		s = msg +": "+s;

		return s;
	};

	var traverse = function(o,s) {
		var p = s.split(/\./);
		if (p.length<2) return o;
		var f = p.shift();
		var r = p.join(".");
		if (o[f]===undefined || o[f]===null) o[f] = {};
		return traverse(o[f],r);
	};

	var timing = function(name,f) {
		if (name && !f && isFunction(name)) {
			f = name
			name = "Anonymous Function";
		}
		if (!name) throw new Error("Timing should supply a name.");
		if (!f || !isFunction(f)) throw new Error("Timing require a function.");

		var total = 0;
		var count = 0;
		
		var g = function() {
			count += 1;
			var start = new Date().getTime();
			var result,error;
			try {
				result = f.apply(this,toArray(arguments));				
			}
			catch (ex) {
				error = ex;
			};
			var time = new Date().getTime()-start;
			total += time;
			console.log(name+": "+time+" ms. (Total: "+total+" ms. / Count: "+count+" / Average: "+(((total/count*10000)|0)/10000)+" ms.)");
			if (error) throw error;
			return result;
		};

		return g;
	};

	// Setup Slave
	var SlaveCode = function() {
		var totalStart = new Date().getTime();

		var installed = {};
		var stats = {
			successfulResults: 0,
			unsuccessfulResults: 0,
			totalTime: 0,
			activeTime: 0,
			averageTime: 0,
			lastTime: 0,
			lastCall: null,
			selfies: 0,
			executes: 0,
			installs: 0,
			uninstalls: 0,
		};

		var send = null;
		var listen = null;
		var unlisten = null;
		var close = null;
		var payload = null;

		// What is the top level for this, global for node or self for browsers.
		var top = isNode ? global : self;

		if (isBrowser) {
			send = function(payload) {
				return top.postMessage(payload);
			};
			listen = function(event,listener) {
				return top.addEventListener(event,listener);
			};
			unlisten = function(event,listener) {
				return top.removeEventListener(event,listener);
			};
			close = function() {
				setTimeout(function(){
					top.close();
				},1);
			};
			payload = function(event) {
				return event.data;
			};
		}
		else if (isNode) {
			send = function(payload) {
				return process.send(payload);
			};
			listen = function(event,listener) {
				return process.on(event,listener);
			};
			unlisten = function(event,listener) {
				return process.removeListener(event,listener);
			};
			close = function() {
				setTimeout(function(){
					process.exit();
				},1);
			};
			payload = function(event) {
				return event;
			};
		}

		var respondError = function(id,error) {
			stats.unsuccessfulResults += 1;
			send({
				id: id,
				error: error instanceof Error ? wrapError(error,"Uknown Error") : error,
				result: null
			});
			throw error;
		};

		var respondResult = function(id,result) {
			stats.successfulResults += 1;
			send({
				id: id,
				error: null,
				result: result
			});
		};

		var cmdSelfie = function(id,options) {
			var name = options.name;
			if (!name) return respondError(id,new Error("Selfie requires a name option."));

			var last = name.split(/\./).slice(-1)[0];
			if (!last) return respondError(id,new Error("Selfie did not understand the name option: "+name));

			var f = function() {
				var a = sanatizeArguments(arguments);
				send({
					id: "selfie",
					command: name,
					arguments: a
				});
				stats.selfies += 1;
			};

			var obj = traverse(top,name);

			if (!obj[last]) obj[last] = f;

			respondResult(id,true);
		};

		var cmdUnselfie = function(id,options) {
			var name = options.name;
			if (!name) return respondError(new Error("Unselfie requires a name option."));

			var last = name.split(/\./).slice(-1)[0];
			if (!last) return respondError(new Error("Unselfie did not understand the name option: "+name));

			var obj = traverse(top,name);

			delete obj[last];

			respondResult(id,true);
		};

		var cmdInstall = function(id,options) {
			var name = options.name;
			if (!name) return respondError(id,new Error("Install requires a name option."));

			var code = options.code;
			if (!code) return respondError(id,new Error("Install requires a code option."));

			var f = stringToFunction(code);

			if (installed[name]) return respondError(id,new Error("Install already defined for name option: "+name));

			installed[name] = f;

			respondResult(id,true);

			stats.installs += 1;
		};

		var cmdUninstall = function(id,options) {
			var name = options.name;
			if (!name) return respondError(new Error("Uninstall requires a name option."));

			delete installed[name];

			respondResult(id,true);

			stats.uninstalls += 1;
		};

		var cmdExecute = function(id,options) {
			var start = new Date().getTime();

			var name = options.name;
			if (!name) return respondError(id,new Error("Execute requires a name option."));

			var args = options.arguments;
			if (!args) return respondError(id,new Error("Execute requires an arguments option."));

			var exec = installed[name]
			if (!exec) return respondError(id,new Error("Execute did not find any installed code for name option: "+name));

			try {
				var result = exec.apply(this,args);
				respondResult(id,result);
			}
			catch (ex) {
				respondError(id,wrapError(ex,"Execution Error"));
			}

			var time = new Date().getTime()-start;
			stats.executes += 1;
			stats.lastTime = time;
			stats.lastCall = name;
		};

		var cmdStatus = function(id,options) {
			stats.totalTime = new Date().getTime()-totalStart;
			respondResult(id,stats);
		};

		var cmdClose = function(id,options) {
			close();
			respondResult(id,true);
		};

		var commands = {
			selfie: cmdSelfie,
			unselfie: cmdUnselfie,
			install: cmdInstall,
			uninstall: cmdUninstall,
			execute: cmdExecute,
			status: cmdStatus,
			close: cmdClose
		};

		listen("message",function(event){
			var data = payload(event);
			var id = data.id;
			if (!id) throw new Error("Worker message requires an id.");

			var cmd = data.command || "";
			if (!cmd) throw new Error("Worker message requires a command.");

			var opt = data.options || {};

			var count = 0;

			var fun = commands[cmd];
			if (fun) {
				try {
					var start = new Date().getTime();
					fun(id,opt);
					stats.activeTime += new Date().getTime()-start;
					stats.averageTime = stats.activeTime/(++count);
				}
				catch (ex) {
					// do nothing, the exception should already have been handled.
				}
			}
			else {
				throw new Error("Worker did not understand command: "+cmd);
			}
		});
	};

	// setup Master
	var MasterCode = function() {

		var pools = [];
		var callbacks = {};
		var selfies = {};

		var create = null;
		var send = null;
		var listen = null;
		var unlisten = null;
		var payload = null;

		if (isBrowser) {
			var scripts = document.getElementsByTagName("script");
			var nametest = new RegExp(threadfulName+"$");
			for (var i=0;i<scripts.length;i++) {
				var src = scripts[i].src;
				if (nametest.test(src)) {
					var pathre = new RegExp("^(.*)\/"+threadfulName+"$");
					var path = src.replace(pathre,"$1");
					threadfulPath = path+"/"+threadfulName;
				}
			}

			create = function() {
				return new Worker(threadfulPath);
			};
			send = function(worker,payload) {
				return worker.postMessage(payload);
			};
			listen = function(worker,event,listener) {
				return worker.addEventListener(event,listener);
			};
			unlisten = function(worker,event,listener) {
				return worker.removeEventListener(event,listener);
			};
			payload = function(event) {
				return event.data;
			};
		}
		else if (isNode) {
			threadfulPath = require.resolve("./"+threadfulName);

			create = function() {
				var fork = require("child_process").fork;
				
				var env = JSON.parse(JSON.stringify(process.env));
				env._IS_NODE_SLAVE_PROCESS = "true";
				
				return fork(threadfulPath,{
					env: env
				});
			};
			send = function(worker,payload) {
				return worker.send(payload);
			};
			listen = function(worker,event,listener) {
				return worker.on(event,listener);
			};
			unlisten = function(worker,event,listener) {
				return worker.removeListener(event,listener);
			};
			payload = function(event) {
				return event;
			};
		}

		var registerCallback = function(id,worker,callback) {
			callbacks[id] = {
				callback: isFunction(callback) ? callback : null,
				worker: worker
			};
		};

		var executeCallback = function(id,error,result) {
			var cb = callbacks[id];
			delete callbacks[id];
			if (cb.callback) cb.callback(error,result);
		};

		var registerSelfie = function(name,f) {
			selfies[name] = f;
		};

		var executeSelfie = function(name,args) {
			var f = selfies[name];
			if (f) f.apply(this,args);
		};

		var Selfie = function(worker,name,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "selfie",
				options: {
					name: name
				}
			});
		};

		var Unselfie = function(worker,name,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "unselfie",
				options: {
					name: name
				}
			});
		};

		var Install = function(worker,name,functn,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "install",
				options: {
					name: name,
					code: functionToString(functn)
				}
			});
		};

		var Uninstall = function(worker,name,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "uninstall",
				options: {
					name: name
				}
			});
		};

		var Execute = function(worker,name,args,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "execute",
				options: {
					name: name,
					arguments: args
				}
			});
		};

		var Status = function(worker,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "status"
			});
		};

		var Close = function(worker,callback) {
			if (!worker) throw new Error("Worker closed or disconnected.");
			var id = getId();
			registerCallback(id,worker,callback);
			send(worker,{
				id: id,
				command: "close"
			});
		};

		registerSelfie("console.log",function(){
			var a = toArray(arguments);
			a.unshift("["+threadfulName+"]");
			console.log.apply(console,a);
		});		

		registerSelfie("console.info",function(){
			var a = toArray(arguments);
			a.unshift("["+threadfulName+"]");
			console.info.apply(console,a);
		});		

		registerSelfie("console.warn",function(){
			var a = toArray(arguments);
			a.unshift("["+threadfulName+"]");
			console.warn.apply(console,a);
		});		

		registerSelfie("console.error",function(){
			var a = toArray(arguments);
			a.unshift("["+threadfulName+"]");
			console.error.apply(console,a);
		});		

		var Thread = function(options) {
			return new ThreadPool({
				threads: 1
			});
		};

		var ThreadPool = function(options) {
			var me = this;

			pools.push(this);

			var options = extend({
				threads: 1,
				timeout: 500,
			},options);

			var workers = [];
			var installed = {};
			var last = 0;

			var addThread = function() {
				var worker = create();
	
				listen(worker,"message",function(event){
					var data = payload(event);
					var id = data.id;

					if (id==="selfie") {
						var command = data.command || "";
						var args = data.arguments || [];
						executeSelfie(command,args);
					}
					else {
						executeCallback(id,data.error,data.result);
					}

					// console.log(me.outstanding()+" / "+(((me.utilization()*10000)|0)/100)+"%");

				});
	
				each(keys(selfies),function(key,i){
					Selfie(worker,key);
				});

				workers.push(worker);				
			};

			var removeThread = function() {
				var worker = workers.pop();
				if (!worker) return;

				Close(worker);
			};

			var busy = function(worker) {
				if (!worker) return false;
				var busy = false;
				each(keys(callbacks),function(id){
					if (busy) return;
					if (callbacks[id].worker===worker) busy = true;
				});
				return busy;				
			};

			for (var i=0;i<options.threads;i++) addThread();

			this.getThreadPoolSize = function() {
				return options.threads;
			};

			this.outstanding = function() {
				var pending = 0;
				if (!workers) return 0;
				each(keys(callbacks),function(id){
					if (indexOf(workers,callbacks[id].worker)>-1) pending += 1;
				});
				return pending;				
			};

			this.utilization = function() {
				return this.outstanding()/options.threads;
			};

			this.install = function(name,functn,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				installed[name] = functn;

				var done = [];
				each(workers,function(w,i){
					var start = new Date().getTime();
					Install(w,name,functn,function(){
						done[i] = true;
						var alldone = true;
						each(workers,function(w,j){
							if (!alldone) return;
							if (done[j]!==true) alldone = false;
						});
						if (callback && alldone) callback(null,true);
						else if (callback && options.timeout>-1 && start-new Date().getTime()>options.timeout) callback("Install timed out.",false);
					});				
				});
				return me;
			};

			this.uninstall = function(name,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				delete installed[name];

				var done = [];
				each(workers,function(w,i){
					var start = new Date().getTime();
					Uninstall(w,name,function(){
						done[i] = true;
						var alldone = true;
						each(workers,function(w,j){
							if (!alldone) return;
							if (done[j]!==true) alldone = false;
						});
						if (callback && alldone) callback(null,true);
						else if (callback && options.timeout>-1 && start-new Date().getTime()>options.timeout) callback("Uninstall timed out.",false);
					});				
				});
				return me;
			};			

			this.installed = function(name) {
				return !!installed[name];
			};

			this.list = function(callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				callback(null,keys(installed));
				return me;
			};

			this.execute = function(name,arg,arg,etc,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				if (!installed[name]) throw new Error("Nothing installed as '"+name+"' in ThreadPool.");

				var a = toArray(arguments);
				a.shift();

				var callback = a.pop();
				if (callback && !isFunction(callback)) {
					a.push(callback);
					callback = null;
				}

				if (++last>=workers.length) last = 0;

				var worker = workers[last];
				if (!worker) throw new Error("Unable to obtain thread.");

				Execute(worker,name,a,callback);				

				return me;
			};

			var iteration = function(iterable,i) {
				if (isFunction(iterable)) return iterable(i);
				else if (iterable.length!==undefined && iterable.length!==null) return iterable[i];
				return undefined;
			};

			this.distribute = function(name,iterable,resolver,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");
				if (!me.installed(name)) throw new Error("Function "+name+" is not installed in the pool.");
				if (!iterable) throw new Error("Iterable must be an interable object or a function.");
				if (resolver && !isFunction(resolver)) throw new Error("Resolver must be null or a function.");

				var pos = 0;
				var done = false;
				var using = [];
				var results = [];

				var next = function() {
					if (done) return;

					each(workers,function(worker,i){
						if (busy(worker)) return;
						using[i] = true;
						exec(worker);
					});
					setTimeout(next,0);
				};

				var exec = function(worker) {
					var i = pos++;
					var val = iteration(iterable,i);
					if (val===undefined || val===null) done = true;
					if (!done) {
						Execute(worker,name,[val],function(error,result){
							if (resolver) resolver(error,result,val,i);
							results[i] = error || result;
							next();
						});
					}
					else {
						finish();
					} 
				};

				var finish = function(){
					if (!done) return;

					var exit = true;
					each(workers,function(worker,i){
						if (!exit) return;
						if (using[i] && busy(worker)) exit = false;
					});

					if (exit) callback(null,results);
					else setTimeout(finish,0);
				};

				next();
			};

			this.map = this.distribute;

			this.some = function(name,iterable,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var answer = false;
				this.distribute(name,function(i){
					if (answer!==true) return iteration(iterable,i);
					return undefined;
				},function(error,result){
					if (error || result===true) {
						answer = true;
						return true;
					}
					return false;
				},function(error,result){
					callback(error,answer);
				});
			};

			this.every = function(name,iterable,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var answer = true;
				this.distribute(name,function(i){
					if (answer!==false) return iteration(iterable,i);
					return undefined;
				},function(error,result,val,i){
					if (error || result===false) {
						answer = false;
						return false;
					}
					return true;
				},function(error,result){
					callback(error,answer);
				});
			};

			this.filter = function(name,iterable,callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var answer = [];
				this.distribute(name,iterable,function(error,result,val,i){
					if (!error && result===true) answer.push(val);
				},function(error,result){
					callback(error,answer);
				});
			};

			this.status = function(callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var answers = [];
				each(workers,function(w,i){
					var start = new Date().getTime();
					Status(w,function(error,result){
						result.state = busy(w) ? "busy" : "free";

						answers[i] = result;
						
						var alldone = true;
						each(workers,function(w,j){
							if (!alldone) return;
							if (answers[j]===undefined) alldone = false;
						});
						
						if (callback && alldone) {
							var stats = {
								poolSize: options.threads,
								options: options,
								installed: installed,
								threads: {}
							};
							each(answers,function(answer,i){
								stats.threads[i] = answer;
							});
							callback(null,stats);
						}
						else if (callback && options.timeout>-1 && start-new Date().getTime()>options.timeout) callback("Status timed out.",null);
					});				
				});
			};

			this.close = function(callback) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var done = [];
				each(workers,function(worker,i){
					Close(worker);				
					workers = null;
				});
				options.threads = 0;
				return me;
			};

			this.closed = function() {
				return workers===null;
			};

			this.threadify = function(f) {
				if (!workers) throw new Error("ThreadPool has been closed.");

				var id = getId();
				var ready = false;

				me.install(id,f,function(){
					ready = true;
				});

				var g = function(arg,arg,etc,callback) {
					var t = this;
					var a = toArray(arguments);

					if (!ready) {
						setTimeout(function(){
							g.apply(t,a);
						},0);
						return;
					}

					a.unshift(id);

					return me.execute.apply(me,a);
				};
				return g;
			};

			return this;
		};

		var CloseAll = function(callback) {
			each(pools,function(pool,i){
				if (!pool || pool.closed()) return;
				pool.close();
			});
			if (callback) callback(null,true);
		};

		var SoloThreadify = function(f) {
			var w = new Thread();
			return w.threadify(f);
		};

		var SoloExecute = function(f,arg,arg,etc,callback) {
			var a = toArray(arguments);
			var f = a.shift();

			var callback = a.pop();
			if (callback && !isFunction(callback)) {
				a.push(callback);
				callback = null;
			}

			var name = getId();

			var w = new Thread();
			w.install(name,f,function(error,result){
				if (error && callback) callback(error,null);
				else if (!error) {
					a.push(callback);
					a.unshift(name);
					w.execute.apply(w,a);
					w.uninstall(name);
				}
			});
		};

		var Threadful = {
			Thread: Thread,
			ThreadPool: ThreadPool,
			Threadify: SoloThreadify,
			Execute: SoloExecute,
			CloseAll: CloseAll
		};

		if (isNode) {
			module.exports = Threadful;
		}
		else if (isBrowser) {
			window.Threadful = Threadful;
		}

		return Threadful;
	};

	// Depending on which runtime execution we are in, launch the appropriate setup.
	if (isSlave) SlaveCode();
	else if (isNode || isBrowser) MasterCode();
	else throw new Error("Threadful is unable to determine what kind of runtime in which it is executing.");
})();

