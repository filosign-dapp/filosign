import { SupplementaryPacketsSignList } from "@/src/routes/dashboard/document/sign/-components/supplementary-packets-sign-list";
import {
	useSignFile,
	useSignMeta,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

/** Sign-page sidebar: supplementary packets entitled to the current signer email. */
export function SupplementaryPacketsSignPanel() {
	const { pieceCid, file } = useSignFile();
	const { isSender } = useSignMeta();

	const packets = file?.mySupplementaryPackets;
	if (isSender || !packets?.length) {
		return null;
	}

	return <SupplementaryPacketsSignList pieceCid={pieceCid} packets={packets} />;
}
