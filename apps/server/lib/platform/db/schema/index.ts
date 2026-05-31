import * as billing from "./billing";
import * as drafts from "./drafts";
import * as file from "./file";
import * as organization from "./organization";
import * as platformAccess from "./platform-access";
import * as settlements from "./settlements";
import * as user from "./user";

const schema = {
	...user,
	...file,
	...settlements,
	...billing,
	...organization,
	...drafts,
	...platformAccess,
};

export * from "./billing";
export * from "./drafts";
export * from "./file";
export * from "./organization";
export * from "./platform-access";
export * from "./settlements";
export * from "./user";

export default schema;
