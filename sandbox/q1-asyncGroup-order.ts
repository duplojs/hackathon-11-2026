import * as DEither from "@duplojs/lang/either";

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(label: string) {
	console.log(`${label} @ t+${Date.now() - start}ms`);
}

const start = Date.now();

async function factory(name: string, ms: number) {
	log(`${name} start`);
	await wait(ms);
	log(`${name} end`);
	return DEither.success(name);
}

console.log("--- array form ---");
await DEither.asyncGroup([
	() => factory("A(300ms)", 300),
	() => factory("B(100ms)", 100),
	() => factory("C(200ms)", 200),
]);

console.log("\n--- object form ---");
const start2 = Date.now();
await DEither.asyncGroup({
	a: () => factory("a(300ms)", 300),
	b: () => factory("b(100ms)", 100),
	c: () => factory("c(200ms)", 200),
});

console.log("\n--- for comparison: Promise.all ---");
const start3 = Date.now();
function logParallel(label: string) {
	console.log(`${label} @ t+${Date.now() - start3}ms`);
}
async function factoryParallel(name: string, ms: number) {
	logParallel(`${name} start`);
	await wait(ms);
	logParallel(`${name} end`);
	return name;
}
await Promise.all([
	factoryParallel("A(300ms)", 300),
	factoryParallel("B(100ms)", 100),
	factoryParallel("C(200ms)", 200),
]);
