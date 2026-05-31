import { UserIcon } from "@phosphor-icons/react";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/src/lib/components/ui/form";
import { Input } from "@/src/lib/components/ui/input";
import { useProfileSettingsContext } from "../-lib/context/context";
import { ProfileSection } from "./profile-section";
import { SaveButton } from "./SaveButton";

const labelClass = "text-xs font-normal text-muted-foreground";

const readOnlyInputClass =
	"pointer-events-none border-border/40 bg-muted/10 font-mono text-xs text-foreground/80";

const editableInputClass =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 placeholder:text-muted-foreground/45";

export function PersonalInfoSection() {
	const { form, personalSection: sectionState } = useProfileSettingsContext();
	return (
		<ProfileSection
			icon={<UserIcon className="size-4" aria-hidden="true" />}
			title="Personal"
			description="Update your personal details and primary communication email."
		>
			<div className="space-y-5">
				<FormField
					control={form.control}
					name="personal.email"
					render={({ field }) => (
						<FormItem className="space-y-1.5">
							<FormLabel className={labelClass}>Primary email</FormLabel>
							<FormControl>
								<Input
									placeholder="–"
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
			</div>
		</ProfileSection>
	);
}
