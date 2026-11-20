import * as DEither from "@duplojs/lang/either";

// Affichage JSON : le format que nous comparons avec la sortie Go.
console.log(JSON.stringify(DEither.success(3), null, 2));
console.log(JSON.stringify(DEither.fail(), null, 2));
console.log("texte brut");
