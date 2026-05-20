import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

export function CreateOrgSection() {
	const { name, setName, createOrg, setActiveOrg } = useTeamSettings();

	return (
		<section className="space-y-4 rounded-lg border border-border p-6">
			<div className="flex items-center gap-2">
				<BuildingsIcon className="size-5 text-muted-foreground" />
				<h2 className="text-sm font-medium">Create organization</h2>
			</div>
			<div className="flex gap-2">
				<Input
					placeholder="Organization name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<Button
					type="button"
					disabled={!name.trim() || createOrg.isPending}
					onClick={() => {
						createOrg.mutate(
							{ name: name.trim() },
							{
								onSuccess: (res) => {
									const id = res.organization?.id;
									if (id) setActiveOrg(id);
									setName("");
								},
							},
						);
					}}
				>
					<PlusIcon className="size-4" />
					Create
				</Button>
			</div>
		</section>
	);
}
