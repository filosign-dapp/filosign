import { SupplementaryPacketsSignList } from "@/src/routes/dashboard/document/sign/-components/supplementary-packets-sign-list";
import { useSignFile } from "@/src/routes/dashboard/document/sign/-lib/context/context";

/** Sign-page sidebar: supplementary packets entitled to the current signer email. */
export function SupplementaryPacketsSignPanel() {
	const { pieceCid, file } = useSignFile();

	const packets = file?.mySupplementaryPackets;
	if (!packets?.length) {
		return null;
	}

	return (
		<section className="mt-6 border-t border-border pt-4">
			<SupplementaryPacketsSignList pieceCid={pieceCid} packets={packets} />
		</section>
	);
}
