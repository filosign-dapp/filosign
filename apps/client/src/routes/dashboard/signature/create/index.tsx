import { createFileRoute } from "@tanstack/react-router";
import { CreateNewSignaturePage } from "./-components/CreateNewSignaturePage";

export const Route = createFileRoute("/dashboard/signature/create/")({
	component: CreateNewSignaturePage,
});
