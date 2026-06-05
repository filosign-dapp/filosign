import MockPanel from "../../kit/MockPanel";
import SignerContactRow from "../../patterns/SignerContactRow";
import { mockPersonas } from "../../tokens";

export default function RecipientControlMock() {
	return (
		<MockPanel variant="default">
			<div className="space-y-2">
				<SignerContactRow
					initial={mockPersonas.alice.name[0] ?? "A"}
					title={mockPersonas.alice.name}
					subtitle={mockPersonas.alice.email}
					allowed
				/>
				<SignerContactRow
					initial="?"
					title="Unknown sender"
					subtitle="blocked@inbox.com"
				/>
			</div>
		</MockPanel>
	);
}
