var Threadful = require("./../../threadful.js");
var pool = new Threadful.ThreadPool({
	threads: 1
});

var timeLimit = 10000;
var starting = 10000000;

var current = starting;
var primes = [];

var reset = function() {
	current = starting;
	primes = [];
};

var nextNumber = function() {
	current += 1;
	return current;
};

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

reset();
console.log("\nCalculating Primes on main thread...");
var start = new Date().getTime();
while (true) {
	var n = nextNumber();
	var p = isPrime(n);
	if (p) primes.push(n);;
	var t = new Date().getTime()-start;
	if (t>=timeLimit) {
		console.log("Found "+primes.length+" prime numbers in "+t+" ms.");
		break;
	}
}

reset();
console.log("\nCalculating Primes on ThreadPool...");
pool.install("isPrime",isPrime,function(error,result){
	start = new Date().getTime();
	pool.distribute("isPrime",nextNumber,function(error,result,value){
		if (result===true) primes.push(value);
		var t = new Date().getTime()-start;
		if (t>=timeLimit) {
			console.log("Found "+primes.length+" prime numbers in "+t+" ms.");
			done();
		}
	},function(error,result){
		done();
	});
});

var done = function() {
	process.exit();
};