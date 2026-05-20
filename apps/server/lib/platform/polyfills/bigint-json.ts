// @ts-expect-error extend builtin for JSON compatibility
BigInt.prototype.toJSON = function (this: bigint) {
	return this.toString();
};
