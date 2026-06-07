import type { ReactNode } from "react";

export type EmailLayoutProps = {
	preheader: string;
	ctaHref: string;
	ctaLabel: string;
	children: ReactNode;
	title?: ReactNode;
	footnote?: ReactNode;
	disclaimer?: ReactNode;
	heroImage?: string;
};

export type EmailThemeId =
	| "barebone"
	| "matte"
	| "protocol"
	| "arcane"
	| "studio";
