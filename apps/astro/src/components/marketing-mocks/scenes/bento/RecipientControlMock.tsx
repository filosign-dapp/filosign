import MockPanel from "../../kit/MockPanel";
import SignerContactRow from "../../patterns/SignerContactRow";

export default function RecipientControlMock() {
	return (
		<MockPanel variant="default">
			<div className="space-y-2">
				<SignerContactRow
					initial="A"
					title="Allowed Contacts"
					subtitle="Can send you files"
					allowed
				/>
				<SignerContactRow
					initial="S"
					title="Spam Senders"
					subtitle="Blocked until approved"
				/>
			</div>
		</MockPanel>
	);
}
