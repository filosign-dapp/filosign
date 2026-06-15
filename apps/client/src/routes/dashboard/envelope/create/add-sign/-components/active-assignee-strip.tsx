import { useUserProfile } from "@filosign/react/users";
import { useMemo } from "react";
import {
	buildActiveAssignees,
	countFieldsByAssignee,
} from "@/src/lib/domains/placement/utils/active-assignees";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";

type ActiveAssigneeStripProps = {
	activeAssigneeId: string;
	onSelect: (id: string) => void;
	fieldCountsByAssigneeId?: Map<string, number>;
};

export function ActiveAssigneeStrip({
	activeAssigneeId,
	onSelect,
	fieldCountsByAssigneeId,
}: ActiveAssigneeStripProps) {
	const createForm = useStorePersist((s) => s.createForm);
	const { data: selfProfile } = useUserProfile();
	const assignees = buildActiveAssignees(
		createForm?.recipients ?? [],
		selfProfile,
	);

	const counts = useMemo(() => {
		if (fieldCountsByAssigneeId) return fieldCountsByAssigneeId;
		return countFieldsByAssignee(createForm?.signatureFields ?? [], assignees);
	}, [fieldCountsByAssigneeId, createForm?.signatureFields, assignees]);

	if (assignees.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				Add signers on the form page first.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground">Assign to</p>
			<div className="flex flex-wrap gap-1.5">
				{assignees.map((assignee) => {
					const count = counts.get(assignee.id) ?? 0;
					const disabled = !assignee.placementEnabled;
					return (
						<button
							key={assignee.id}
							type="button"
							disabled={disabled}
							title={
								disabled
									? 'Turn on "I also need to sign" on the form page to place fields for yourself'
									: assignee.isSelf
										? assignee.email
										: undefined
							}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
								disabled &&
									"cursor-not-allowed opacity-50 hover:border-border/60 hover:text-muted-foreground",
								!disabled &&
									(activeAssigneeId === assignee.id
										? "border-primary bg-primary/10 text-primary font-medium"
										: "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"),
							)}
							onClick={() => {
								if (disabled) return;
								onSelect(assignee.id);
							}}
						>
							{assignee.isSelf ? "Me" : assignee.name}
							{count > 0 ? (
								<span
									className={cn(
										"inline-flex min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none",
										activeAssigneeId === assignee.id
											? "bg-primary/20 text-primary"
											: "bg-muted text-muted-foreground",
									)}
								>
									{count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
