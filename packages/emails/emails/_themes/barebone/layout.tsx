/** Adapted from react-email demo 01-Barebone/activation (MIT). */
import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import { SocialFooter } from "../shared/social-footer";
import type { EmailLayoutProps } from "../types";
import { BareboneFonts } from "./fonts";
import { bareboneTailwindConfig } from "./theme";

export function BareboneLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	footnote,
	disclaimer,
}: EmailLayoutProps) {
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
								<Section className="mb-3 px-6">
									<Row>
										<Column className="w-1/2 py-[7px] align-middle">
											<Img
												src={filosignEmailAssets.logo}
												alt="Filosign"
												width={32}
												height={32}
												className="block"
											/>
										</Column>
										<Column
											align="right"
											className="w-1/2 py-[7px] align-middle"
										>
											<Text className="font-13 text-fg-3 m-0 text-right font-sans">
												Filosign
											</Text>
										</Column>
									</Row>
								</Section>

								<Section className="bg-bg-2 mobile:px-6 mobile:py-12 rounded-[8px] px-[40px] py-[64px] text-center">
									{title ? (
										<Section className="mb-3">
											<Img
												src={filosignEmailAssets.logo}
												alt="Filosign"
												width={48}
												height={48}
												className="mx-auto mb-5 block"
											/>
											<Heading
												as="h1"
												className="font-28 text-fg m-0 font-sans"
											>
												{title}
											</Heading>
										</Section>
									) : null}

									{children}

									<Section className="mb-6 text-center">
										<Button
											href={ctaHref}
											className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6"
										>
											{ctaLabel}
										</Button>
									</Section>

									{footnote ? (
										<Text className="font-13 text-fg-3 mx-auto mt-0 mb-6 max-w-[400px] text-center font-sans">
											{footnote}
										</Text>
									) : null}

									{disclaimer ? (
										<Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[400px] text-center font-sans">
											{disclaimer}
										</Text>
									) : null}
								</Section>

								<SocialFooter />
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}
