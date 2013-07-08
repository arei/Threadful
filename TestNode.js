var ThreadSafe = require("./ThreadSafe");

if (!ThreadSafe) {
	console.log("ThreadSafe.js Found Test: FAILED.");
	return;
}
console.log("ThreadSafe.js Found Test: Passed");

var w = new ThreadSafe.Thread();
if (!w) {
	console.log("ThreadSafe.Thread Test: FAILED");
	return;
}
console.log("ThreadSafe.Thread Test: Passed");

w.install("test1",function(a,b,c){
	return a+b+c;
},function(error,result){
	if (!error) console.log("Install Test 1: Passed: ",result);
	else console.log("Install Test 1: FAILED");
});

w.install("test2",function(xyz){
	return xyz+"test2";
},function(error,result){
	if (!error) console.log("Install Test 2: Passed: ",result);
	else console.log("Install Test 2: FAILED");
});

w.list(function(error,result){
	if (!error && result[0]==="test1" && result[1]==="test2") console.log("List Test 1: Passed: ",result);				
	else console.log("List Test 1: FAILED");
});

w.execute("test1",1,2,3,function(error,result){
	if (!error && result===6) console.log("Execute Test 1: Passed: ",result);
	else console.log("Execute Test 1: FAILED");
});

w.execute("test2","abc",function(error,result){
	if (!error && result==="abctest2") console.log("Execute Test 2: Passed: ",result);				
	else console.log("Execute Test 2: FAILED");
});

try {
	w.execute("test3","abc",function(error,result){
		console.log("Execute Test 3: FAILED: ",result);				
	});
}
catch (ex) {
	console.log("Execute Test 3: Passed: ");
};

var threadtest1 = w.threadify(function(){
	var a = Array.prototype.slice.call(arguments);
	var x = 0;
	for (var i=0;i<a.length;i++) x += a[i];
	return x;
});

w.list(function(error,result){
	if (!error && result[0]==="test1" && result[1]==="test2") console.log("List Test 2: Passed: ",result);				
	else console.log("List Test 2: FAILED");
});

threadtest1(1,2,3,4,function(error,result){
	if (!error && result===10) console.log("Threadify Test 1: Passed: ",result);				
	else console.log("Threadify Test 1: FAILED",error,result);
});

threadtest1(3,4,7,function(error,result){
	if (!error && result===14) console.log("Threadify Test 2: Passed: ",result);				
	else console.log("Threadify Test 2: FAILED");
});

w.status(function(error,result){
	console.log("Status Test 1: Passed: ",result);
});

w.uninstall("test1");

var threadtest2 = ThreadSafe.Threadify(function(a,b,c){
	return a+b+c;
});

threadtest2("quick","brown","fox",function(error,result){
	if (!error && result==="quickbrownfox") console.log("Threadify Test 3: Passed: ",result);				
	else console.log("Threadify Test 3: FAILED");
});

var executetest1 = ThreadSafe.Execute(function(a,b,c){
	return a-b-c;
},1,2,3,function(error,result){
	if (!error && result===-4) console.log("Execute Test 4: Passed: ",result);				
	else console.log("Execute Test 4: FAILED");					
});

setTimeout(function(){
	ThreadSafe.CloseAll();
},1000);