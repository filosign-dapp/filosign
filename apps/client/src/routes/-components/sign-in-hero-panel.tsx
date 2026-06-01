import Logo from "@/src/lib/components/app/chrome/logo";

export function SignInHeroPanel() {
	return (
		<div className="relative hidden overflow-hidden lg:block">
			<img
				src="/images/stock_1.webp"
				alt=""
				className="absolute inset-0 size-full object-cover"
				width={1920}
				height={1080}
			/>
			<div className="relative z-10 flex h-full flex-col justify-between p-10">
				<Logo
					redirectTo="/"
					className="px-0"
					textClassName="text-foreground"
					textDelay={0}
					iconDelay={0}
				/>
				<blockquote className="max-w-md space-y-3 text-pretty">
					<p className="font-manrope text-xl font-medium leading-snug text-black md:text-2xl">
						Envelopes and signatures your team can verify, without chasing
						status in email threads.
					</p>
					<footer className="text-sm text-neutral-800">
						One workspace for drafts, recipients, and the paper trail when it
						matters.
					</footer>
				</blockquote>
			</div>
		</div>
	);
}
