import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

export function ActiveOrgSection() {
	const { isLoading, orgs, activeOrgId, setActiveOrg } = useTeamSettings();

	return (
		<section className="space-y-4 rounded-lg border border-border p-6">
			<h2 className="text-sm font-medium">Active organization</h2>
			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : orgs.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No organizations yet. Create one below.
				</p>
			) : (
				<Select
					value={activeOrgId ?? "personal"}
					onValueChange={(v) => setActiveOrg(v === "personal" ? null : v)}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Personal workspace" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="personal">Personal workspace</SelectItem>
						{orgs.map((org) => (
							<SelectItem key={org.id} value={org.id}>
								{org.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</section>
	);
}
