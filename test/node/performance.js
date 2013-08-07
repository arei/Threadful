var Threadful = require("./../../threadful.js");
var timeLimit = 5000;

var isPrime = function(i) {
	if (i===0) return false;
	if (i<4) return true;

	var u = i/2;

	var prime = true;
	for (var t=2;t<=u;t++) {
		if (i%t===0) {
			prime = false;
			break;
		}
	}

	return prime;
};

var performanceTest = function(starting,threads,callback) {
	Threadful.CloseAll();

	var primes = [];
	var current = starting;
	var start = new Date().getTime();

	var nextNumber = function() {
		var t = new Date().getTime()-start;
		if (t>=timeLimit) return null;
		current += 1;
		return current;
	};

	if (threads===0) {
		while (true) {
			var n = nextNumber();
			if (n===null) break;
			if (isPrime(n)) primes.push(n);;
		}
		callback(null,primes,new Date().getTime()-start);
	}
	else {
		var pool = new Threadful.ThreadPool({
			threads: threads
		});

		pool.install("isPrime",isPrime,function(error,result){
			pool.distribute("isPrime",nextNumber,function(error,result,value){
				if (result===true) primes.push(value);
			},function(error,result){
				callback(error,primes,new Date().getTime()-start);
			});
		});			
	}
};

var testresults = [];
var test = function(starting,threads,callback) {
	performanceTest(starting,threads,function(error,results,time){
		console.log("Starting at "+starting+": "+threads+" Thread"+(threads!==1?"s":"")+" found "+results.length+" primes in "+time+"ms.");

		testresults.push({
			start: starting,
			threads: threads,
			found: results.length,
			time: time
		});
		
		callback();
	});
}

var tests = [
	[1,0],
	[1,1],
	[1,2],
	[1,3],
	[1,4],
	[1,6],
	[1,8],
	[1,12],
	[1,16],
	[1,32],
	[1000000,0],
	[1000000,1],
	[1000000,2],
	[1000000,3],
	[1000000,4],
	[1000000,6],
	[1000000,8],
	[1000000,12],
	[1000000,16],
	[1000000,32],
	[10000000,0],
	[10000000,1],
	[10000000,2],
	[10000000,3],
	[10000000,4],
	[10000000,6],
	[10000000,8],
	[10000000,12],
	[10000000,16],
	[10000000,32],
	[100000000,0],
	[100000000,1],
	[100000000,2],
	[100000000,3],
	[100000000,4],
	[100000000,6],
	[100000000,8],
	[100000000,12],
	[100000000,16],
	[100000000,32],
	[1000000000,0],
	[1000000000,1],
	[1000000000,2],
	[1000000000,3],
	[1000000000,4],
	[1000000000,6],
	[1000000000,8],
	[1000000000,12],
	[1000000000,16],
	[1000000000,32],
];

var next = function() {
	var args = tests.shift();
	if (!args) done();
	else test(args[0],args[1],next);
};

var done = function() {
	console.log("\n\n"+JSON.stringify(testresults));
	process.exit();
};

next();