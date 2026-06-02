import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	clearDraftDocuments,
	recipientFingerprint,
	shouldPersistCreateFormToDisk,
	stripCreateFormForPersist,
} from "@/src/lib/domains/drafts";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { createClientId } from "@/src/lib/utils/id";

interface OnboardingForm {
	firstName: string;
	lastName: string;
	hasOnboarded: boolean;
	selectedSignature?: string;
	image?: string;
}

interface SidebarState {
	isOpen: boolean;
	expandedItems: string[];
	lastClickedMenu?: string;
}

interface StorePersist {
	createForm: CreateForm | null;
	setCreateForm: (form: CreateForm) => void;
	clearCreateForm: () => void;

	/** Active org workspace (synced to `FilosignSession` + `X-Org-Id`). */
	activeOrgId: string | null;
	setActiveOrgId: (id: string | null) => void;

	onboardingForm: OnboardingForm;
	setOnboardingForm: (form: OnboardingForm) => void;
	clearOnboardingForm: () => void;

	sidebar: SidebarState;
	setSidebar: (sidebar: Partial<SidebarState>) => void;
}

export const useStorePersist = create<StorePersist>()(
	persist(
		(set) => ({
			createForm: null,
			setCreateForm: (form: CreateForm) => set({ createForm: form }),
			clearCreateForm: () => {
				const draftId = useStorePersist.getState().createForm?.draftId;
				if (draftId) void clearDraftDocuments(draftId);
				set({ createForm: null });
			},

			activeOrgId: null,
			setActiveOrgId: (id: string | null) =>
				set({ activeOrgId: id?.trim() ? id.trim() : null }),

			onboardingForm: {
				firstName: "",
				lastName: "",
				hasOnboarded: false,
				selectedSignature: undefined,
				image:
					"https://cdn.dribbble.com/userupload/32112291/file/original-4d4ef0e9749c47c0e20c93e61583233c.jpg?resize=400x0",
			},
			setOnboardingForm: (form: OnboardingForm) =>
				set({ onboardingForm: form }),
			clearOnboardingForm: () =>
				set({
					onboardingForm: {
						firstName: "",
						lastName: "",
						hasOnboarded: false,
						selectedSignature: undefined,
						image:
							"https://cdn.dribbble.com/userupload/32112291/file/original-4d4ef0e9749c47c0e20c93e61583233c.jpg?resize=400x0",
					},
				}),

			sidebar: {
				isOpen: false,
				expandedItems: [],
				lastClickedMenu: undefined,
			},
			setSidebar: (updates: Partial<SidebarState>) =>
				set((state) => ({
					sidebar: { ...state.sidebar, ...updates },
				})),
		}),
		{
			name: "filosign-client",
			version: 3,
			migrate: (persisted, version) => {
				const row = persisted as {
					activeOrgId?: string | null;
					createForm?: CreateForm | null;
				};
				if (version < 2) {
					return {
						activeOrgId: row.activeOrgId ?? null,
						createForm: null,
					};
				}
				const cf = row.createForm;
				if (cf && version < 3) {
					return {
						activeOrgId: row.activeOrgId ?? null,
						createForm: {
							...cf,
							draftId: cf.draftId ?? createClientId(),
							recipientFingerprint:
								cf.recipientFingerprint ||
								recipientFingerprint(cf.recipients ?? []),
							signatureFields: cf.signatureFields ?? [],
						},
					};
				}
				return {
					activeOrgId: row.activeOrgId ?? null,
					createForm: row.createForm ?? null,
				};
			},
			partialize: (state) => ({
				activeOrgId: state.activeOrgId,
				createForm: shouldPersistCreateFormToDisk()
					? stripCreateFormForPersist(state.createForm)
					: null,
			}),
		},
	),
);

/** True after `filosign-client` has rehydrated from localStorage. */
export function useStorePersistHydrated() {
	const [hydrated, setHydrated] = useState(() =>
		useStorePersist.persist.hasHydrated(),
	);
	useEffect(() => {
		if (useStorePersist.persist.hasHydrated()) {
			setHydrated(true);
			return;
		}
		return useStorePersist.persist.onFinishHydration(() => {
			setHydrated(true);
		});
	}, []);
	return hydrated;
}
