import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

export function TemplatesSection() {
	const { activeOrgId, templates, cloneTemplate, setCreateForm, navigate } =
		useTeamSettings();

	if (!activeOrgId || !templates || templates.length === 0) return null;

	return (
		<section className="space-y-3 rounded-lg border border-border p-6">
			<h2 className="text-sm font-medium">Templates</h2>
			<ul className="space-y-2 text-sm">
				{templates.map((t) => (
					<li
						key={t.id}
						className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
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
											const fields =
												(
													res as {
														placementManifest?: {
															fields?: Array<{
																assignedRecipientEmail?: string;
															}>;
														};
													}
												).placementManifest?.fields ?? [];
											const signerEmails = [
												...new Set(
													fields
														.map((f) =>
															f.assignedRecipientEmail?.trim().toLowerCase(),
														)
														.filter((v): v is string => Boolean(v)),
												),
											];
											setCreateForm({
												documents: [
													{
														id: t.id,
														name: (res as { document: { name: string } })
															.document.name,
														type: "application/pdf",
														size: 0,
														dataUrl: (res as { document: { dataUrl: string } })
															.document.dataUrl,
													},
												],
												recipients: signerEmails.map((email) => ({
													name: email,
													email,
													role: "signer" as const,
												})),
												emailMessage: "",
												emailSubject: "",
											});
											void navigate({
												to: "/dashboard/envelope/create/add-sign",
											});
										},
										onError: (e) => {
											toast.error(
												e instanceof Error
													? e.message
													: "Template clone failed",
											);
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
