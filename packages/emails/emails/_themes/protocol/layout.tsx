/** Adapted from react-email demo 03-Protocol/activation (MIT). */
import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import { SocialFooter } from "../shared/social-footer";
import type { EmailLayoutProps } from "../types";
import { ProtocolFonts } from "./fonts";
import { protocolTailwindConfig } from "./theme";

export function ProtocolLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	disclaimer,
	heroImage = filosignEmailAssets.dither.hero1,
}: EmailLayoutProps) {
	return (
		<Tailwind config={protocolTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="dark" />
					<ProtocolFonts />
				</Head>
				<Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
					<Preview>{preheader}</Preview>
					<Container className="bg-bg mx-auto max-w-[640px]">
						<Section className="mobile:px-4 px-6 py-6">
							<Img
								src={filosignEmailAssets.logo}
								alt="Filosign"
								width={32}
								height={32}
								className="block"
							/>
						</Section>

						<Section className="mobile:px-4 px-6">
							<Img
								src={heroImage}
								alt=""
								width={592}
								className="block w-full max-w-[592px]"
							/>
						</Section>

						<Section className="mobile:px-4 mobile:py-10 px-6 py-14">
							{title ? (
								<Section className="mobile:mb-8 mb-12">
									<Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
										{title}
									</Text>
								</Section>
							) : null}

							{children}

							<Section className="mt-8">
								<Button
									href={ctaHref}
									className="bg-fg font-15 text-bg inline-block px-5 py-3.5 text-center font-sans"
								>
									{ctaLabel}
								</Button>
							</Section>

							{disclaimer ? (
								<Text className="font-13 text-fg-3 m-0 mt-[18px] font-sans">
									{disclaimer}
								</Text>
							) : null}
						</Section>

						<Section className="mobile:px-4 mobile:py-12 border-stroke border-t px-6 py-16">
							<SocialFooter
								lightIcons
								className="bg-bg"
								taglineClassName="font-13 text-fg-2 m-0 max-w-[320px] text-left font-sans"
							/>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}
