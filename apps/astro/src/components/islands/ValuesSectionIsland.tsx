import {
	LockKeyIcon,
	ShieldCheckIcon,
	UsersThreeIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const badgeClass =
	"inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium bg-secondary/50 text-secondary-foreground";

type ValueItem =
	| {
			type: "text";
			title: string;
			description: string;
			icon: ReactNode;
	  }
	| {
			type: "image";
			src: string;
			alt: string;
	  };

const values: ValueItem[] = [
	{
		type: "text",
		title: "Verifiable Evidence",
		description:
			"Signing workflows should produce records that can be explained outside a normal vendor dashboard.",
		icon: <ShieldCheckIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_2.webp",
		alt: "Team member working",
	},
	{
		type: "text",
		title: "Private by Default",
		description:
			"Documents are encrypted before upload, and Filosign should not need plaintext access to agreement contents.",
		icon: <LockKeyIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_1.webp",
		alt: "Team collaboration",
	},
	{
		type: "image",
		src: "/images/stock_4.webp",
		alt: "Office environment",
	},
	{
		type: "text",
		title: "Familiar UX",
		description:
			"Crypto infrastructure should stay mostly invisible. Users should be able to sign and move on.",
		icon: <UsersThreeIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_6.webp",
		alt: "Discussion",
	},
	{
		type: "text",
		title: "Non-custodial Settlement",
		description:
			"Optional USDC settlement uses exact user approvals. Filosign does not custody funds.",
		icon: <WalletIcon className="size-6" />,
	},
];

export default function ValuesSectionIsland() {
	return (
		<MotionProvider>
			<section className="py-24 px-4 md:px-8 lg:px-page bg-background">
				<div className="max-w-7xl mx-auto">
					<MarketingInViewStagger
						pace="page"
						className="flex flex-col items-center text-center mb-16 space-y-4"
					>
						<div className={badgeClass}>
							<UsersThreeIcon className="mr-1 size-3" />
							Our values
						</div>

						<h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight max-w-3xl mx-auto font-manrope">
							We believe agreements should be private, verifiable, and able to
							execute the workflow they represent.
						</h2>
					</MarketingInViewStagger>

					<MarketingInViewStagger
						pace="page"
						maxVisible={12}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
					>
						{values.map((item) => (
							<div
								key={item.type === "text" ? item.title : item.src}
								className={`relative overflow-hidden rounded-3xl h-[360px] md:h-[420px] group ${
									item.type === "text"
										? "bg-muted/30 p-8 flex flex-col justify-between"
										: ""
								}`}
							>
								{item.type === "text" ? (
									<>
										<div className="space-y-4">
											<div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm text-foreground">
												{item.icon}
											</div>
											<h3 className="text-xl font-semibold font-manrope">
												{item.title}
											</h3>
										</div>
										<p className="text-muted-foreground leading-relaxed">
											{item.description}
										</p>
									</>
								) : (
									<img
										src={item.src}
										alt={item.alt}
										width={400}
										height={500}
										className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
									/>
								)}
							</div>
						))}
					</MarketingInViewStagger>
				</div>
			</section>
		</MotionProvider>
	);
}
