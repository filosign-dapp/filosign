import type { OrgMemberRole } from "@/lib/db/schema/organization";

export type OrgPermission =
	| "org:manage"
	| "members:invite"
	| "members:remove"
	| "templates:write"
	| "templates:use"
	| "documents:send"
	| "documents:read:org"
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
		"connections:manage",
		"connections:request",
		"connections:view",
	]),
	sender: new Set([
		"templates:use",
		"documents:send",
		"documents:read:org",
		"connections:request",
		"connections:view",
	]),
	viewer: new Set(["templates:use", "documents:read:org", "connections:view"]),
};

export function orgRoleHasPermission(
	role: OrgMemberRole,
	permission: OrgPermission,
): boolean {
	return ROLE_PERMISSIONS[role].has(permission);
}
