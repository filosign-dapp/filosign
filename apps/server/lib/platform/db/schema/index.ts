import * as attachmentPackets from "./attachment-packets";
import * as billing from "./billing";
import * as drafts from "./drafts";
import * as file from "./file";
import * as jobOutbox from "./job-outbox";
import * as organization from "./organization";
import * as platformAccess from "./platform-access";
import * as settlementAccess from "./settlement-access";
import * as settlements from "./settlements";
import * as user from "./user";

const schema = {
	...user,
	...file,
	...attachmentPackets,
	...settlementAccess,
	...settlements,
	...billing,
	...organization,
	...drafts,
	...platformAccess,
	...jobOutbox,
};

export * from "./attachment-packets";
export * from "./billing";
export * from "./drafts";
export * from "./file";
export * from "./job-outbox";
export * from "./organization";
export * from "./platform-access";
export * from "./settlement-access";
export * from "./settlements";
export * from "./user";

export default schema;
