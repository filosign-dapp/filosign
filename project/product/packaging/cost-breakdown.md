# Filosign Envelope Unit Economics & Cost Analysis

> **Last validated:** 2026-06 (review after mainnet gas samples). Multi-leg settlements = **one relay tx per leg**, not one tx per packet.

This report calculates the exact variable costs per envelope and structural fixed overheads for Filosign based on Base Mainnet gas metrics (assuming an Ethereum price of ~$2,014).

---

## 1. Core Assumptions
* **Envelope Size:** 3 files per envelope, with an average file size of 2MB (6MB total space including drafts).
* **Participants:** 1 sender + 3 recipients (4 total wallet keys active).
* **Payment Settlement:** 1 settlement rule attached with 3 payout legs (destined for the 3 recipients).
* **Comms:** 10 email notifications/reminders sent via Amazon SES.
* **Storage:** Stored on Cloudflare R2.
* **Gas Payer:** Filosign sponsors 100% of the user's transactions (ERC-20 token approvals and on-chain rule registrations) using Thirdweb's gas relayer, in addition to paying relayer gas for document registrations and settlement execution.

---

### A. Blockchain Gas Relay (Paid by Filosign relayer & sponsored via Thirdweb)
Filosign pays gas for both server-side operations and client-side sponsored transactions:
* **Server Relayer Actions:**
  * File Registration: 150,000 gas units per document
  * Payout relay: ~120,000 gas units **per leg** (`executePayoutLeg`)
* **Sponsored Client Actions (via Thirdweb):**
  * ERC-20 `approve` (token allowance): 45,000 gas units
  * Smart Contract `registerRule` (on-chain rule): 120,000 gas units

> [!NOTE]
> **Codebase Constraint:** Under the current client implementation (in `use-controller.ts:L348`), the platform strictly enforces exactly **one document per envelope** (`if (createForm.documents.length !== 1)` returns an error). Therefore, the platform currently executes only **1 file registration** per envelope.

We analyze two scenarios below:

#### Scenario A: Current Codebase Constraint (1 Document/File per Envelope)
* **Gas Breakdown:** 
  * 1 File Registration: 150,000 gas
  * 1 Payout Relay: 120,000 gas
  * 1 Sponsored `approve`: 45,000 gas
  * 1 Sponsored `registerRule`: 120,000 gas
* **Total Gas Units:** 435,000 gas units
* **L2 Execution Fee:** At Base floor rate of 0.005 gwei:
  `435,000 gas × 0.000000005 gwei/gas × 2,014 USD/ETH = $0.0044 USD`
* **L1 Security Fee:** Average blob data submissions (accounting for 2x spikes on Base):
  `4 txs × $0.0020 = $0.0080 USD`
* **Total Current Gas Cost:** **$0.0124 USD (approx. 1.2 cents)**

#### Scenario B: Future Extension (3 Documents/Files per Envelope)
* **Gas Breakdown:** 
  * 3 File Registrations: 450,000 gas
  * 1 Payout Relay: 120,000 gas
  * 1 Sponsored `approve`: 45,000 gas
  * 1 Sponsored `registerRule`: 120,000 gas
* **Total Gas Units:** 735,000 gas units
* **L2 Execution Fee:** At Base floor rate of 0.005 gwei:
  `735,000 gas × 0.000000005 gwei/gas × 2,014 USD/ETH = $0.0074 USD`
* **L1 Security Fee:** Average blob data submissions (accounting for 2x spikes on Base):
  `6 txs × $0.0020 = $0.0120 USD`
* **Total Gas Cost:** **$0.0194 USD (approx. 1.9 cents)**

### B. Wallet Provisioning (Thirdweb in-app / Smart Wallets)
* **Pricing:** $0.0150 USD per Monthly Active User (MAU) after the free tier of 1,000 MAUs.
* **Per Envelope:** 1 sender + 3 recipients.
* **Returning Users:** If these wallets are already active in the billing cycle, the marginal cost is **$0.00 USD**.
* **New Users (Worst-Case with 6-Month Recipient Cushion):** To ensure the sender's payment covers the ongoing cost of invited recipients logging in to sign or view documents over time, we model the sender's wallet for the active month plus the 3 recipient wallets cushioned for 6 months:
  * Sender (1 month): `1 × $0.015 = $0.0150 USD`
  * Recipients (6-month cushion): `3 × $0.015 × 6 months = $0.2700 USD`
  * **Total Worst-Case Wallet Cost per Envelope:** **$0.2850 USD (28.5 cents)**

### C. Storage & Operations (Cloudflare R2)
* **Storage (3 files + 3 drafts = 12MB total):** R2 charges $15.00/TB. Storing 12MB (0.000012 TB) costs:
  `0.000012 TB × $15.00 = $0.00018 USD`
* **Write Operations (Class A):** 6 write calls at $4.50 per million:
  `(6 / 1,000,000) × $4.50 = $0.000027 USD`
* **Total Storage Cost:** **$0.0002 USD (approx. 0.02 cents)**

### D. Transactional Emails (Amazon SES)
* **Pricing:** $0.10 USD per 1,000 emails.
* **Per Envelope (10 emails):** 10 emails sent for notifications and reminders:
  `10 × ($0.10 / 1,000) = $0.0010 USD (0.1 cents)`

---

## 3. Variable Cost Summary (Per Envelope)

### Scenario A: Current Codebase Constraint (1 Document/File per Envelope)
* **Typical Case (Returning Active Wallets):** **$0.0136 USD (approx. 1.4 cents)**
* **Worst Case (4 Brand-New Wallets, 6-Month Cushion):** **$0.2986 USD (approx. 29.9 cents)**

### Scenario B: Future Extension (3 Documents/Files per Envelope)
* **Typical Case (Returning Active Wallets):** **$0.0206 USD (approx. 2.1 cents)**
* **Worst Case (4 Brand-New Wallets, 6-Month Cushion):** **$0.3056 USD (approx. 30.6 cents)**

---

## 4. Structural Fixed Costs (Monthly)

These are base infrastructure costs required to keep the platform online:

* **Hetzner Cloud VPS:** **$20.00 / month** (upgraded to a 4GB/8GB RAM node for server + web).
* **Neon Serverless Database:** **$19.00 / month** (Launch plan).
* **Thirdweb Growth / Engine Tier:** **$99.00 / month** (billed once past 1,000 MAU limits).
* **Domain & DNS:** **$1.00 / month** ($12/year registration averaged).
* **Total Fixed Cost:** **$139.00 / month**

---

## 5. Margin Matrix by Tier (Scenario A - Current Constraint)

Calculated using the typical Scenario A envelope cost of **$0.0136 USD** (returning wallets) and worst-case Scenario A envelope cost of **$0.299 USD** per envelope (including the 6-month recipient wallet cushion), along with Dodo Payments' fee of **6% + $0.40**:

| Tier | Price / Mo | Doc Limit | Avg Variable Cost (Typical) | Max Variable Cost (Worst-Case) | Merchant Fee (Dodo: 6.0% + $0.40) | Net Margin (Typical) | Net Margin (Worst-Case) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Solo** | $20.00 | 10 | $0.14 | $2.99 | $1.60 | **$18.26 (91.3%)** | **$15.41 (77.1%)** |
| **Solo (50% Off)** | $10.00 | 10 | $0.14 | $2.99 | $1.00 | **$8.86 (88.6%)** | **$6.01 (60.1%)** |
| **Teams** | $35.00 | 15 | $0.20 | $4.49 | $2.50 | **$32.30 (92.3%)** | **$28.01 (80.0%)** |
| **Teams (50% Off)** | $17.50 | 15 | $0.20 | $4.49 | $1.45 | **$15.85 (90.6%)** | **$11.56 (66.1%)** |
| **Teams Pro** | $59.00 | 25 | $0.34 | $7.48 | $3.94 | **$54.72 (92.7%)** | **$47.58 (80.6%)** |
| **Teams Pro (50% Off)** | $29.50 | 25 | $0.34 | $7.48 | $2.17 | **$26.99 (91.5%)** | **$19.85 (67.3%)** |

---

## 6. Chargeback & Dispute Risk Mitigation

* **Invite-Only / Pilot Stage:** Modeled at **0%** dispute rate since early design partners are trusted and directly managed.
* **Public Scale-Up Stage:** We model a standard SaaS benchmark dispute rate of **0.5%** (1 in 200 customers disputing). For a $30.00 subscription transaction, this amortizes to **$0.15 USD** in dispute reserve per transaction (accounting for the flat $30.00 Dodo penalty), which is easily absorbed by the 86%+ net margins.

---

## 7. Non-Envelope Cost Drivers

These operational factors drive platform costs independent of envelope volume:
* **Dormant Wallet Logins:** Users accessing history or settings generate a **$0.015/MAU** Thirdweb fee without sending envelopes.
* **System-Level Emails:** Magic Links, password resets, welcome emails, and team invites billed via Amazon SES.
* **Analytics/Telemetry Limits:** Viral landing page traffic or dashboard sessions can exceed PostHog/Sentry free quotas, triggering paid tiers.
* **Database & Indexing Growth:** Long-term accumulation of audit trails, user profiles, and organization logs can push Neon DB beyond baseline limits.
