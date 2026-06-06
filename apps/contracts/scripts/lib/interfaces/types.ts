import path from "node:path";

export const SRC_DIR = path.resolve(process.cwd(), "./src");
export const OUT_DIR = path.join(SRC_DIR, "interfaces");
export const SPDX_HEADER = "// SPDX-License-Identifier: MIT"; // change latr

/** Manual interfaces in src/interfaces/ preserved during generation (not auto-generated from contracts) */
export const PRESERVED_INTERFACES = new Set<string>();

export interface PragmaDirective {
	type: string;
	name: string;
	value: string;
}

export interface TypeName {
	type: string;
	name?: string;
	namePath?: string | { name: string } | string[];
	baseTypeName?: TypeName;
	length?:
		| string
		| { type?: string; number?: string; value?: string; name?: string };
	keyType?: TypeName;
	valueType?: TypeName;
}

export interface Parameter {
	type: string;
	typeName: TypeName;
	name?: string;
	storageLocation?: string;
	indexed?: boolean;
}

export interface ParameterList {
	type: string;
	parameters?: Parameter[];
}

export interface FunctionDefinition {
	type: string;
	name?: string;
	parameters?: Parameter[];
	returnParameters?: Parameter[];
	stateMutability?: string;
	visibility?: string;
}

export interface EventDefinition {
	type: string;
	name: string;
	parameters?: ParameterList;
}

export interface StructMember {
	type: string;
	typeName: TypeName;
	name: string;
}

export interface StructDefinition {
	type: string;
	name: string;
	members?: StructMember[];
}

export interface EnumDefinition {
	type: string;
	name: string;
	members?: { name: string }[];
}

export interface ErrorDefinition {
	type: string;
	name: string;
	parameters?: Parameter[];
}

export interface VariableDeclaration {
	type: string;
	visibility?: string;
	typeName: TypeName;
	name: string;
}

export interface StateVariableDeclaration {
	type: string;
	variables?: VariableDeclaration[];
}

export interface ContractDefinition {
	type: string;
	name: string;
	kind: string;
	subNodes?: (
		| StructDefinition
		| EnumDefinition
		| FunctionDefinition
		| EventDefinition
		| ErrorDefinition
		| VariableDeclaration
		| StateVariableDeclaration
	)[];
}
