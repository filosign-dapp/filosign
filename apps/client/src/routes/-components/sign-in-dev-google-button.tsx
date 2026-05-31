import { GoogleLogoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { clientDevGoogleSignInEnabled } from "@/src/lib/deployment";

export function SignInDevGoogleButton(props: {
	disabled?: boolean;
	isLoading?: boolean;
	onClick: () => void;
}) {
	if (!clientDevGoogleSignInEnabled()) return null;

	return (
		<div className="flex justify-center pt-1">
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-10 touch-manipulation rounded-full border-border/80 bg-background shadow-xs"
				disabled={props.disabled || props.isLoading}
				aria-label="Sign in with Google"
				onClick={props.onClick}
			>
				{props.isLoading ? (
					<span
						className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground motion-reduce:animate-none"
						aria-hidden="true"
					/>
				) : (
					<GoogleLogoIcon
						className="size-5"
						weight="regular"
						aria-hidden="true"
					/>
				)}
			</Button>
		</div>
	);
}

export function SignInCardWithDevGoogle(props: {
	children: ReactNode;
	disabled?: boolean;
	isLoading?: boolean;
	onGoogleSignIn: () => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			{props.children}
			<SignInDevGoogleButton
				disabled={props.disabled}
				isLoading={props.isLoading}
				onClick={props.onGoogleSignIn}
			/>
		</div>
	);
}
