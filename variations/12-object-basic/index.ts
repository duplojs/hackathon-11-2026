import * as DCommon from "@duplojs/lang/common";

interface User {
	name: string;
	age: number;
	email?: string;
}

function createUser(name: string, age: number): User {
	return { name, age };
}

function withEmail(user: User, email: string): User {
	return { ...user, email };
}

function describe(user: User) {
	return `${user.name} (${user.age})`;
}

const alice = createUser("Alice", 30);
const bob = withEmail(createUser("Bob", 25), "bob@example.com");
const point = { x: 1, y: 2 };
const nested = { label: "origine", point, tags: ["a", "b"] };

DCommon.print(alice);
DCommon.print(bob);
DCommon.print(describe(alice));
DCommon.print(point.x + point.y);
DCommon.print(nested);
DCommon.print(nested.tags.length);
DCommon.print(nested.tags[1]);
DCommon.print(bob.email ?? "sans email");
DCommon.print(alice.email ?? "sans email");
DCommon.print({});
