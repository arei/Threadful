var assert = require("assert");

// Test Threadful itself
var Threadful = require("./../../threadful.js");
assert(!!Threadful);
assert(!!Threadful.Thread);
assert(!!Threadful.ThreadPool);
assert(!!Threadful.Threadify);
assert(!!Threadful.Execute);
assert(!!Threadful.CloseAll);

// create a Thread, this by extension tests creating a ThreadPool
var w = new Threadful.Thread();
assert(!!w);

// A function to work with
var test1 = function(){
	var a = Array.prototype.slice.call(arguments);
	var x = 0;
	for (var i=0;i<a.length;i++) {
		var n = parseFloat(a[i]);
		if (isNaN(n)) throw new Error("Not a Number.");
		x += n;
	}
	return x;
};
assert(!!test1);

// Install the function
w.install("test1",test1,function(error,result){
	assert(!error);
	assert(!!result);
	assert(w.installed("test1"));	
});

var list = w.list(function(error,result){
	assert(!error);
	assert(!!result);
	assert(result.length===1);
	assert(result[0]==="test1");
});

w.execute("test1",1,2,3,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result===6);
});

w.execute("test1","abc",function(error,result){
	assert(!!error);
	assert(!result);
});

var test1a = w.threadify(test1);
assert(!!test1a);

test1a(4,5,6,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result===15);	
});

var list = w.list(function(error,result){
	assert(!error);
	assert(!!result);
	assert(result.length===2);
});

w.status(function(error,result){
	assert(!error);
	assert(!!result);
	assert(!!result.threads);
	assert(!!result.threads[0]);
	assert(!!result.threads[0].successfulResults);
	assert(result.threads[0].successfulResults===8);
	assert(!!result.threads[0].unsuccessfulResults);
	assert(result.threads[0].unsuccessfulResults===1);
});

w.increaseThreadPoolSizeBy(2);
assert(w.getThreadPoolSize()===3);

w.decreaseThreadPoolSizeBy(1);
assert(w.getThreadPoolSize()===2);

var test2 = function(x) {
	return x*7;
};
assert(!!test2);

w.install("test2",test2,function(error,result){
	assert(!error);
	assert(result);
	assert(w.installed("test2"));
});

w.distribute("test2",[1,2,3],null,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result.length===3);
	assert(result[0]===7);
	assert(result[1]===14);
	assert(result[2]===21);
});

w.map("test2",[1,2,3],null,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result.length===3);
	assert(result[0]===7);
	assert(result[1]===14);
	assert(result[2]===21);
});

var test3 = function(x) {
	return x===2;
};
assert(!!test3);

w.install("test3",test3,function(error,result){
	assert(!error);
	assert(result);
	assert(w.installed("test3"));
});

w.filter("test3",[1,2,3,4,5,2,2,2],function(error,result){
	assert(!error);
	assert(result);
	assert(result.length===4);	
});

w.some("test3",[1,3,4,5,6,7,2,8,9],function(error,result){
	assert(!error);
	assert(result===true);
});

w.some("test3",[1,3,4,5,6,7,2222,8,9],function(error,result){
	assert(!error);
	assert(result===false);
});

w.every("test3",[1,3,4,5,6,7,2,8,9],function(error,result){
	assert(!error);
	assert(result===false);
});

w.every("test3",[2,2,2,2,2,2],function(error,result){
	assert(!error);
	assert(result===true);
});

var test4 = Threadful.Threadify(test1);
test4(1,2,3,4,5,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result===15);	
});

Threadful.Execute(test1,1,2,3,4,5,6,7,8,9,function(error,result){
	assert(!error);
	assert(!!result);
	assert(result===45);	
});

setTimeout(function(){
	assert(w.outstanding()===0);
	assert(w.utilization()===0);
	w.uninstall("test1",function(error,result){
		assert(!error);
		assert(!!result);
		assert(!w.installed("test1"));	
	});	
	w.uninstall("test2",function(error,result){
		assert(!error);
		assert(!!result);
		assert(!w.installed("test2"));	
	});	
	w.uninstall("test3",function(error,result){
		assert(!error);
		assert(!!result);
		assert(!w.installed("test3"));	
	});	
},900);

setTimeout(function(){
	Threadful.CloseAll(function(error,result){
		assert(!error);
		process.exit();
	});
},1000);
