import { useGetOrgTemplate } from "@filosign/react/orgs";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/src/lib/components/ui/sheet";

type Props = {
	templateId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function TemplateDetailSheet({ templateId, open, onOpenChange }: Props) {
	const { data, isLoading } = useGetOrgTemplate(
		open ? (templateId ?? undefined) : undefined,
	);
	const snapshot = data?.template.snapshotJson;
	const roles = snapshot?.roles.slice().sort((a, b) => a.order - b.order) ?? [];
	const docCount = data?.documents.length ?? 0;
	const fieldCount = snapshot?.fields.length ?? 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{data?.template.name ?? "Template details"}</SheetTitle>
					<SheetDescription>
						Read-only blueprint summary for this workspace template.
					</SheetDescription>
				</SheetHeader>
				{isLoading ? (
					<div className="flex justify-center py-8">
						<InlineLoader />
					</div>
				) : (
					<div className="space-y-4 px-4 pb-6">
						<div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
							<p>
								{docCount} documents · {fieldCount} fields · {roles.length}{" "}
								roles
							</p>
						</div>
						{roles.length > 0 ? (
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Roles</h4>
								<ul className="space-y-2 text-sm">
									{roles.map((role) => (
										<li
											key={role.roleId}
											className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
										>
											<span>{role.label}</span>
											<span className="text-xs capitalize text-muted-foreground">
												{role.kind}
											</span>
										</li>
									))}
								</ul>
							</div>
						) : null}
						{snapshot?.defaults?.emailSubject ? (
							<div className="space-y-1 text-sm">
								<h4 className="font-medium">Default subject</h4>
								<p className="text-muted-foreground">
									{snapshot.defaults.emailSubject}
								</p>
							</div>
						) : null}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
