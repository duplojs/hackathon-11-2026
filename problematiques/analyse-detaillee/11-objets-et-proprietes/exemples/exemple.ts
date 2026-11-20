// Accès à une propriété commune à plusieurs types, et modification d'un objet partagé.
import * as DCommon from "@duplojs/lang/common";

type User = { name: string; age: number };
type Product = { name: string; price: number };

function label(item: User | Product) {
	return item.name;
}

function rename(user: User) {
	user.name = "Ada";
}

const user: User = { name: "Grace", age: 36 };
const product: Product = { name: "Clavier", price: 49 };

DCommon.print(label(user));    // Grace
DCommon.print(label(product)); // Clavier

rename(user);
DCommon.print(user.name);      // Ada : l'objet de l'appelant a été modifié
