# Entitlement packaging — conversion validation

Checklist after aligning Solo / Teams / Teams Pro packaging (handoffs on Solo, collaboration on Teams, workflow control on Teams Pro).

## PostHog (in-app)

Event: `upgrade_plan_prompt_shown` with property `reason` (matches `UpgradeLimitReason`).

**Dashboards to build**

1. Upgrade prompts by `reason` (last 30 days) — surfaces which gates drive upgrades.
2. Funnel: `upgrade_plan_prompt_shown` → checkout started → subscription active, segmented by `reason`.
3. Trial → paid conversion by initial plan (`individual` vs `teams` vs `teams_pro`).

## Pricing page

Solo card now lists gated file packets and payout packets (aligned with hero and catalog).

**Optional A/B** (PostHog on marketing when enabled): Solo card with handoff bullets vs signing-only bullets. Primary metric: pricing checkout starts per visitor.

## User interviews (5–10 solo operators)

Questions:

1. Would you pay **$20/mo** for Solo with basic payouts and gated files?
2. Would you pay **$35/mo** for Teams at **one seat** if you only need per-packet recipient selection?
3. What would make **Teams Pro** worth **$59/seat** for your workflow?

Record WTP and whether they need collaboration vs workflow power only.

## Success signals (4–8 weeks post-alignment)

- Higher Solo trial → paid rate among users who hit payout/gated-file flows.
- Fewer support tickets about “why can't I get payouts on Solo?”
- Teams Pro attach rate stable or up among 3+ seat workspaces (Pro not diluted).

## Deferred

- **Solo Pro** fourth tier — only if Workflow add-on attach rate is high.
- **Workflow add-on** on Solo — design in Dodo after interview data.
