import * as activation from "./activation";
import * as attachmentPackets from "./attachment-packets";
import * as audit from "./audit";
import * as billing from "./billing";
import * as drafts from "./drafts";
import * as feedback from "./feedback";
import * as file from "./file";
import * as foc from "./foc";
import * as jobOutbox from "./job-outbox";
import * as notifications from "./notifications";
import * as organization from "./organization";
import * as platformAccess from "./platform-access";
import * as privacy from "./privacy";
import * as settlementAccess from "./settlement-access";
import * as settlements from "./settlements";
import * as systemTemplates from "./system-templates";
import * as user from "./user";

const schema = {
	...user,
	...activation,
	...audit,
	...file,
	...foc,
	...feedback,
	...attachmentPackets,
	...settlementAccess,
	...settlements,
	...systemTemplates,
	...billing,
	...organization,
	...drafts,
	...platformAccess,
	...privacy,
	...jobOutbox,
	...notifications,
};

export * from "./activation";
export * from "./attachment-packets";
export * from "./audit";
export * from "./billing";
export * from "./drafts";
export * from "./feedback";
export * from "./file";
export * from "./foc";
export * from "./job-outbox";
export * from "./notifications";
export * from "./organization";
export * from "./platform-access";
export * from "./privacy";
export * from "./settlement-access";
export * from "./settlements";
export * from "./system-templates";
export * from "./user";

export default schema;
