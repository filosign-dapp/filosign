import { useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { ProfileForm } from "./use-section-state";

export const useFileUpload = (form: UseFormReturn<ProfileForm>) => {
	const [uploadError, setUploadError] = useState<string>();

	const uploadFile = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			// Validate file type
			if (!file.type.startsWith("image/")) {
				setUploadError("Please select an image file");
				return;
			}

			// Validate file size (5MB)
			if (file.size > 5 * 1024 * 1024) {
				setUploadError("File size must be less than 5MB");
				return;
			}

			setUploadError(undefined);

			const reader = new FileReader();
			reader.onload = () => {
				form.setValue("profilePicture", reader.result as string);
			};
			reader.onerror = () => {
				setUploadError("Failed to read file");
			};
			reader.readAsDataURL(file);
		},
		[form],
	);

	return {
		uploadFile,
		uploadError,
		clearError: () => setUploadError(undefined),
	};
};
