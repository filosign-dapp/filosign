import MockPanel from "../../kit/MockPanel";
import ProofPacketList from "../../patterns/ProofPacketList";
import { mockPersonas } from "../../tokens";

const proofRows = [
	{ label: "Sender", value: mockPersonas.alice.email },
	{ label: "Signer", value: mockPersonas.bob.email },
	{ label: "Completed", value: "May 28, 2026" },
] as const;

export default function ProofStepMock() {
	return (
		<MockPanel variant="compact">
			<ProofPacketList rows={proofRows} />
		</MockPanel>
	);
}
