# Filosign 3-Month GTM & Sales Roadmap

This document outlines the outbound strategy, customer acquisition campaigns, and referral loops for the next 90 days. It focuses entirely on founder-led sales and scaling the sales pipeline.

---

## Month 1: Warm Pilot Conversion & Ecosystem Expansion
**Objective:** Onboard the first 5–10 design partners / pilot users to prove value and gather testimonial proof.
**Primary Target:** Warm connections from Filecoin ecosystems, Akindo WaveHack, Metis, and TRON.

### Key Activities:
1. **White-Glove Pilot Outreach:** Reach out directly to Web3 foundations and cohort managers. Leverage the Akindo WaveHack leaderboard #1 ranking and Devconnect Buenos Aires showcase credibility.
2. **High-Value Payout Demos:** Showcase the **Agreement-to-Payout** workflow (freelancer signs milestone document -> USDC releases instantly). Focus on how it eliminates manual multisig chasing and payment tracking.
3. **Pilot Package Offer:**
   - 1-month guided trial.
   - White-glove onboarding (we set up envelopes, recipient lists, and settlement rules for them).
   - Custom features feedback loop.
   - Convert to paid plans at the end of the trial.

### Action Checklist:
- [ ] Draft a list of 20 warm foundation and partner contacts.
- [ ] Deploy cold-email sequence for warm intros using the `atl-btl-messaging` and `cold-email` skills.
- [ ] Set up a dedicated pilot landing page with a direct calendar scheduling link.

---

## Month 2: Outbound Sales & Automated Pipelines
**Objective:** Scale customer acquisition beyond the immediate network.
**Primary Target:** Mid-market Web3 startups, active DAOs, and remote Web3 agencies hiring global freelancers.

### Key Activities:
1. **AI Lead Gen Scaling:** Configure the AI Lead Generation Agent (see [`../outbound/lead-gen-agent-brief.md`](../outbound/lead-gen-agent-brief.md)) to scrape and compile target leads.
   - *Target parameters:* Startups posting jobs for remote contractors; DAOs with active snapshot voting; teams paying in stablecoins.
2. **Cold Outbound Campaigns:** Deploy multi-touch cold email sequences addressing the "cross-border payment and contract admin" friction.
3. **Anchor Objection Handling:** Prepare for security/trust objections:
   - *Objection:* "Are you custodying the payouts?" -> *Response:* "No, the payout is purely non-custodial. Payer approves rules; contract releases tokens directly."
   - *Objection:* "Is it legally binding?" -> *Response:* "Yes, signatures are EIP-712 structured records anchored on-chain with client-side document encryption."

### Action Checklist:
- [ ] Run target segment queries and build lists using the `build-tam` and `niche-signal-discovery` skills.
- [ ] Run lead names or domains through `linkedin-url-lookup` to find exact profiles.
- [ ] Draft the 4-email sequence using the `cold-email-4-sequence` and `sdr-outbound-rules` playbooks.
- [ ] Implement objections playbook inside outbound scripts.

---

## Month 3: Referral Loops & Self-Serve conversion
**Objective:** Establish organic acquisition flywheels and optimize self-serve conversions.
**Primary Target:** High-volume document senders and their signers.

### Key Activities:
1. **Signer Referral Loop:** Every envelope sent to a contractor/signer is an acquisition loop.
   - Optimize the post-signing landing screen to offer a clear "Try Filosign for your own agreements" CTA.
2. **Landing Page Copy Optimization:** Rewrite the public website homepage and pricing page copy using the `copywriting` and `marketing-psychology` skills to target self-serve Solo and Teams upgrades.
3. **Decoy Pricing Experiment:** Position the Teams plan as the most attractive middle tier using anchoring techniques.

### Action Checklist:
- [ ] Implement post-signing conversion CTA screen in the client app.
- [ ] Optimize public pricing page copy and CTAs using pricing anchoring and default-effect bias.
- [ ] Set up landing page A/B tests using the `ab-testing` and `ai-seo` skills.
- [ ] Analyze email campaign metrics (open and reply rates) and adjust copy.

