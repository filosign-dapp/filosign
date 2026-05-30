import { customType, timestamp } from "drizzle-orm/pg-core";
import {
	type Address,
	checksumAddress,
	getAddress,
	type Hash,
	type Hex,
	isAddress,
	isHash,
	isHex,
} from "viem";

export const timestamps = {
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp({ withTimezone: true }),
};

export const tEvmAddress = customType<{
	data: Address;
	driverData: string;
}>({
	dataType() {
		return "text";
	},
	toDriver(value) {
		if (!isAddress(value)) {
			throw new Error(`Invalid EVM address: ${value}`);
		}
		return checksumAddress(value);
	},
	fromDriver(value) {
		return getAddress(value);
	},
});

export const tBytes32 = customType<{
	data: Hash;
	driverData: string;
}>({
	dataType() {
		return "text";
	},
	toDriver(value) {
		if (!isHash(value)) {
			throw new Error(`Invalid hash: ${value}`);
		}
		return value;
	},
	fromDriver(value) {
		if (!isHex(value)) {
			throw new Error(`Invalid hex: ${value}`);
		}
		return value;
	},
});

export const tHex = customType<{
	data: Hex;
	driverData: string;
}>({
	dataType() {
		return "text";
	},
	toDriver(value) {
		if (!isHex(value)) {
			throw new Error(`Invalid hex: ${value}`);
		}
		return value;
	},
	fromDriver(value) {
		if (!isHex(value)) {
			throw new Error(`Invalid hex: ${value}`);
		}
		return value;
	},
});
