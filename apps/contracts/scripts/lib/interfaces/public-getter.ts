import {
	extractMappingParams,
	needsDataLocation,
	typeNameToString,
} from "./type-name";
import type { TypeName, VariableDeclaration } from "./types";

function normalizeInterfaceReturnType(returnType: string): string {
	if (
		returnType.startsWith("I") &&
		returnType !== "int" &&
		returnType !== "int256"
	) {
		return "address";
	}
	return returnType;
}

function getterParamsAndReturn(typeName: TypeName): {
	params: string;
	returnType: string;
} {
	let params = "";
	let returnType = typeNameToString(typeName);

	if (typeName.type === "ArrayTypeName") {
		params = "uint256 index";
		returnType = typeName.baseTypeName
			? typeNameToString(typeName.baseTypeName)
			: "UnknownType";
	} else if (typeName.type === "Mapping") {
		const mappingInfo = extractMappingParams(typeName);
		params = mappingInfo.params.join(", ");
		returnType = mappingInfo.returnType;
	}

	return {
		params,
		returnType: normalizeInterfaceReturnType(returnType),
	};
}

export function publicGetterSignature(
	varName: string,
	typeName: TypeName,
): string {
	const { params, returnType } = getterParamsAndReturn(typeName);
	const returnLocation = needsDataLocation(returnType) ? " memory" : "";
	return `function ${varName}(${params}) external view returns (${returnType}${returnLocation});`;
}

export function resolvePublicVariableName(
	variable: VariableDeclaration,
	immutableVars: Map<string, { varName: string; type: string }>,
): string {
	if (variable.name !== "immutable") return variable.name;
	const immutableInfo = immutableVars.get(typeNameToString(variable.typeName));
	return immutableInfo?.varName ?? variable.name;
}
