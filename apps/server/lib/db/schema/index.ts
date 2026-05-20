import * as billing from "./billing";
import * as file from "./file";
import * as organization from "./organization";
import * as shareCapability from "./sharing";
import * as user from "./user";

// Combine all schema parts
const schema = {
	...shareCapability,
	...user,
	...file,
	...billing,
	...organization,
};

export * from "./billing";
export * from "./file";
export * from "./organization";
export * from "./sharing";
export * from "./user";

export default schema;
