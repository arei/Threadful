var f = function() {
	var a = Array.prototype.slice.call(arguments);
	var x = 0;
	for (var i=0;i<a.length;i++) x += a[i];
	return x;
};

var Threadful;
var thread;
var threadified;

(function(){
	var start = new Date().getTime();
	Threadful = require("./../../Threadful.js");
	console.log("Requiring ............. "+(new Date().getTime()-start)+" ms.");
})();

(function(){
	var start = new Date().getTime();
	thread = new Threadful.Thread();
	console.log("Creating Thread ....... "+(new Date().getTime()-start)+" ms.");
})();

var installTest = function() {
	var tries = 100;
	var total = 0;
	var count = 0;
	var test = function(i) {
		var start = new Date().getTime();
		thread.install("installTest"+i,f,function(error,result){
			if (error) console.error(error);
			count += 1;
			total += (new Date().getTime()-start);
			if (count>=tries) done();
		});				
	};
	var done = function() {
		console.log("Installing Function ... "+(((total/tries*10000)|0)/10000)+" ms. (Total time: "+total+" ms. / Attempts: "+tries+")");
		executeTest();
	};
	for (var i=0;i<tries;i++) test(i);
};
installTest();

var executeTest = function() {
	var tries = 100;
	var total = 0;
	var count = 0;
	var test = function(i) {
		var start = new Date().getTime();
		thread.execute("installTest"+i,1,2,3,function(error,result){
			if (error) console.error(error);
			count += 1;
			total += (new Date().getTime()-start);
			if (count>=tries) done();
		});				
	};
	var done = function() {
		console.log("Executing Function .... "+(((total/tries*10000)|0)/10000)+" ms. (Total time: "+total+" ms. / Attempts: "+tries+")");
	};
	for (var i=0;i<tries;i++) test(i);
};

// (function(){
// 	var start = new Date().getTime();
// 	threadified = thread.threadify(f);
// 	console.log("Threadifying a Function took: "+(new Date().getTime()-start)+" ms.");
// })();

// (function(){
// 	var start = new Date().getTime();
// 	threadified(1,2,3,function(error,result){
// 		console.log("Executing a threadifyed Function took: "+(new Date().getTime()-start)+" ms.");
// 	});
// })();

// (function(){
// 	var start = new Date().getTime();
// 	Threadful.Execute(f,1,2,3,function(error,result){
// 		console.log("Executing a raw Function took: "+(new Date().getTime()-start)+" ms.");
// 	});
// })();

setTimeout(function(){
	Threadful.CloseAll();
},1000);