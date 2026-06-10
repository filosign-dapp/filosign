import { typeNameToString } from "./type-name";
import type {
	ErrorDefinition,
	EventDefinition,
	FunctionDefinition,
	Parameter,
	StructDefinition,
	StructMember,
} from "./types";

function formatParameter(p: Parameter): string {
	const t = typeNameToString(p.typeName);
	const name = p.name || "";
	const storageLocation = p.storageLocation || "";
	const locationStr =
		storageLocation && storageLocation !== "default"
			? ` ${storageLocation}`
			: "";
	return name ? `${t}${locationStr} ${name}` : `${t}${locationStr}`;
}

export function paramListToString(paramList: Parameter[] | undefined): string {
	if (!paramList || !Array.isArray(paramList)) return "";
	return paramList.map(formatParameter).join(", ");
}

export function returnsToString(paramList: Parameter[] | undefined): string {
	if (!paramList || !Array.isArray(paramList) || paramList.length === 0) {
		return "";
	}
	return paramList.map(formatParameter).join(", ");
}

export function functionToSignature(node: FunctionDefinition): string {
	const name = node.name || "";

	if (
		!name ||
		name === "constructor" ||
		name === "receive" ||
		name === "fallback"
	) {
		return "";
	}

	const params = paramListToString(node.parameters);
	const returns = node.returnParameters
		? returnsToString(node.returnParameters)
		: "";
	const stateMut =
		node.stateMutability && node.stateMutability !== "nonpayable"
			? node.stateMutability
			: "";

	const visibility = node.visibility || "";
	if (visibility === "private" || visibility === "internal") return "";

	const parts = [];
	parts.push(`function ${name}(${params})`);
	parts.push("external");
	if (stateMut) parts.push(stateMut);
	if (returns) parts.push(`returns (${returns})`);

	return `${parts.join(" ")};`;
}

export function eventToSignature(node: EventDefinition): string {
	const name = node.name;
	const params = node.parameters?.parameters
		? node.parameters.parameters
				.map((p: Parameter) => {
					const type = typeNameToString(p.typeName);
					const indexed = p.indexed ? " indexed" : "";
					const pname = p.name ? ` ${p.name}` : "";
					return `${type}${indexed}${pname}`;
				})
				.join(", ")
		: "";
	return `event ${name}(${params});`;
}

export function structToDefinition(node: StructDefinition): string {
	const name = node.name;
	const members = node.members
		? node.members
				.map((member: StructMember) => {
					const type = typeNameToString(member.typeName);
					const memberName = member.name;
					return `        ${type} ${memberName};`;
				})
				.join("\n")
		: "";

	return `    struct ${name} {\n${members}\n    }`;
}

export function errorToSignature(node: ErrorDefinition): string {
	const name = node.name;
	const params = node.parameters ? paramListToString(node.parameters) : "";
	return `error ${name}(${params});`;
}
