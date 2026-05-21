import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import { PaymentAttachmentPanel } from "@/src/routes/dashboard/envelope/create/add-sign/-components/payment-attachment-panel";
import {
	useAddSignContext,
	useAddSignPlacement,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";

export default function SignatureFieldsSidebar() {
	const { handleAddField, isPlacingField, pendingFieldType } =
		useAddSignPlacement();
	const { paymentDrafts, setPaymentDrafts, createFormRecipients } =
		useAddSignContext();

	return (
		<div className="p-4 space-y-4">
			<div>
				<p className="font-medium text-muted-foreground mb-2">
					Standard Fields
				</p>
				<p className="text-xs text-muted-foreground mb-4">
					Select a field, then click the document. A dialog will ask which
					signer to assign and whether the field is required.
				</p>
			</div>

			<div className="space-y-2">
				{signatureFieldPalette.map((field, index) => {
					const IconComponent = field.icon;
					return (
						<motion.div
							key={field.type}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{
								duration: 0.15,
								delay: index * 0.02,
							}}
						>
							<Button
								variant="ghost"
								className={cn(
									"w-full justify-start h-auto p-3 hover:bg-muted/50 transition-colors duration-100",
									isPlacingField &&
										pendingFieldType === field.type &&
										"bg-accent border",
								)}
								onClick={() => handleAddField(field.type)}
							>
								<div className="flex items-center gap-3 w-full">
									<div className="p-2 rounded-md bg-muted/30">
										<IconComponent
											className="size-6 text-primary"
											weight="regular"
										/>
									</div>
									<div className="flex-1 text-left">
										<div className="text-sm font-medium">{field.label}</div>
										<div className="text-xs text-muted-foreground">
											{field.description}
										</div>
									</div>
								</div>
							</Button>
						</motion.div>
					);
				})}
			</div>

			<div className="pt-4 border-t border-border">
				<div className="text-xs text-muted-foreground space-y-2">
					{isPlacingField ? (
						<div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded text-primary text-xs">
							<strong>Placing:</strong>{" "}
							{
								signatureFieldPalette.find((f) => f.type === pendingFieldType)
									?.label
							}
						</div>
					) : null}
				</div>
			</div>

			<PaymentAttachmentPanel
				recipients={createFormRecipients}
				drafts={paymentDrafts}
				onChange={setPaymentDrafts}
			/>
		</div>
	);
}
