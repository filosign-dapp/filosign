export type WorkflowProgressStep = {
	id: string;
	label: string;
	detail?: string;
};

export type WorkflowProgressState = {
	steps: WorkflowProgressStep[];
	activeStepId: string | null;
	completedStepIds: string[];
	error?: { stepId: string; message: string };
	status: "running" | "success" | "error";
};

export type WorkflowProgressDisplay = {
	label: string;
	detail?: string;
	isError: boolean;
};

export type WorkflowProgressEventStatus =
	| "start"
	| "done"
	| "error"
	| "wallet_prompt"
	| "confirming";
