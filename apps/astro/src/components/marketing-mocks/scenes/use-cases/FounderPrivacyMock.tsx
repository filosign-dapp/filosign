import MockPanel from "../../kit/MockPanel";
import EncryptedDocHeader from "../../patterns/EncryptedDocHeader";
import { mockPersonas } from "../../tokens";

export default function FounderPrivacyMock() {
	return (
		<MockPanel variant="compact">
			<EncryptedDocHeader
				filename="Confidential_Agreement.pdf"
				fieldCount={2}
				recipients={[mockPersonas.alice.email, mockPersonas.bob.email]}
			/>
		</MockPanel>
	);
}
