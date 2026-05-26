import { Button } from "@/src/lib/components/ui/button";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import {
	buildCreateForm,
	uploadedFromDataUrl,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/envelope-draft";

export function TemplatesSection() {
	const { activeOrgId, templates, cloneTemplate, setCreateForm, navigate } =
		useWorkspaceSettings();

	if (!activeOrgId || !templates || templates.length === 0) return null;

	return (
		<section className="space-y-3 rounded-lg border border-border p-6 bg-card/30">
			<h2 className="text-sm font-medium">Workspace Templates</h2>
			<ul className="space-y-2 text-sm">
				{templates.map((t) => (
					<li
						key={t.id}
						className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 bg-background/50"
					>
						<span>{t.name}</span>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={cloneTemplate.isPending}
							onClick={() => {
								cloneTemplate.mutate(
									{ templateId: t.id },
									{
										onSuccess: (res) => {
											void (async () => {
												const docMeta = res.document;
												const fields = res.placementManifest?.fields ?? [];
												const signerEmails = [
													...new Set(
														fields
															.map((f) =>
																f.assignedRecipientEmail?.trim().toLowerCase(),
															)
															.filter((v): v is string => Boolean(v)),
													),
												];
												const draft = await buildCreateForm(
													{
														documents: [
															uploadedFromDataUrl(docMeta.dataUrl, {
																id: t.id,
																name: docMeta.name,
																type: "application/pdf",
															}),
														],
														recipients: signerEmails.map((email) => ({
															name: email,
															email,
															role: "signer" as const,
														})),
														emailMessage: "",
														emailSubject: "",
														settlementDrafts: [],
													},
													null,
												);
												setCreateForm(draft);
												void navigate({
													to: "/dashboard/envelope/create/add-sign",
												});
											})().catch((e) => console.error(e));
										},
										onError: (e) => {
											console.error(e);
										},
									},
								);
							}}
						>
							Use template
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
