import type { ReactNode } from "react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";

interface NotificationAction {
	label: string;
	onClick: () => void;
	loading?: boolean;
	variant?: "default" | "outline" | "destructive";
}

interface NotificationItemCardProps {
	icon: ReactNode;
	title: string;
	subtitle?: string;
	badge?: string;
	actionButton?: NotificationAction;
	primaryAction?: NotificationAction;
	secondaryAction?: NotificationAction;
	variant?: "default" | "warning" | "info";
	className?: string;
}

export function NotificationItemCard({
	icon,
	title,
	subtitle,
	badge,
	actionButton,
	primaryAction,
	secondaryAction,
	variant = "default",
	className = "",
}: NotificationItemCardProps) {
	const resolvedPrimary = primaryAction ?? actionButton;
	const resolvedSecondary = secondaryAction;
	const variantStyles = {
		default: "bg-card border-border",
		warning:
			"bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
		info: "bg-accent/50 border-accent/20",
	};

	return (
		<div
			className={`p-4 rounded-lg border ${variantStyles[variant]} ${className}`}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<div className="shrink-0 mt-0.5">{icon}</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<h4 className="text-sm font-medium text-foreground truncate">
								{title}
							</h4>
							{badge && (
								<Badge variant="outline" className="text-xs px-1.5 py-0.5">
									{badge}
								</Badge>
							)}
						</div>
						{subtitle && (
							<p className="text-xs text-muted-foreground line-clamp-2">
								{subtitle}
							</p>
						)}
					</div>
				</div>
				{(resolvedPrimary || resolvedSecondary) && (
					<div className="flex shrink-0 items-center gap-1">
						{resolvedSecondary ? (
							<Button
								size="sm"
								variant={resolvedSecondary.variant || "outline"}
								onClick={resolvedSecondary.onClick}
								disabled={resolvedSecondary.loading}
								className="text-xs px-3 py-1 h-7"
							>
								{resolvedSecondary.loading ? "..." : resolvedSecondary.label}
							</Button>
						) : null}
						{resolvedPrimary ? (
							<Button
								size="sm"
								variant={resolvedPrimary.variant || "default"}
								onClick={resolvedPrimary.onClick}
								disabled={resolvedPrimary.loading}
								className="text-xs px-3 py-1 h-7"
							>
								{resolvedPrimary.loading ? "..." : resolvedPrimary.label}
							</Button>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}
