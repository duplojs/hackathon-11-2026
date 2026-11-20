import { GoAST } from "@go";
import { type BuildContext } from "../../../../context/build";
import { eitherDependency, eitherTypeIdentifier } from "../sharedDependency";

/**
 * `Success<T> | Fail | Left<...>` → `shard_dependencies.Either`.
 * Le routeur a déjà vérifié que chaque membre de l'union est un type Either.
 */
export function unionTypeHandler(context: BuildContext) {
	return context.success({
		result: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherDependency.value),
			identifier: eitherTypeIdentifier,
		}),
	});
}
