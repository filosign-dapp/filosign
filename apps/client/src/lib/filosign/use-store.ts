import { create } from "zustand";
import { persist } from "zustand/middleware";
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
			clearCreateForm: () => set({ createForm: null }),

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
			version: 1,
			partialize: (state) => ({ activeOrgId: state.activeOrgId }),
		},
	),
);
