# Sales Docs

This is the central index for selling the product and customer acquisition, structured by sales sub-functions.

## Departments

### 1. Strategy
- **GTM Roadmap:** [`strategy/sales-roadmap.md`](strategy/sales-roadmap.md) - 3-month founder-led sales campaigns and outbound sequence strategy.
- **Positioning:** [`strategy/positioning.md`](strategy/positioning.md) - One-liners, value propositions, and competitor positioning.
- **Wedges & Selling Points:** [`strategy/selling-points.md`](strategy/selling-points.md) - Full index of product capabilities, embedded wallets, email routing, and value propositions.
- **ICP & Use cases:** [`strategy/icp.md`](strategy/icp.md) - Target profiles (foundations, DAOs, startups) and workflow examples.
- **Claims audit:** [`strategy/claims.md`](strategy/claims.md) - Audit of site copy vs shipped product features to verify claims.

### 2. Outbound (Outreach)
- **Sales Playbook:** [`outbound/playbook.md`](outbound/playbook.md) - Founder-led sales scripts, direct outreach playbooks, objection handling, and email templates.
- **Lead Gen Agent:** [`outbound/lead-gen-agent-brief.md`](outbound/lead-gen-agent-brief.md) - Instructions for the AI lead-generation agent.

### 3. Pipeline & Leads
- **Lead Tracker:** [`pipeline/Filosign_Lead_Tracker_Codex_Reviewed.xlsx`](pipeline/Filosign_Lead_Tracker_Codex_Reviewed.xlsx) - Current active leads, status, and partner logs.
- **Conversion validation:** [`pipeline/conversion-validation.md`](pipeline/conversion-validation.md) - Conversion testing and entitlement validations.


---

## Global Sales & Marketing Skills Router

These custom agent skills are installed globally and must be leveraged by agents or the founder when executing GTM campaigns, copywriting, and sales cycles. To prevent context window bloat, the agent must **only** load the specific files mapped below for their assigned task.

### Task-to-Skill Router Table

| GTM Task Category | Target Operational Task | Pinned Skill to Load | Global Path |
| :--- | :--- | :--- | :--- |
| **Outbound Outreach** | Drafting cold email sequences for VPs/Executives (ATL) | `atl-btl-messaging` | [`~/.agents/skills/atl-btl-messaging/SKILL.md`](file:///Users/styles/.agents/skills/atl-btl-messaging/SKILL.md) |
| | Drafting cold email sequences for Managers/ICs (BTL) | `atl-btl-messaging` | [`~/.agents/skills/atl-btl-messaging/SKILL.md`](file:///Users/styles/.agents/skills/atl-btl-messaging/SKILL.md) |
| | Writing general cold outreach or SDR templates | `cold-email` | [`~/.agents/skills/cold-email/SKILL.md`](file:///Users/styles/.agents/skills/cold-email/SKILL.md) |
| | Formatting outbound sequences (cadence, length, follow-ups) | `cold-email-4-sequence` | [`~/.agents/skills/cold-email-4-sequence/SKILL.md`](file:///Users/styles/.agents/skills/cold-email-4-sequence/SKILL.md) |
| | Enforcing SDR writing rules (no fluff, strict word limits) | `sdr-outbound-rules` | [`~/.agents/skills/sdr-outbound-rules/SKILL.md`](file:///Users/styles/.agents/skills/sdr-outbound-rules/SKILL.md) |
| **Lead Generation** | Running a Total Addressable Market (TAM) account filters list | `build-tam` | [`~/.agents/skills/build-tam/SKILL.md`](file:///Users/styles/.agents/skills/build-tam/SKILL.md) |
| | Scraping lists and searching for hiring or funding signals | `niche-signal-discovery` | [`~/.agents/skills/niche-signal-discovery/SKILL.md`](file:///Users/styles/.agents/skills/niche-signal-discovery/SKILL.md) |
| | Resolving lead names or domains into LinkedIn URLs | `linkedin-url-lookup` | [`~/.agents/skills/linkedin-url-lookup/SKILL.md`](file:///Users/styles/.agents/skills/linkedin-url-lookup/SKILL.md) |
| **Sales Ops & CRM** | Integrating webhook triggers or automation workflows | `n8n-automation` | [`~/.agents/skills/n8n-automation/SKILL.md`](file:///Users/styles/.agents/skills/n8n-automation/SKILL.md) |
| | Designing subscription payment rules and limits | `subscription-integration` | [`~/.agents/skills/subscription-integration/SKILL.md`](file:///Users/styles/.agents/skills/subscription-integration/SKILL.md) |
| | Configuring webhook event listeners | `webhook-integration` | [`~/.agents/skills/webhook-integration/SKILL.md`](file:///Users/styles/.agents/skills/webhook-integration/SKILL.md) |
| **Marketing Ops** | Optimizing public site content for AI search citation (SEO) | `ai-seo` | [`~/.agents/skills/ai-seo/SKILL.md`](file:///Users/styles/.agents/skills/ai-seo/SKILL.md) |
| | Configuring pricing pages or decoy pricing strategies | `marketing-psychology` | [`~/.agents/skills/marketing-psychology/SKILL.md`](file:///Users/styles/.agents/skills/marketing-psychology/SKILL.md) |
| | Running statistical landing page A/B split tests | `ab-testing` | [`~/.agents/skills/ab-testing/SKILL.md`](file:///Users/styles/.agents/skills/ab-testing/SKILL.md) |

---

## Outbound Playbooks & Directives

To prevent context pollution and focus your efforts, follow these directives:

*   Use [`outbound/playbook.md`](outbound/playbook.md) for sales philosophy, cold outreach sequences, call scripts, and objection handling.
*   Use [`outbound/lead-gen-agent-brief.md`](outbound/lead-gen-agent-brief.md) for lead scoring rules and search queries.

*Directive:* Read the corresponding global skill in the router table **only** when requested to write new sequences or configure specific tool integrations.








