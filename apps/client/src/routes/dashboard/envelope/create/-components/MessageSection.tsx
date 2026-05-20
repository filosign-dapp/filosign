import { CaretDownIcon, EnvelopeIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/lib/components/ui/form";
import { Input } from "@/src/lib/components/ui/input";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { cn } from "@/src/lib/utils/utils";
import type { EnvelopeForm } from "../-lib/types";

interface MessageSectionProps {
	control: Control<EnvelopeForm>;
	isOnlySigner: boolean;
}

export default function MessageSection({
	control,
	isOnlySigner,
}: MessageSectionProps) {
	const [isMessageOpen, setIsMessageOpen] = useState(false);

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.6,
			}}
		>
			<Collapsible open={isMessageOpen} onOpenChange={setIsMessageOpen}>
				<CollapsibleTrigger
					render={
						<button
							type="button"
							className="group/add-message -m-2 flex w-full cursor-pointer items-center justify-between rounded-md border-0 bg-transparent p-2 text-left transition-colors hover:bg-accent/50"
						/>
					}
				>
					<h4 className="flex items-center gap-3">
						<EnvelopeIcon
							className={cn(
								"size-5 text-muted-foreground transition-transform duration-200",
							)}
						/>
						Add message (optional)
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isMessageOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6 space-y-6">
					<div className="space-y-4">
						<FormField
							control={control}
							name="emailSubject"
							rules={{
								required: isOnlySigner ? false : "Email subject is required",
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Subject {!isOnlySigner && "*"}</FormLabel>
									<FormControl>
										<Input placeholder="Enter email subject" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="space-y-4">
						<FormField
							control={control}
							name="emailMessage"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Message</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Enter your message to the recipient..."
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}
