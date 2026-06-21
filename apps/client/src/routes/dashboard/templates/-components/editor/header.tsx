import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import Logo from "@/src/lib/components/app/chrome/logo";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import {
	TEMPLATE_EDITOR_MODE_LABEL,
	useTemplateEditorMode,
} from "@/src/lib/domains/templates/template-editor-mode";
import { useTemplateEditorLeaveGuard } from "@/src/lib/domains/templates/use-template-editor-leave-guard";
import {
	deriveTemplateDisplayName,
	truncateTemplateHeaderTitle,
} from "@/src/lib/domains/templates/utils/display-name";
import { PlacementHistoryButtons } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header/placement-history";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
import { TemplateEditorHeaderActions } from "./header-actions";

type Props = {
	templateId: string;
	templateName: string;
	canManage?: boolean;
	onRename?: () => void;
	onUseTemplate?: () => void;
	useTemplatePending?: boolean;
	systemTemplateMeta?: {
		category?: string;
		documentVersion?: string;
		tags?: string[];
	};
};

export function TemplateEditorHeader({
	templateId,
	templateName,
	canManage = false,
	onRename,
	onUseTemplate,
	useTemplatePending,
	systemTemplateMeta,
}: Props) {
	const navigate = useNavigate();
	const mode = useTemplateEditorMode();
	const isPreview = mode === "preview";
	const {
		isDirty,
		leaveDialogOpen,
		setLeaveDialogOpen,
		requestLeave,
		confirmLeave,
	} = useTemplateEditorLeaveGuard(mode);
	const displayName = deriveTemplateDisplayName(
		templateName,
		"Untitled template",
	);
	const headerTitle = truncateTemplateHeaderTitle(displayName);
	const modeLabel = TEMPLATE_EDITOR_MODE_LABEL[mode];
	const showRename = canManage && !systemTemplateMeta && onRename != null;

	return (
		<>
			<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
				<div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
					<Logo
						className="shrink-0 px-0"
						textClassName="text-foreground"
						iconOnly
						noHref={isDirty}
						onIconClick={() => {
							if (!isDirty) return;
							requestLeave(() => {
								void navigate({ to: "/dashboard", replace: true });
							});
						}}
					/>
					<div className="min-w-0">
						<div className="flex min-w-0 items-center gap-2">
							{showRename ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="shrink-0 text-muted-foreground hover:text-foreground"
									aria-label="Rename template"
									onClick={onRename}
								>
									<PencilSimpleIcon className="size-4" aria-hidden />
								</Button>
							) : null}
							<h1
								className="truncate text-base font-semibold text-foreground"
								title={displayName}
							>
								{headerTitle}
							</h1>
							<span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
								· {modeLabel}
							</span>
						</div>
						<Link
							to="/dashboard/templates"
							className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
							onClick={(event) => {
								if (!isDirty) return;
								event.preventDefault();
								requestLeave(() => {
									void navigate({ to: "/dashboard/templates" });
								});
							}}
						>
							<ArrowLeftIcon
								className="size-3.5 shrink-0"
								weight="bold"
								aria-hidden
							/>
							<span className="truncate">Templates</span>
						</Link>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 md:gap-3">
					<div className="lg:hidden">
						<PlacedFieldsSheet variant="toolbar" />
					</div>
					{isPreview ? null : (
						<div className="hidden sm:block">
							<PlacementHistoryButtons />
						</div>
					)}
					<TemplateEditorHeaderActions
						templateId={templateId}
						templateName={templateName}
						onUseTemplate={onUseTemplate}
						useTemplatePending={useTemplatePending}
						systemTemplateMeta={systemTemplateMeta}
					/>
				</div>
			</header>

			<ConfirmAlertDialog
				open={leaveDialogOpen}
				onOpenChange={setLeaveDialogOpen}
				title="Discard unsaved changes?"
				description="Your template changes have not been saved. Leaving will clear this draft."
				confirmLabel="Leave without saving"
				destructive
				onConfirm={confirmLeave}
			/>
		</>
	);
}
