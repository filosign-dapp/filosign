import z from "zod";

export const zOrgMemberRole = z.enum(["owner", "admin", "sender", "viewer"]);
