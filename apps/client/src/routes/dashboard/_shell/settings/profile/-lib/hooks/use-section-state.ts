import { useUpdateUserProfile } from "@filosign/react/users";
import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ProfileForm } from "../types";

export type { ProfileForm } from "../types";

export type SectionKey = "personal" | "profilePicture";

export interface SectionState {
	isSaving: boolean;
	isSaved: boolean;
	error?: string;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
	const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
	if (!match) {
		throw new Error("Unsupported image format");
	}

	const mime = match[1];
	const base64 = match[2];
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return new File([bytes], filename, { type: mime });
}

// Custom hook for section management
export const useSectionState = (
	sectionKey: SectionKey,
	form: UseFormReturn<ProfileForm>,
	originalValues: ProfileForm,
) => {
	const updateUserProfile = useUpdateUserProfile();

	const [state, setState] = useState<SectionState>({
		isSaving: false,
		isSaved: false,
	});
	const [hasChangesState, setHasChangesState] = useState(false);

	// Check for changes only when form values change (not on every keystroke)
	useEffect(() => {
		const subscription = form.watch(
			(_value: unknown, { name }: { name?: string }) => {
				if (!name) return; // Skip if no specific field changed

				// Only check for changes in this section
				if (sectionKey === "personal" && name.startsWith("personal.")) {
					const personalValues = form.getValues("personal");
					const original = originalValues.personal;
					const hasPersonalChanges =
						personalValues.firstName !== original.firstName ||
						personalValues.lastName !== original.lastName;
					setHasChangesState(hasPersonalChanges);
				} else if (
					sectionKey === "profilePicture" &&
					name === "profilePicture"
				) {
					const picValue = form.getValues("profilePicture");
					const hasPicChanges = picValue !== originalValues.profilePicture;
					setHasChangesState(hasPicChanges);
				}
			},
		);

		return () => subscription.unsubscribe();
	}, [form, sectionKey, originalValues]);

	// Reset saved state when changes occur
	useEffect(() => {
		if (hasChangesState && state.isSaved) {
			setState((prev) => ({ ...prev, isSaved: false, error: undefined }));
		}
	}, [hasChangesState, state.isSaved]);

	const save = useCallback(async () => {
		setState({ isSaving: true, isSaved: false, error: undefined });

		if (sectionKey === "personal") {
			const { firstName, lastName } = form.getValues("personal");
			const args = {
				firstName,
				lastName: lastName || undefined,
			};

			await updateUserProfile
				.mutateAsync(args)
				.then(() => {
					setHasChangesState(false);
					setState({ isSaving: false, isSaved: true });
				})
				.catch((error: unknown) => {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to update profile";
					setState({ isSaving: false, isSaved: false, error: errorMessage });
					toast.error(errorMessage);
				});

			return;
		}

		if (sectionKey === "profilePicture") {
			const picValue = form.getValues("profilePicture");

			if (!picValue || typeof picValue !== "string") {
				const errorMessage = "Please upload a profile picture";
				setState({ isSaving: false, isSaved: false, error: errorMessage });
				toast.error(errorMessage);
				return;
			}

			// Only data URLs can be converted to `File` for upload.
			if (!picValue.startsWith("data:")) {
				const errorMessage =
					"Please upload a new profile picture to save changes";
				setState({ isSaving: false, isSaved: false, error: errorMessage });
				toast.error(errorMessage);
				return;
			}

			const avatarFile = dataUrlToFile(picValue, "avatar.webp");

			await updateUserProfile
				.mutateAsync({ avatar: avatarFile })
				.then(() => {
					setHasChangesState(false);
					setState({ isSaving: false, isSaved: true });
				})
				.catch((error: unknown) => {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to update avatar";
					setState({ isSaving: false, isSaved: false, error: errorMessage });
					toast.error(errorMessage);
				});
		}
	}, [sectionKey, form, updateUserProfile]);

	return { state, hasChanges: hasChangesState, save };
};
