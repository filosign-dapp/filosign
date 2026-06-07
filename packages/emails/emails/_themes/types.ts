import type { ReactNode } from "react";
import type { FilosignContactEmail } from "../../src/contact-emails";

export type EmailLayoutProps = {
	preheader: string;
	ctaHref: string;
	ctaLabel: string;
	children: ReactNode;
	title?: ReactNode;
	footnote?: ReactNode;
	disclaimer?: ReactNode;
	/** Footer mail icon + implied reply routing */
	contactChannel?: FilosignContactEmail;
};

export type WelcomeLayoutProps = EmailLayoutProps & {
	eyebrow?: ReactNode;
	heroImage?: string;
	secondarySections?: ReactNode;
};

export type SubscriptionLayoutProps = EmailLayoutProps & {
	summaryRow?: ReactNode;
};
