import fjsStringify from "fast-json-stable-stringify";

function stringifyReplacer(_: string, value: unknown) {
	if (typeof value === "bigint") {
		const asNumber = Number(value);
		if (BigInt(asNumber) === value) return asNumber;
		return value.toString();
	}
	return value;
}

export const jsonStringify = (obj: unknown): string =>
	fjsStringify(JSON.parse(JSON.stringify(obj, stringifyReplacer)));

export const jsonParse = JSON.parse;

export const jsonClone = <T>(obj: T): T => {
	return jsonParse(jsonStringify(obj));
};
