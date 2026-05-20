import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useEnvelopeRecipientLimit,
	useMonthlyDocumentQuota,
	useRefetchEntitlementsOnMount,
} from "@filosign/react/billing";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { EntitlementPlanHint } from "@/src/lib/components/shared/EntitlementPlanHint";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { UserDropdown } from "@/src/routes/dashboard/_shell/-components/user-dropdown";
import DocumentsSection from "./-components/DocumentUpload";
import RecipientsSection from "./-components/RecipientsSection";
import {
	EntitlementUpgradeProvider,
	usePromptPlanUpgrade,
} from "./-lib/context/entitlement-upgrade-context";
import { EnvelopeDraftProvider } from "./-lib/context/envelope-draft-context";
import type { EnvelopeForm, StoredDocument } from "./-lib/types";

function isValidRecipientEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function CreateEnvelopePage() {
	return (
		<EntitlementUpgradeProvider>
			<CreateEnvelopePageContent />
		</EntitlementUpgradeProvider>
	);
}

function CreateEnvelopePageContent() {
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const captureAppEvent = useCaptureAppEvent();
	useRefetchEntitlementsOnMount();
	const { isWithinRecipientLimit } = useEnvelopeRecipientLimit();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();

	const form = useForm({
		defaultValues: {
			recipients: [],
			emailMessage: "",
			emailSubject: "",
			documents: [],
		} as EnvelopeForm,
		onSubmit: async ({ value }) => {
			if (isMonthlyQuotaExhausted) {
				promptPlanUpgrade("documents.sent.monthly");
				return;
			}

			if (!value.documents || value.documents.length === 0) {
				toast.error("Please upload at least one document");
				return;
			}

			if (!value.recipients || value.recipients.length === 0) {
				toast.error("Please add at least one recipient");
				return;
			}

			const invalidRecipients = value.recipients.filter(
				(r) => !isValidRecipientEmail(r.email ?? ""),
			);
			if (invalidRecipients.length > 0) {
				toast.error("Enter a valid email for every recipient");
				return;
			}

			if (!isWithinRecipientLimit(value.recipients.length)) {
				promptPlanUpgrade("envelope.recipients.max");
				return;
			}

			try {
				const storedDocuments: StoredDocument[] = await Promise.all(
					value.documents.map(async (doc) => {
						const dataUrl = await new Promise<string>((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = reject;
							reader.readAsDataURL(doc.file);
						});

						return {
							id: doc.id,
							name: doc.name,
							size: doc.size,
							type: doc.type,
							dataUrl,
						};
					}),
				);

				const createFormData = {
					recipients: value.recipients,
					emailMessage: value.emailMessage,
					emailSubject: "",
					documents: storedDocuments,
				};

				setCreateForm(createFormData);

				captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeComposeSubmitted, {
					recipient_count: value.recipients.length,
				});

				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
				toast.error("Failed to prepare documents. Please try again.", {
					id: "prepare-progress",
				});
			}
		},
	});
	const showValidationErrors = hasAttemptedSubmit;
	const documentsSubmitError =
		showValidationErrors && form.state.values.documents.length === 0
			? "Please upload at least one document"
			: undefined;

	return (
		<div className="min-h-screen bg-background">
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<h3>Create New Document</h3>
				</div>

				<UserDropdown />
			</header>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setHasAttemptedSubmit(true);
					form.handleSubmit();
				}}
			>
				<main className="p-8 mx-auto space-y-8 max-w-4xl">
					<EntitlementPlanHint />
					<form.Field
						name="documents"
						validators={{
							onChange: ({ value }) => {
								if (!value || value.length === 0) {
									return "Please upload at least one document";
								}
								return undefined;
							},
						}}
					>
						{(documentsField) => (
							<form.Field
								name="recipients"
								validators={{
									onChange: ({ value }) => {
										if (!value || value.length === 0) {
											return "Please add at least one recipient";
										}
										const invalid = value.filter(
											(r) => !isValidRecipientEmail(r.email ?? ""),
										);
										if (invalid.length > 0) {
											return "Enter a valid email for every recipient";
										}
										return undefined;
									},
								}}
							>
								{(recipientsField) => (
									<EnvelopeDraftProvider
										value={{
											documentsField: {
												value: documentsField.state.value,
												onChange: documentsField.handleChange,
												error:
													documentsField.state.meta.errors?.[0] ??
													documentsSubmitError,
												showError: showValidationErrors,
											},
											recipientsField: {
												value: recipientsField.state.value,
												onChange: recipientsField.handleChange,
												error: recipientsField.state.meta.errors?.[0],
												showError: showValidationErrors,
											},
										}}
									>
										<DocumentsSection />
										<RecipientsSection />
									</EnvelopeDraftProvider>
								)}
							</form.Field>
						)}
					</form.Field>
				</main>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 230,
						damping: 25,
						delay: 0.7,
					}}
					className="flex justify-end px-8 mb-8 mx-auto max-w-4xl gap-4"
				>
					<Button
						type="button"
						variant="ghost"
						size="lg"
						className="gap-2"
						render={<Link to="/dashboard" />}
					>
						Back
					</Button>
					<Button
						type="submit"
						variant="primary"
						size="lg"
						className="gap-2 group transition-all duration-200"
						disabled={form.state.isSubmitting}
					>
						{form.state.isSubmitting ? "Submitting..." : "Next Step"}
					</Button>
				</motion.div>
			</form>
		</div>
	);
}

export const Route = createFileRoute("/dashboard/envelope/create/")({
	component: CreateEnvelopePage,
});
