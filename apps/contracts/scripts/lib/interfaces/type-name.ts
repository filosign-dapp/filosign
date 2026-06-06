import type { TypeName } from "./types";

export function isInterfaceType(name: string): boolean {
	return (
		name.startsWith("I") &&
		name !== "int" &&
		name !== "int8" &&
		name !== "int16" &&
		name !== "int24" &&
		name !== "int32" &&
		name !== "int64" &&
		name !== "int128" &&
		name !== "int256"
	);
}

function userDefinedNameFromPath(node: TypeName): string {
	if (typeof node.namePath === "string") {
		return node.namePath;
	}
	if (node.namePath && (node.namePath as { name: string }).name) {
		return (node.namePath as { name: string }).name;
	}
	if (Array.isArray(node.namePath)) {
		return node.namePath
			.map((p: string | { name?: string }) =>
				typeof p === "string" ? p : (p.name ?? p),
			)
			.join(".");
	}
	return node.name ?? "UnknownType";
}

function arrayLengthSuffix(length: TypeName["length"]): string {
	if (!length) return "[]";
	if (typeof length === "string") return `[${length}]`;
	if (typeof length === "object") {
		const val =
			(length as { number?: string }).number ??
			(length as { value?: string }).value ??
			(length as { name?: string }).name;
		if (typeof val === "string") return `[${val}]`;
	}
	return "[]";
}

function elementaryTypeNameToString(node: TypeName): string {
	return node.name ?? "UnknownType";
}

function userDefinedTypeNameToString(node: TypeName): string {
	return userDefinedNameFromPath(node);
}

function arrayTypeNameToString(node: TypeName): string {
	const baseType = node.baseTypeName
		? typeNameToString(node.baseTypeName)
		: "UnknownType";
	return `${baseType}${arrayLengthSuffix(node.length)}`;
}

function mappingTypeNameToString(node: TypeName): string {
	const key = node.keyType ? typeNameToString(node.keyType) : "UnknownType";
	const value = node.valueType
		? typeNameToString(node.valueType)
		: "UnknownType";
	return `mapping(${key} => ${value})`;
}

export function typeNameToString(node: TypeName): string {
	if (!node) return "";
	switch (node.type) {
		case "ElementaryTypeName":
			return elementaryTypeNameToString(node);
		case "UserDefinedTypeName":
			return userDefinedTypeNameToString(node);
		case "ArrayTypeName":
			return arrayTypeNameToString(node);
		case "Mapping":
			return mappingTypeNameToString(node);
		case "FunctionTypeName":
			return "function";
		default:
			return node.name ?? "UnknownType";
	}
}

export function needsDataLocation(typeName: string): boolean {
	if (typeName === "string" || typeName === "bytes") return true;
	if (typeName.endsWith("[]")) return true;
	if (typeName.startsWith("mapping(")) return true;
	if (
		typeName[0] === typeName[0].toUpperCase() &&
		typeName !== "address" &&
		!typeName.startsWith("I") &&
		!typeName.startsWith("Uint") &&
		!typeName.startsWith("Int") &&
		!typeName.startsWith("Bytes")
	) {
		return true;
	}
	return false;
}

export function extractMappingParams(
	typeName: TypeName,
	paramNames: string[] = [],
): { params: string[]; returnType: string } {
	if (typeName.type === "Mapping") {
		const keyType = typeName.keyType
			? typeNameToString(typeName.keyType)
			: "UnknownType";
		const paramName = paramNames.length > 0 ? paramNames[0] : "key";
		const keyParam = needsDataLocation(keyType)
			? `${keyType} calldata ${paramName}`
			: `${keyType} ${paramName}`;

		const nextParamNames =
			paramNames.length > 1
				? paramNames.slice(1)
				: [`key${paramNames.length + 1}`];
		const nested = typeName.valueType
			? extractMappingParams(typeName.valueType, nextParamNames)
			: { params: [], returnType: "UnknownType" };

		return {
			params: [keyParam, ...nested.params],
			returnType: nested.returnType,
		};
	}

	return {
		params: [],
		returnType: typeNameToString(typeName),
	};
}

export function extractUserDefinedTypes(
	node: TypeName,
	out: Set<string>,
	interfaceTypesOnly: boolean,
): void {
	if (!node) return;
	switch (node.type) {
		case "UserDefinedTypeName": {
			const name = userDefinedNameFromPath(node);
			if (
				name &&
				name[0] === name[0].toUpperCase() &&
				(!interfaceTypesOnly || isInterfaceType(name))
			) {
				out.add(name);
			}
			break;
		}
		case "ArrayTypeName":
			if (node.baseTypeName) {
				extractUserDefinedTypes(node.baseTypeName, out, interfaceTypesOnly);
			}
			break;
		case "Mapping":
			if (node.keyType) {
				extractUserDefinedTypes(node.keyType, out, interfaceTypesOnly);
			}
			if (node.valueType) {
				extractUserDefinedTypes(node.valueType, out, interfaceTypesOnly);
			}
			break;
		default:
			break;
	}
}
