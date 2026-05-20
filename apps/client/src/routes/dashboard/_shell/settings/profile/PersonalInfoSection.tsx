import type { UseFormReturn } from "react-hook-form";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/lib/components/ui/form";
import { Input } from "@/src/lib/components/ui/input";
import { SaveButton } from "./components/SaveButton";
import type { ProfileForm } from "./hooks/use-section-state";

const labelClass = "text-xs font-normal text-muted-foreground";

const readOnlyInputClass =
	"pointer-events-none border-border/40 bg-muted/10 font-mono text-xs text-foreground/80";

const editableInputClass =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 placeholder:text-muted-foreground/45";

interface PersonalInfoSectionProps {
	form: UseFormReturn<ProfileForm>;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
}

export function PersonalInfoSection({
	form,
	sectionState,
}: PersonalInfoSectionProps) {
	return (
		<Card className="border-border/50 shadow-none">
			<CardHeader className="space-y-0 pb-3">
				<CardTitle className="text-sm font-medium text-foreground/85">
					Personal
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5 pt-0">
				<FormField
					control={form.control}
					name="personal.walletAddress"
					render={({ field }) => (
						<FormItem className="space-y-1.5">
							<FormLabel className={labelClass}>Wallet</FormLabel>
							<FormControl>
								<Input
									placeholder="0x…"
									readOnly
									tabIndex={-1}
									className={readOnlyInputClass}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="personal.email"
					render={({ field }) => (
						<FormItem className="space-y-1.5">
							<FormLabel className={labelClass}>Primary email</FormLabel>
							<FormControl>
								<Input
									placeholder="—"
									type="email"
									readOnly
									tabIndex={-1}
									className={`${readOnlyInputClass} font-sans`}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="personal.firstName"
						render={({ field }) => (
							<FormItem className="space-y-1.5">
								<FormLabel className={labelClass}>First name</FormLabel>
								<FormControl>
									<Input
										placeholder="First name"
										className={editableInputClass}
										{...field}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												sectionState.save();
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="personal.lastName"
						render={({ field }) => (
							<FormItem className="space-y-1.5">
								<FormLabel className={labelClass}>Last name</FormLabel>
								<FormControl>
									<Input
										placeholder="Last name"
										className={editableInputClass}
										{...field}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												sectionState.save();
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<SaveButton
					show={sectionState.hasChanges || sectionState.state.isSaved}
					onSave={sectionState.save}
					disabled={sectionState.state.isSaved || sectionState.state.isSaving}
					isLoading={sectionState.state.isSaving}
					isSaved={sectionState.state.isSaved}
					error={sectionState.state.error}
				/>
			</CardContent>
		</Card>
	);
}
