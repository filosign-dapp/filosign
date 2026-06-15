import { countFieldsForDocument, TEMPLATE_LIMITS } from "@filosign/shared";
import { FilePdfIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { useAddSignChrome } from "@/src/lib/domains/placement/context";
import {
	appendDocumentsToCreateForm,
	applyTemplateEditorMutation,
	templateEditorStateFromCreateForm,
} from "@/src/lib/domains/templates/template-composer";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";

export function TemplateDocumentsPanel() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { currentDocumentId, handleDocumentSelect } = useAddSignChrome();
	const uploadRef = useRef<HTMLInputElement>(null);
	const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	const documents = createForm?.documents ?? [];

	const fieldCounts = useMemo(() => {
		if (!createForm) return new Map<string, number>();
		const state = templateEditorStateFromCreateForm(createForm);
		return new Map(
			documents.map((doc) => [
				doc.id,
				countFieldsForDocument({ state, documentId: doc.id }),
			]),
		);
	}, [createForm, documents]);

	const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0 || !createForm) return;

		const invalid = files.find((file) => file.type !== "application/pdf");
		if (invalid) {
			toastUser.error("Upload PDF files only.");
			return;
		}

		const totalCount = documents.length + files.length;
		if (totalCount > TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS) {
			toastUser.error(
				`A template can have at most ${TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS} documents. Current: ${documents.length}, tried to add: ${files.length}.`,
			);
			return;
		}

		const oversized = files.filter(
			(file) => file.size > TEMPLATE_LIMITS.MAX_FILE_SIZE,
		);
		if (oversized.length > 0) {
			toastUser.error(
				`Documents exceed the maximum file size of ${TEMPLATE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversized.map((f) => f.name).join(", ")}`,
			);
			return;
		}

		const currentTotalBytes = documents.reduce((sum, doc) => sum + doc.size, 0);
		const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
		if (
			currentTotalBytes + incomingBytes >
			TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES
		) {
			toastUser.error(
				`Total size of template documents exceeds the limit of ${TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES / (1024 * 1024)}MB.`,
			);
			return;
		}

		setUploading(true);
		try {
			const next = await appendDocumentsToCreateForm({
				createForm,
				files,
			});
			setCreateForm(next);
		} catch (err) {
			toastUser.error(
				err instanceof Error ? err.message : "Could not add documents.",
			);
		} finally {
			setUploading(false);
		}
	};

	const handleRemoveDocument = () => {
		if (!removeTargetId || !createForm) return;
		try {
			setCreateForm(
				applyTemplateEditorMutation(createForm, {
					type: "removeDocument",
					documentId: removeTargetId,
				}),
			);
		} catch (err) {
			toastUser.error(
				err instanceof Error ? err.message : "Could not remove document.",
			);
		} finally {
			setRemoveTargetId(null);
		}
	};

	const removeFieldCount = removeTargetId
		? (fieldCounts.get(removeTargetId) ?? 0)
		: 0;

	return (
		<div className="space-y-3">
			<input
				ref={uploadRef}
				type="file"
				accept="application/pdf"
				multiple
				className="hidden"
				onChange={(event) => void handleUpload(event)}
			/>
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-medium text-foreground">Documents</h3>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-1"
					disabled={uploading}
					isLoading={uploading}
					onClick={() => uploadRef.current?.click()}
				>
					<PlusIcon className="size-3.5" weight="bold" />
					Add PDF
				</Button>
			</div>
			<div className="space-y-2">
				{documents.map((doc) => {
					const fieldCount = fieldCounts.get(doc.id) ?? 0;
					const isActive = currentDocumentId === doc.id;
					return (
						<div
							key={doc.id}
							className={cn(
								"flex items-center gap-2 rounded-lg border p-2",
								isActive
									? "border-primary/40 bg-primary/5"
									: "border-border/60",
							)}
						>
							<button
								type="button"
								className="flex min-w-0 flex-1 items-center gap-2 text-left"
								onClick={() => handleDocumentSelect(doc.id)}
							>
								<FilePdfIcon
									className="size-5 shrink-0 text-destructive/80"
									weight="duotone"
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{doc.name}</p>
									<p className="text-xs text-muted-foreground">
										{fieldCount} field{fieldCount === 1 ? "" : "s"}
									</p>
								</div>
							</button>
							{documents.length > 1 ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => setRemoveTargetId(doc.id)}
								>
									<TrashIcon className="size-4" />
								</Button>
							) : null}
						</div>
					);
				})}
			</div>

			<ConfirmAlertDialog
				open={removeTargetId !== null}
				onOpenChange={(open) => {
					if (!open) setRemoveTargetId(null);
				}}
				title="Remove this document?"
				description={
					removeFieldCount > 0
						? `This removes the PDF and ${removeFieldCount} placed field${removeFieldCount === 1 ? "" : "s"}.`
						: "This removes the PDF from the template."
				}
				confirmLabel="Remove document"
				destructive
				onConfirm={handleRemoveDocument}
			/>
		</div>
	);
}
