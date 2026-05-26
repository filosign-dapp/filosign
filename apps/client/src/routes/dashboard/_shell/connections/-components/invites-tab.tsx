import { Input } from "@/src/lib/components/ui/input";
import { EmptyHint } from "@/src/routes/dashboard/_shell/connections/-components/empty-hint";
import { useConnectionsContext } from "@/src/routes/dashboard/_shell/connections/-lib/context/context";

function formatDate(value: string | Date) {
	const d = value instanceof Date ? value : new Date(value);
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function InvitesTab() {
	const { filteredInvites, loadingInvites, search, setSearch } =
		useConnectionsContext();

	if (loadingInvites) {
		return (
			<p className="text-sm text-muted-foreground animate-pulse">
				Loading invites…
			</p>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<Input
				placeholder="Search by email…"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="max-w-sm"
			/>

			{filteredInvites.length === 0 ? (
				<EmptyHint title="No email invites yet. Use Add recipient to send one." />
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border">
					{filteredInvites.map((inv) => (
						<li
							key={inv.id}
							className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-foreground">
									{inv.inviteeEmail}
								</p>
								{inv.message ? (
									<p className="truncate text-xs text-muted-foreground">
										{inv.message}
									</p>
								) : null}
							</div>
							<div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
								<span>{inv.accepted ? "Claimed" : "Pending"}</span>
								<span aria-hidden>·</span>
								<span>{formatDate(inv.createdAt)}</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
