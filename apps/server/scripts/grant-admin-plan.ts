import { grantDevPlansForAdminEmail } from "@/lib/domains/platform-access";
import { parsePlatformAdminEmails } from "@/lib/platform/admin";

const emails = parsePlatformAdminEmails();
if (emails.size === 0) {
	console.error(
		"No PLATFORM_ADMIN_EMAILS configured. Set comma-separated admin emails in server env.",
	);
	process.exit(1);
}

let totalOrg = 0;

for (const email of emails) {
	const result = await grantDevPlansForAdminEmail(email);
	console.log(
		`${email}: org=${result.orgGrants} (0 means no owned org rows yet)`,
	);
	totalOrg += result.orgGrants;
}

console.log(`Done. orgGrants=${totalOrg}`);
