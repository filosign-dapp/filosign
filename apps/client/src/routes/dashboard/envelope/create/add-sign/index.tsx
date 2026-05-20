import { createFileRoute } from "@tanstack/react-router";
import { AddSignaturePage } from "./-components/page";
import { useAddSignController } from "./-lib/hooks/use-controller";

function AddSignRoutePage() {
	const controller = useAddSignController();
	return <AddSignaturePage controller={controller} />;
}

export const Route = createFileRoute("/dashboard/envelope/create/add-sign/")({
	component: AddSignRoutePage,
});
