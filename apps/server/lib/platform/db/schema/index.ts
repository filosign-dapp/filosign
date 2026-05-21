import * as auth from "./auth";
import * as billing from "./billing";
import * as file from "./file";
import * as organization from "./organization";
import * as payments from "./payments";
import * as shareCapability from "./sharing";
import * as user from "./user";

// Combine all schema parts
const schema = {
	...auth,
	...shareCapability,
	...user,
	...file,
	...payments,
	...billing,
	...organization,
};

export * from "./auth";
export * from "./billing";
export * from "./file";
export * from "./organization";
export * from "./payments";
export * from "./sharing";
export * from "./user";

export default schema;
