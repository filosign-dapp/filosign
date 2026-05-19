export type ChangeType = "Feature" | "Enhancement" | "Fix";

export type ChangelogEntry = {
	id: string;
	date: string;
	type: ChangeType;
	title: string;
	description: string[];
	image?: string;
};

export const ChangelogEntries: ChangelogEntry[] = [
	{
		id: "9",
		date: "Mar 31, 2026",
		type: "Enhancement",
		title: "End-to-End Gasless User Experience",
		description: [
			"Implemented server-sponsored meta-transactions to eliminate the need for users to hold native gas tokens.",
			"Covers 99% of platform actions including key registration, document sending, and the entire signing workflow.",
			"Dramatically reduces onboarding friction, allowing new users to participate in the web3 ecosystem with zero initial funding.",
		],
	},
	{
		id: "10",
		date: "Mar 31, 2026",
		type: "Enhancement",
		title: "Mobile-First Design & Compliance Reporting",
		description: [
			"Complete architectural overhaul to ensure a flawless mobile-first experience within webviews.",
			"New automated Compliance Report generation that produces human-readable PDFs with embedded cryptographic proofs of all on-chain actions.",
			"Optimized WASM performance and reduced load times by 50% through improved edge deployment and library optimizations.",
		],
	},
	{
		id: "1",
		date: "Jan 11, 2026",
		type: "Feature",
		title: "Post-quantum signature library",
		description: [
			"We've launched a comprehensive signature management system with support for multiple signature types: draw, type, or upload your own signature image.",
			"All signatures are now secured with Dilithium post-quantum cryptography and anchored to FVM smart contracts, ensuring long-term verifiability even as quantum computing advances.",
			"The signature library includes visual hash verification, allowing you to confirm document integrity at a glance before signing.",
		],
	},
	{
		id: "2",
		date: "Dec 20, 2025",
		type: "Enhancement",
		title: "Enhanced document sharing with permission system",
		description: [
			"Our secure document sharing now includes a comprehensive approval workflow. Senders must request permission before sharing documents, ensuring you have full control over who can send you files.",
			"The system uses ECDH key exchange for end-to-end encryption, guaranteeing that only approved recipients can decrypt shared documents.",
			"We've also added network discovery features, making it easy to see who you can send to and who can send to you based on mutual approvals.",
		],
	},
	{
		id: "3",
		date: "Nov 28, 2025",
		type: "Feature",
		title: "User profiles with decentralized identity",
		description: [
			"Introducing user profiles with unique usernames, display names, avatars, and rich metadata. Your profile is stored off-chain for privacy while maintaining decentralized identity principles.",
			"Profile information makes it easier to identify collaborators in your document network, with real-time username availability checking and profile existence validation.",
			"All profile data integrates seamlessly with our existing document sharing and acknowledgment system.",
		],
	},
	{
		id: "4",
		date: "Nov 12, 2025",
		type: "Enhancement",
		title: "Filecoin storage migration and optimization",
		description: [
			"Documents now automatically migrate from temporary S3 storage to permanent Filecoin storage via FilCDN, ensuring long-term availability and immutability.",
			"We've optimized the storage pipeline to reduce upload times while maintaining end-to-end encryption throughout the process.",
			"All documents are now content-addressed using IPFS CIDs, making them verifiable and accessible through any IPFS gateway.",
		],
	},
	{
		id: "5",
		date: "Oct 25, 2025",
		type: "Fix",
		title: "Dual-factor authentication improvements",
		description: [
			"Enhanced the PIN + wallet signature authentication flow with improved error handling and clearer feedback during the registration and login process.",
			"Fixed an issue where Argon2id PIN hashing could timeout on slower devices. We've optimized the memory-hard function parameters for better performance across all devices.",
			"Improved the master seed derivation process, ensuring consistent key generation across sessions.",
		],
	},
	{
		id: "6",
		date: "Oct 8, 2025",
		type: "Feature",
		title: "React SDK with IndexedDB caching",
		description: [
			"Launched our comprehensive React SDK with type-safe hooks, automatic IndexedDB caching, and seamless integration with the FilosignProvider.",
			"The SDK now includes automatic cache invalidation, offline support for cached data, and comprehensive error handling with detailed error types.",
			"Developers can now build Filosign-powered applications with full TypeScript support and React Query integration for optimal performance.",
		],
	},
];
