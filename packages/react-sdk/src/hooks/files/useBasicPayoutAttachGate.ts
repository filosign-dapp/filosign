import {
	canAttachBasicPayout,
	resolveBasicPayoutGate,
} from "../../lib/entitlements";
import { useEntitlements } from "../billing/useEntitlements";
import { useActiveOrgId } from "../orgs/useOrganizations";
import { useSettlementFeatureAccessGet } from "../orgs/useSettlementFeatureAccessGet";

export function useBasicPayoutAttachGate() {
	const { data: entitlements } = useEntitlements();
	const activeOrgId = useActiveOrgId();
	const accessQuery = useSettlementFeatureAccessGet(activeOrgId ?? undefined);
	const access = accessQuery.data;

	return {
		entitlements,
		access,
		accessQuery,
		gate: resolveBasicPayoutGate(entitlements, access),
		canAttach: canAttachBasicPayout(entitlements, access),
	};
}
