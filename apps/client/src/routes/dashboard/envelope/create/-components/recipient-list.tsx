import { motion } from "motion/react";
import { useRecipientsContext } from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";
import { RecipientCard } from "./recipient-card";

export function RecipientList() {
	const { recipients } = useRecipientsContext();

	if (!recipients?.length) return null;

	return (
		<motion.div
			className="space-y-3"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 26,
				delay: 0.06,
			}}
		>
			{recipients.map((recipient, index) => (
				<RecipientCard
					key={recipient.clientRowId ?? `recipient-row-${index}`}
					index={index}
				/>
			))}
		</motion.div>
	);
}
