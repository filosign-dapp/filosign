import type { OrgMemberRole } from "@/lib/platform/db/schema/organization";

export type OrgPermission =
	| "org:manage"
	| "members:invite"
	| "members:remove"
	| "templates:write"
	| "templates:use"
	| "documents:send"
	| "documents:read:org"
	| "drafts:read"
	| "drafts:write"
	| "drafts:share"
	| "connections:manage"
	| "connections:request"
	| "connections:view"
	| "billing:manage";

const ROLE_PERMISSIONS: Record<OrgMemberRole, ReadonlySet<OrgPermission>> = {
	owner: new Set([
		"org:manage",
		"members:invite",
		"members:remove",
		"templates:write",
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:manage",
		"connections:request",
		"connections:view",
		"billing:manage",
	]),
	admin: new Set([
		"org:manage",
		"members:invite",
		"members:remove",
		"templates:write",
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:manage",
		"connections:request",
		"connections:view",
		"billing:manage",
	]),
	sender: new Set([
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:request",
		"connections:view",
	]),
	viewer: new Set([
		"templates:use",
		"documents:read:org",
		"drafts:read",
		"connections:view",
	]),
};

export function orgRoleHasPermission(
	role: OrgMemberRole,
	permission: OrgPermission,
): boolean {
	return ROLE_PERMISSIONS[role].has(permission);
}
