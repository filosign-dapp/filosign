import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const billingSearchSchema = z.object({
	upgrade: z.string().optional(),
	interval: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/")({
	validateSearch: billingSearchSchema,
	beforeLoad: ({ search }) => {
		throw redirect({
			to: "/dashboard/document/all",
			search,
		});
	},
});
