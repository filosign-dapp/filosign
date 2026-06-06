import { extractUserDefinedTypes } from "./type-name";
import type {
	ContractDefinition,
	FunctionDefinition,
	StateVariableDeclaration,
	VariableDeclaration,
} from "./types";

export function collectReferencedInterfaceTypes(
	contractNode: ContractDefinition,
): Set<string> {
	const types = new Set<string>();
	if (!contractNode.subNodes) return types;

	for (const sub of contractNode.subNodes) {
		if (sub.type === "FunctionDefinition") {
			const fn = sub as FunctionDefinition;
			for (const p of fn.parameters ?? []) {
				extractUserDefinedTypes(p.typeName, types, true);
			}
			for (const p of fn.returnParameters ?? []) {
				extractUserDefinedTypes(p.typeName, types, true);
			}
		} else if (sub.type === "VariableDeclaration") {
			extractUserDefinedTypes(
				(sub as VariableDeclaration).typeName,
				types,
				true,
			);
		} else if (sub.type === "StateVariableDeclaration") {
			const stateVar = sub as StateVariableDeclaration;
			for (const v of stateVar.variables ?? []) {
				extractUserDefinedTypes(v.typeName, types, true);
			}
		}
	}

	return types;
}
