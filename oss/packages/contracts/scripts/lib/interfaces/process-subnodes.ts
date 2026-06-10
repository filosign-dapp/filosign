import {
	publicGetterSignature,
	resolvePublicVariableName,
} from "./public-getter";
import {
	errorToSignature,
	eventToSignature,
	functionToSignature,
	structToDefinition,
} from "./signatures";
import type {
	ContractDefinition,
	EnumDefinition,
	ErrorDefinition,
	EventDefinition,
	FunctionDefinition,
	StateVariableDeclaration,
	StructDefinition,
	VariableDeclaration,
} from "./types";

function processEnumSubNode(enumDef: EnumDefinition): string[] {
	const members = enumDef.members?.map((m) => m.name).join(", ") ?? "";
	return [`    enum ${enumDef.name} { ${members} }`, ""];
}

function processStructSubNode(structDef: StructDefinition): string[] {
	return [structToDefinition(structDef), ""];
}

function processFunctionSubNode(fn: FunctionDefinition): string[] {
	const sig = functionToSignature(fn);
	return sig ? [`    ${sig}`] : [];
}

function processEventSubNode(event: EventDefinition): string[] {
	return [`    ${eventToSignature(event)}`];
}

function processErrorSubNode(error: ErrorDefinition): string[] {
	return [`    ${errorToSignature(error)}`];
}

function processPublicVariableSubNode(
	varDecl: VariableDeclaration,
	immutableVars: Map<string, { varName: string; type: string }>,
): string[] {
	if (varDecl.visibility !== "public") return [];
	const varName = resolvePublicVariableName(varDecl, immutableVars);
	return [`    ${publicGetterSignature(varName, varDecl.typeName)}`];
}

function processStateVariableSubNode(
	stateVarDecl: StateVariableDeclaration,
	immutableVars: Map<string, { varName: string; type: string }>,
): string[] {
	if (!stateVarDecl.variables?.length) return [];

	const lines: string[] = [];
	for (const variable of stateVarDecl.variables) {
		if (variable.visibility !== "public") continue;
		const varName = resolvePublicVariableName(variable, immutableVars);
		lines.push(`    ${publicGetterSignature(varName, variable.typeName)}`);
	}
	return lines;
}

export function processContractSubNodes(
	contractNode: ContractDefinition,
	immutableVars: Map<string, { varName: string; type: string }>,
): string[] {
	const lines: string[] = [];
	if (!contractNode.subNodes?.length) return lines;

	for (const sub of contractNode.subNodes) {
		switch (sub.type) {
			case "EnumDefinition":
				lines.push(...processEnumSubNode(sub as EnumDefinition));
				break;
			case "StructDefinition":
				lines.push(...processStructSubNode(sub as StructDefinition));
				break;
			case "FunctionDefinition":
				lines.push(...processFunctionSubNode(sub as FunctionDefinition));
				break;
			case "EventDefinition":
				lines.push(...processEventSubNode(sub as EventDefinition));
				break;
			case "ErrorDefinition":
				lines.push(...processErrorSubNode(sub as ErrorDefinition));
				break;
			case "VariableDeclaration":
				lines.push(
					...processPublicVariableSubNode(
						sub as VariableDeclaration,
						immutableVars,
					),
				);
				break;
			case "StateVariableDeclaration":
				lines.push(
					...processStateVariableSubNode(
						sub as StateVariableDeclaration,
						immutableVars,
					),
				);
				break;
			default:
				break;
		}
	}

	return lines;
}
