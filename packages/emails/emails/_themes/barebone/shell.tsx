/** Adapted from react-email demo 01-Barebone (MIT). */
import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";
import type { FilosignContactEmail } from "../../../src/contact-emails";
import { SocialFooter } from "../shared/social-footer";
import { BareboneFonts } from "./fonts";
import { bareboneTailwindConfig } from "./theme";

type BareboneShellProps = {
	preheader: string;
	children: ReactNode;
	contactChannel?: FilosignContactEmail;
};

export function BareboneShell({
	preheader,
	children,
	contactChannel = "contract",
}: BareboneShellProps) {
	return (
		<Tailwind config={bareboneTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="light" />
					<BareboneFonts />
				</Head>
				<Body className="bg-bg-2 m-0 text-center font-sans">
					<Preview>{preheader}</Preview>
					<Container className="mobile:mt-0 mx-auto mt-8 w-full max-w-[640px]">
						<Section>
							<Section className="bg-bg mobile:px-2 px-6 py-4">
								{children}

								<SocialFooter contactChannel={contactChannel} />
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}
