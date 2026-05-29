import { cn } from "../../../lib/cn";

type MockAvatarVariant = "primary" | "muted" | "outline";
type MockAvatarSize = "xs" | "sm" | "md";

type MockAvatarProps = {
	initial: string;
	className?: string;
	variant?: MockAvatarVariant;
	size?: MockAvatarSize;
};

const sizeClasses: Record<MockAvatarSize, string> = {
	xs: "size-5 text-[10px]",
	sm: "size-7 text-xs",
	md: "size-10 text-sm",
};

const variantClasses: Record<MockAvatarVariant, string> = {
	primary: "bg-primary font-bold text-primary-foreground",
	muted: "bg-muted font-bold text-muted-foreground",
	outline: "border border-foreground/30 font-medium text-foreground",
};

function shapeClass(variant: MockAvatarVariant, size: MockAvatarSize): string {
	if (variant === "outline" || size === "sm") return "rounded-full";
	return "rounded-lg";
}

export default function MockAvatar({
	initial,
	className,
	variant = "primary",
	size = "md",
}: MockAvatarProps) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center font-manrope",
				sizeClasses[size],
				shapeClass(variant, size),
				variantClasses[variant],
				className,
			)}
		>
			{initial}
		</div>
	);
}
