import { describe, expect, test } from "bun:test";
import { isDashboardShellLayoutRoute } from "@/src/lib/components/app/suspense/dashboard-shell-layout";

describe("isDashboardShellLayoutRoute", () => {
	test("includes _shell layout and child routes", () => {
		expect(
			isDashboardShellLayoutRoute([
				{ routeId: "/dashboard" },
				{ routeId: "/dashboard/_shell" },
				{ routeId: "/dashboard/_shell/templates/" },
			]),
		).toBe(true);
	});

	test("excludes full-bleed dashboard routes", () => {
		expect(
			isDashboardShellLayoutRoute([
				{ routeId: "/dashboard" },
				{ routeId: "/dashboard/document/sign/" },
			]),
		).toBe(false);
		expect(
			isDashboardShellLayoutRoute([
				{ routeId: "/dashboard" },
				{ routeId: "/dashboard/envelope/create/" },
			]),
		).toBe(false);
		expect(
			isDashboardShellLayoutRoute([
				{ routeId: "/dashboard" },
				{ routeId: "/dashboard/templates/new/" },
			]),
		).toBe(false);
	});
});
