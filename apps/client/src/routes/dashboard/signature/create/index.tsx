import { createFileRoute } from "@tanstack/react-router";
import { SignatureCreatePage } from "./-components/page";
import { SignatureCreateProvider } from "./-lib/context/context";
import { useSignatureCreateController } from "./-lib/hooks/use-signature-create-controller";

function SignatureCreateRoutePage() {
	const controller = useSignatureCreateController();
	return (
		<SignatureCreateProvider value={controller}>
			<SignatureCreatePage />
		</SignatureCreateProvider>
	);
}

export const Route = createFileRoute("/dashboard/signature/create/")({
	component: SignatureCreateRoutePage,
});
