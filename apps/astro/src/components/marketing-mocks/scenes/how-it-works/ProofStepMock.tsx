import MockPanel from "../../kit/MockPanel";
import ProofPacketList from "../../patterns/ProofPacketList";

const proofRows = [
	{ label: "Sender", value: "0xAB…CD" },
	{ label: "Completed", value: "May 28, 2026" },
] as const;

export default function ProofStepMock() {
	return (
		<MockPanel variant="compact">
			<ProofPacketList rows={proofRows} />
		</MockPanel>
	);
}
