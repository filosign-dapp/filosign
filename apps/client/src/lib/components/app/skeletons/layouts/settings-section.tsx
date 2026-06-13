import { SkeletonSection } from "@/src/lib/components/app/skeletons/primitives";
import { cn } from "@/src/lib/utils/index";

export function SettingsPageSkeleton({
	sectionCount = 3,
	className,
}: {
	sectionCount?: number;
	className?: string;
}) {
	return (
		<div
			className={cn("mx-auto w-full max-w-2xl space-y-10 p-8", className)}
			aria-busy="true"
			aria-live="polite"
			role="status"
		>
			{Array.from({ length: sectionCount }, (_, index) => (
				<SkeletonSection key={index} fieldCount={index === 0 ? 3 : 2} />
			))}
			<span className="sr-only">Loading settings</span>
		</div>
	);
}
