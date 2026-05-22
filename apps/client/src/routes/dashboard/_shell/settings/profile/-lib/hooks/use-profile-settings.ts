import { useUserProfile } from "@filosign/react/users";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import type { ProfileForm } from "../types";
import { profileSchema } from "../types";
import { useFileUpload } from "./use-file-upload";
import { useSectionState } from "./use-section-state";

export function useProfileSettings() {
	const { walletAddress } = useThirdweb();
	const userProfileQuery = useUserProfile();

	const form = useForm<ProfileForm>({
		resolver: standardSchemaResolver(profileSchema),
		defaultValues: {
			personal: {
				firstName: "",
				lastName: "",
				walletAddress,
				email: "",
			},
			profilePicture: null,
		},
		mode: "onSubmit",
	});

	const baseValues = useMemo(() => {
		const userProfile = userProfileQuery.data as
			| {
					firstName?: string | null;
					lastName?: string | null;
					email?: string | null;
					avatarUrl?: string | null;
			  }
			| undefined;
		return {
			personal: {
				firstName: userProfile?.firstName ?? "",
				lastName: userProfile?.lastName ?? "",
				walletAddress,
				email: userProfile?.email ?? "",
			},
			profilePicture: userProfile?.avatarUrl ?? null,
		};
	}, [userProfileQuery.data, walletAddress]);

	useEffect(() => {
		if (!userProfileQuery.data) return;
		form.reset(baseValues);
	}, [form, baseValues, userProfileQuery.data]);

	const personalSection = useSectionState("personal", form, baseValues);
	const profilePictureSection = useSectionState(
		"profilePicture",
		form,
		baseValues,
	);
	const fileUpload = useFileUpload(form);

	return {
		form,
		personalSection,
		profilePictureSection,
		fileUpload,
	};
}

export type ProfileSettingsState = ReturnType<typeof useProfileSettings>;
