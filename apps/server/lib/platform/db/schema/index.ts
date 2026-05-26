import * as billing from "./billing";
import * as file from "./file";
import * as organization from "./organization";
import * as settlements from "./settlements";
import * as user from "./user";

const schema = {
	...user,
	...file,
	...settlements,
	...billing,
	...organization,
};

export * from "./billing";
export * from "./file";
export * from "./organization";
export * from "./settlements";
export * from "./user";

export default schema;
