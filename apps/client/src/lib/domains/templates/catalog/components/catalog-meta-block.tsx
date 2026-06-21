import type { SystemTemplateMeta } from "@filosign/shared";
import { Badge } from "@/src/lib/components/ui/badge";

type Props = {
	meta: SystemTemplateMeta;
	catalogVersionLabel: string;
	newerVersionAvailable: boolean;
};

export function CatalogMetaBlock({
	meta,
	catalogVersionLabel,
	newerVersionAvailable,
}: Props) {
	return (
		<div className="space-y-3 rounded-md border border-border/50 p-3">
			<h3 className="text-sm font-medium text-foreground">Catalog details</h3>
			<dl className="space-y-2 text-sm">
				<div className="flex justify-between gap-2">
					<dt className="text-muted-foreground">Version</dt>
					<dd className="font-medium">{catalogVersionLabel}</dd>
				</div>
				<div className="flex justify-between gap-2">
					<dt className="text-muted-foreground">Category</dt>
					<dd className="capitalize">{meta.category}</dd>
				</div>
			</dl>
			{meta.tags.length > 0 ? (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{meta.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</div>
			) : null}
			<p className="text-xs text-muted-foreground">
				Adding from the Library creates a new workspace copy. Your existing
				templates stay unchanged.
			</p>
			{newerVersionAvailable ? (
				<p className="text-xs text-muted-foreground">
					A newer catalog version is available in the Library.
				</p>
			) : null}
		</div>
	);
}
