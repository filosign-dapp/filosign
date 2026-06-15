import { TextAlignLeftIcon } from "@phosphor-icons/react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { cn } from "@/src/lib/utils/utils";
import { TemplateDefaultsPanel } from "./template-defaults-panel";
import { TemplateDocumentsPanel } from "./template-documents-panel";
import { TemplateRolesPanel } from "./template-roles-panel";

export function TemplateContextRailDesktopContent() {
	return (
		<div className="space-y-6">
			<TemplateDocumentsPanel />

			<Collapsible defaultOpen>
				<CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
					<TextAlignLeftIcon className="size-4 text-muted-foreground" />
					<span className="text-sm font-medium text-foreground">
						Default message
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className={cn("mt-3")}>
					<TemplateDefaultsPanel hideHeader />
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

/** Mobile setup sheet: roles, documents, and defaults. */
export function TemplateContextRailMobileContent() {
	return (
		<div className="space-y-6">
			<TemplateRolesPanel />
			<TemplateContextRailDesktopContent />
		</div>
	);
}
