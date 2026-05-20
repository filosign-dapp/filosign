import { CameraIcon, UserIcon } from "@phosphor-icons/react";
import type { UseFormReturn } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { FormField } from "@/src/lib/components/ui/form";
import { SaveButton } from "./components/SaveButton";
import type { ProfileForm } from "./hooks/use-section-state";

interface ProfilePictureSectionProps {
	form: UseFormReturn<ProfileForm>;
	sectionState: {
		hasChanges: boolean;
		state: { isSaving: boolean; isSaved: boolean; error?: string };
		save: () => void;
	};
	uploadFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
	uploadError?: string;
}

export function ProfilePictureSection({
	form,
	sectionState,
	uploadFile,
	uploadError,
}: ProfilePictureSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<UserIcon className="size-5" />
					Profile Picture
				</CardTitle>
				<CardDescription>
					Upload a profile picture to personalize your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FormField
					control={form.control}
					name="profilePicture"
					render={({ field }) => (
						<div className="flex gap-6 items-center">
							<div className="relative">
								<div className="flex overflow-hidden justify-center items-center w-24 h-24 rounded-full bg-muted/30">
									{field.value ? (
										<img
											src={field.value}
											alt="Profile"
											className="object-cover w-full h-full"
										/>
									) : (
										<UserIcon className="size-12 text-muted-foreground" />
									)}
								</div>
								<label className="flex absolute -right-1 -bottom-1 justify-center items-center w-8 h-8 rounded-full transition-colors cursor-pointer bg-foreground hover:bg-foreground/90">
									<CameraIcon className="size-4 text-primary-foreground" />
									<input
										type="file"
										accept="image/*"
										onChange={uploadFile}
										className="hidden"
									/>
								</label>
							</div>
							<div className="flex-1 space-y-2">
								<h4 className="font-medium">Upload Profile Picture</h4>
								<p className="text-sm text-muted-foreground">
									JPG, PNG or GIF. Max file size 5MB.
								</p>
								{uploadError && (
									<p className="text-sm text-destructive">{uploadError}</p>
								)}
								<div className="flex gap-2">
									<SaveButton
										show={sectionState.hasChanges || sectionState.state.isSaved}
										onSave={sectionState.save}
										disabled={
											sectionState.state.isSaved || sectionState.state.isSaving
										}
										isLoading={sectionState.state.isSaving}
										isSaved={sectionState.state.isSaved}
										error={sectionState.state.error}
									/>
								</div>
							</div>
						</div>
					)}
				/>
			</CardContent>
		</Card>
	);
}
