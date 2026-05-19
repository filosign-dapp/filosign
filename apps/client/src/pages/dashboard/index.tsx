import { useReceivedFiles, useSentFiles } from "@filosign/react/files";
import { useReceivedRequests } from "@filosign/react/sharing";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect } from "react";
import { formatUnits } from "viem";
import { useBalance } from "wagmi";
import { Image } from "@/src/lib/components/custom/Image";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { useThirdwebUserInfo } from "@/src/lib/hooks/use-thirdweb-user-info";
import DashboardLayout from "./layout";

/** Invalidate queries for notifications and documents to re-fetch on navigation */
function invalidateDashboardQueries(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	queryClient.invalidateQueries({ queryKey: ["received-files"] });
	queryClient.invalidateQueries({ queryKey: ["sent-files"] });
	queryClient.invalidateQueries({ queryKey: ["received-requests"] });
}

const statsCards = [
	{
		title: "Your Documents",
		value: "0",
		description: "Total this month",
		color: "text-primary",
		link: "/dashboard/document/all",
		image: "https://cdn-icons-png.flaticon.com/512/2786/2786356.png",
	},
	{
		title: "Your Signatures",
		value: "0",
		description: "Awaiting completion",
		color: "text-primary",
		link: "/dashboard",
		image: "https://cdn-icons-png.flaticon.com/512/10186/10186368.png",
	},
	{
		title: "Your Envelopes",
		value: "0",
		description: "In progress",
		color: "text-primary",
		link: "/dashboard",
		image: "https://cdn-icons-png.flaticon.com/512/3814/3814611.png",
	},
];

export default function DashboardPage() {
	const { user } = useThirdwebUserInfo();
	const queryClient = useQueryClient();
	const { data: balance } = useBalance({
		address: user?.wallet?.address as `0x${string}`,
	});

	// Re-fetch notifications and documents when navigating to dashboard
	useEffect(() => {
		invalidateDashboardQueries(queryClient);
	}, [queryClient]);

	// Subscribe to query data for stats (optional - for future use)
	useReceivedFiles();
	useSentFiles();
	useReceivedRequests();

	return (
		<DashboardLayout>
			<div className="flex flex-col h-full rounded-tl-2xl bg-background @container">
				{/* Header */}
				<motion.div
					className="flex items-center justify-between px-8 py-6 border-b"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<div>
						<h1 className="text-2xl font-semibold">Dashboard</h1>
						<p className="text-muted-foreground">
							Overview of your document signing activity
						</p>
					</div>
				</motion.div>

				<div className="p-8 rounded-large mx-8 mt-8 bg-card gap-4 @3xl:gap-8 flex flex-col @3xl:flex-row items-start @3xl:items-center justify-between">
					<div>
						<h4 className="font-semibold mb-1">
							Finish setting up your account
						</h4>
						<p className="text-muted-foreground">
							Check out your profile and update your information
						</p>
					</div>
					<Button
						variant="primary"
						className="group"
						render={<Link to="/dashboard/settings/profile" />}
					>
						Update Profile
					</Button>
				</div>

				<div className="flex-1 p-8 space-y-8">
					{/* Stats Cards */}
					<motion.div
						className="grid grid-cols-1 @3xl:grid-cols-3 gap-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.2 }}
					>
						{statsCards.map((stat) => (
							<Link to={stat.link} key={stat.title}>
								<Card
									key={stat.title}
									className="hover:bg-muted/40 transition-all"
								>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardDescription className="text-sm font-medium flex items-center gap-2">
											{stat.title}
										</CardDescription>
									</CardHeader>
									<CardContent className="flex items-center justify-between">
										<div className="flex flex-col gap-2">
											<p className="text-4xl font-bold">{stat.value}</p>
											<p className="text-xs text-muted-foreground">
												{stat.description}
											</p>
										</div>
										<Image
											src={stat.image}
											alt={stat.title}
											className="object-contain p-2"
											width={100}
											height={100}
										/>
									</CardContent>
								</Card>
							</Link>
						))}
					</motion.div>

					<div className="grid grid-cols-1 @3xl:grid-cols-2 gap-8">
						{/* Document Status Overview */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.3 }}
						>
							<Card className="h-full">
								<CardHeader>
									<CardTitle className="text-lg">Document Status</CardTitle>
									<CardDescription>
										Current signing pipeline overview
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="p-4 bg-primary text-primary-foreground rounded-lg text-center">
											<div className="text-2xl font-bold">0</div>
											<div className="text-sm">Awaiting Signatures</div>
										</div>
										<div className="p-4 bg-muted/20 rounded-lg text-center">
											<div className="text-2xl font-bold text-secondary-dark">
												0
											</div>
											<div className="text-sm text-muted-foreground">
												Under Review
											</div>
										</div>
									</div>

									<div className="space-y-3">
										<div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
											<div className="flex items-center gap-3">
												<div className="size-2 bg-primary rounded-full"></div>
												<span className="text-sm font-medium">
													Completed This Week
												</span>
											</div>
											<span className="text-sm font-bold">0</span>
										</div>

										<div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
											<div className="flex items-center gap-3">
												<div className="size-2 bg-secondary-dark rounded-full"></div>
												<span className="text-sm font-medium">
													Average Completion Time
												</span>
											</div>
											<span className="text-sm font-bold">0 days</span>
										</div>

										<div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
											<div className="flex items-center gap-3">
												<div className="size-2 bg-primary-medium rounded-full"></div>
												<span className="text-sm font-medium">
													Success Rate
												</span>
											</div>
											<span className="text-sm font-bold">0%</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Wallet/Accounts Section */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.4 }}
						>
							<Card className="h-full">
								<CardHeader>
									<CardTitle className="text-lg">Wallet</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="p-4 bg-primary text-primary-foreground rounded-lg">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium">Balance</span>
											<Badge variant="primary" className="text-xs">
												Active
											</Badge>
										</div>
										<div className="text-2xl font-bold">0 USDFC</div>
									</div>

									<div className="p-4 bg-muted/20 rounded-lg">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium">Gas Reserve</span>
											<Badge variant="outline" className="text-xs">
												Reserve
											</Badge>
										</div>
										<div className="text-lg font-semibold">
											{balance?.value
												? Number(
														formatUnits(balance.value, balance.decimals),
													).toFixed(4)
												: "0.0000"}{" "}
											FIL
										</div>
										<div className="text-xs text-muted-foreground">
											For transaction fees
										</div>
									</div>

									<div className="space-y-2 pt-2">
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">This Month</span>
											<span className="font-medium">0 signatures</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												Avg. Cost/Signature
											</span>
											<span className="font-medium">0 FIL</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
