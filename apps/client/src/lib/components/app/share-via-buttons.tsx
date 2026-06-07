import {
	EnvelopeSimpleIcon,
	PaperPlaneTiltIcon,
	WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";

export type ChannelShareLinks = {
	mailto: string;
	whatsapp: string;
	telegram: string;
};

export function buildChannelShareLinks(input: {
	message: string;
	url?: string;
	emailTo?: string[];
	subject?: string;
	telegramText?: string;
}): ChannelShareLinks {
	const subject = input.subject ?? "Shared from Filosign";
	const mailTo = input.emailTo?.length
		? input.emailTo.map(encodeURIComponent).join(",")
		: "";
	const mailtoPrefix = mailTo ? `mailto:${mailTo}` : "mailto:";
	const telegramUrl = input.url ?? "https://filosign.xyz";
	const telegramText = input.telegramText ?? subject;

	return {
		mailto: `${mailtoPrefix}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(input.message)}`,
		whatsapp: `https://wa.me/?text=${encodeURIComponent(input.message)}`,
		telegram: `https://t.me/share/url?url=${encodeURIComponent(telegramUrl)}&text=${encodeURIComponent(telegramText)}`,
	};
}

export function ShareViaButtons({ links }: { links: ChannelShareLinks }) {
	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-8"
				onClick={() =>
					window.open(links.mailto, "_blank", "noopener,noreferrer")
				}
				aria-label="Share via email"
				title="Share via email"
			>
				<EnvelopeSimpleIcon className="size-4" />
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-8"
				onClick={() =>
					window.open(links.whatsapp, "_blank", "noopener,noreferrer")
				}
				aria-label="Share via WhatsApp"
				title="Share via WhatsApp"
			>
				<WhatsappLogoIcon className="size-4" />
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-8"
				onClick={() =>
					window.open(links.telegram, "_blank", "noopener,noreferrer")
				}
				aria-label="Share via Telegram"
				title="Share via Telegram"
			>
				<PaperPlaneTiltIcon className="size-4" />
			</Button>
		</>
	);
}
