# GTM & Sales Playbook

This is the consolidated source of truth for founder-led sales campaigns and direct outreach at Filosign.

**Also read:** ICP detail [`../strategy/icp.md`](../strategy/icp.md) · safe claims [`../strategy/claims.md`](../strategy/claims.md) · pilots on [sandbox.filosign.xyz](https://sandbox.filosign.xyz).

---

## 1. Direct Outreach Philosophy

Our first customers will not come from broad marketing campaigns. They will come from founder-led, painfully specific outreach to operators who already suffer from signing-plus-payment friction.

### The Core Lessons

1. **Recruit Users Manually (Do Things That Don't Scale):** Manually onboard early users, set up their workflows by hand, and do unscalable work to learn the exact trigger for their workflows.
2. **Leverage the Unfair Network First:** Intentionally target ecosystems where we already have warm connections or credibility (Filecoin Foundation, FIL-B, FilOz, Akindo, Devconnect, Alliance/YZi intros).
3. **Founder-Led Discovery:** Founders must lead early sales. The goal is not just selling; it is debugging the ICP, understanding objections, and refining the product roadmap based on real feedback.
4. **Relevance over Personalization:** Good relevance beats generic personalization. Instead of citing where someone went to school, focus on their operational role: they run a grant program, pay global contractors, and require signed documents before payouts.
5. **Sell the Pain, Not the Product:** Do not lead with zero-knowledge encryption or Merkle proofs. Sell the direct business outcomes: fewer manual payout steps, a secure audit trail, and eliminating the manual invoice/tax-form chase.

---

## 2. Unorthodox Growth Angles

To stand out in cold outreach, we focus on **contrarian clarity** and positioning a sharp enemy.

* **The Enemy:** Agreements that stop at a static PDF while the payment execution remains a manual, separated chore. (DocuSign proves someone clicked a button; it does not execute the business outcome).
* **Contrarian Demos & Content:**
  - Build side-by-side flow comparisons: "Current workflow: 11 manual steps. Filosign: 3 automated steps."
  - Publish teardowns on DAO grant payout delays.
  - Create a "Grant Payout Delay Calculator" showing operational overhead.
  - Offer to manually migrate a team's active grant or contractor agreement into a template for free.

---

## 3. Seniority Targeting (ATL vs BTL)

* **ATL (Above-the-Line):** Executives, Founders, CFOs. Keep emails to 2-3 sentences. Focus on audit readiness, risk mitigation, and preventing payment leakage (paying before milestones are signed).
* **BTL (Below-the-Line):** DevRel, Program Managers, Operations. Keep emails to 3-4 sentences. Focus on day-to-day workflows, time saved, and eliminating the manual PDF-to-wallet coordination chase.

---

## 4. Outreach Sequence & Templates

Below is the standard 4-email outbound sequence cadence.

### Email 1: First Touch (Observation + Pain)
*Subject:* [Company] milestone audits  
*Goal:* Identify the trigger and ask the diagnostic question.

```
Hi [Name],

I saw you recently updated the [Company] RFP page.

How are you currently auditing the signed milestone paperwork before releasing the USDC payouts to your grantees?

We help Web3 ecosystem leads combine the signing step and non-custodial payouts in one workflow to prevent payment leakage.

Worth exploring?
```

### Email 2: Value & Case Study (3 Days Later)
*Subject:* Re: [Company] milestone audits  
*Goal:* Provide context and proof.

```
Hi [Name],

To give you more context, we recently helped Web3 teams in the Filecoin network automate their milestone sign-offs.

Before, their grants team spent hours cross-referencing PDFs with multisig transactions. Now, the signed milestones trigger the payout rules automatically in a non-custodial vault.

Would a similar proof trail be useful for your Q3 cohorts?
```

### Email 3: The Short CTA (7 Days Later)
*Subject:* Re: [Company] milestone audits  
*Goal:* A low-friction, interest-based CTA.

```
Hi [Name],

I know you are busy running the program.

Would you be open to seeing a 2-minute video showing how other Web3 leads structure sign-to-settle flows for remote contributors?

If not, no worries at all.
```

### Email 4: Breakup (14 Days Later)
*Subject:* Re: [Company] milestone audits  
*Goal:* Politely close the thread.

```
Hi [Name],

Since I haven't heard back, I'll assume milestone-to-payment automation isn't a priority for [Company] right now.

If that changes and you want to secure your audit trail later, you can reach me here.

Best,
Kartik
```

---

## 5. Discovery Calls & Objection Handling

Early sales calls are diagnostic, not persuasive. Do not demo first; learn their current workflow.

### Diagnostic Questions
1. "What documents or forms must be completed before you release a payout?"
2. "Who signs them, and who approves the payment?"
3. "How do you pay: bank wire, USDC, multisig, or a payroll platform?"
4. "Where does the process slow down or break?"
5. "If we set up one guided workflow manually for you, which one should it be?"

### Objection Handling

* **"We do not need automated settlement."**  
  *Response:* That is fine. Filosign handles private signing, viewer permissions, and cryptographic proof packets. Settlement is entirely optional.
* **"We cannot pay in crypto."**  
  *Response:* You can use Filosign for document workflow and compliance proof first. Fiat/on-ramp settlement is planned for later.
* **"We already use DocuSign."**  
  *Response:* DocuSign proves a button was clicked. Filosign verifies signature identity, client-side encrypts the document, and generates a portable proof packet that connects directly to the business outcome.
* **"This sounds legally complex."**  
  *Response:* Filosign is designed for evidence, document integrity, and cryptographic proof. We do not claim QES or broad legal certification today.
* **"Why blockchain?"**  
  *Response:* Users do not need to care or know. The blockchain layer is used to verify signatures independently and support non-custodial payouts.

---

## 6. 30-Day Customer Acquisition Plan

### Week 1: Build Lead List
Create 100 targeted leads (40 grant programs, 25 devrel teams, 20 crypto startups, 15 bounty platforms) following the criteria in the [Lead Gen Brief](file:///Users/styles/Styles/Code/filosign/project/sales/outbound/lead-gen-agent-brief.md).

### Week 2: Send 30 High-Quality Emails
Send the first 30 emails manually. Track open and reply rates. Target: 5-8 replies, 3-5 calls.

### Week 3: Run Discovery Calls
Execute discovery calls using the diagnostic script. Focus on identifying specific workflow bottlenecks.

### Week 4: Convert 1-2 Pilots
Offer the **Design Partner Offer**:
* *The Pitch:* We are onboarding 10 Web3 teams. We will set up one guided workflow for free, run it for one month, and build around your feedback.
* *Success Metric:* The partner hands over one real document/payment workflow and agrees to test it.

---

## 7. Agent Instructions

Sales agents must follow these guidelines:
* Find workflow-triggered leads, not just famous crypto companies.
* Cite source URLs for every trigger signal.
* Write personalization around direct operational pain, avoiding fake flattery.
* Never claim mainnet traction or QES legal certification.
