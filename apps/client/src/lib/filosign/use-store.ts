import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	clearDraftDocuments,
	shouldPersistCreateFormToDisk,
	stripCreateFormForPersist,
} from "@/src/lib/domains/drafts";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";

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

export type DocumentsViewMode = "list" | "grid";

interface ActivationUiState {
	checklistDismissed: boolean;
	checklistCollapsed: boolean;
	/** Completion next-steps card dismissed after basic onboarding. */
	nextStepsDismissed: boolean;
	dismissedHintIds: string[];
	lastSeenCatalogVersion: number;
	/** Advanced checklist step ids the user has already been shown. */
	seenAdvancedStepIds: string[];
	/** Last billing plan used to diff newly unlocked advanced steps. */
	lastSeenBillingPlanId: string | null;
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

	activationUi: ActivationUiState;
	setActivationUi: (updates: Partial<ActivationUiState>) => void;

	/** All Documents page: list vs grid layout. */
	documentsViewMode: DocumentsViewMode;
	setDocumentsViewMode: (mode: DocumentsViewMode) => void;
}

const defaultActivationUi: ActivationUiState = {
	checklistDismissed: false,
	checklistCollapsed: false,
	nextStepsDismissed: false,
	dismissedHintIds: [],
	lastSeenCatalogVersion: 0,
	seenAdvancedStepIds: [],
	lastSeenBillingPlanId: null,
};

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

			activationUi: defaultActivationUi,
			setActivationUi: (updates: Partial<ActivationUiState>) =>
				set((state) => ({
					activationUi: { ...state.activationUi, ...updates },
				})),

			documentsViewMode: "list",
			setDocumentsViewMode: (mode: DocumentsViewMode) =>
				set({ documentsViewMode: mode }),
		}),
		{
			name: "filosign-client",
			version: 3,
			migrate: (persistedState, version) => {
				if (version < 3) {
					return {
						...(persistedState as object),
						documentsViewMode: "list" as const,
					};
				}
				return persistedState;
			},
			partialize: (state) => ({
				activeOrgId: state.activeOrgId,
				activationUi: state.activationUi,
				documentsViewMode: state.documentsViewMode,
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
