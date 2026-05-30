# Filosign Subscription Tiers Per-User Cost Analysis

> **Pricing source of truth:** Solo **\$20 / \$15**, Teams **\$35 / \$29**, Teams Pro **\$59 / \$49** (monthly list / yearly per-month). Catalog: [`packages/entitlements/src/catalog/v1.ts`](../../packages/entitlements/src/catalog/v1.ts).

This report breaks down fixed, variable, and per-user break-even costs for Filosign subscription tiers, assuming a base of **3,000 paying users (senders)**.

## 1. Cost Parameters & Assumptions

### Thirdweb MAU Pricing Formula
* **Formula:** `Thirdweb Cost = \$99 + \$0.015 * (x - 1,000)` where `x` is the total Monthly Active Users (MAUs).
* **Assumption:** Total MAU `x = 3 * Paying Users (P)`.
* **For 3,000 paying users:** Total MAU `x = 9,000`.
* **Thirdweb Monthly Cost:** `99 + 0.015 * (9,000 - 1,000) = \$219.00 USD / month`.
* **Thirdweb Cost share per paying user:** `... = \$0.073 USD / user / month`.

### Fixed Monthly Overhead (For 3,000 Users)
* **All Tiers:**
  * Thirdweb Pro RPC: \$219.00/mo
  * Web & DB Hosting (Fly.io + Supabase): \$50.00/mo
  * Settlement relay gas (server EOA on Base): variable; no third-party automation platform fee
  * **Total Fixed Cost:** \$269.00/mo (\$0.0897 USD / user / month)

### Gas Cost Models on Base L2 (Per Document)
* **Model A (Standard Low-Congestion):** Based on a flat fee of `... = \$0.002 USD per transaction` (representing the lower bound of standard Base Mainnet transactions, typically \$0.002 to \$0.005 USD).
* **Model B (Standard Conservative):** Based on a flat fee of `... = \$0.005 USD per transaction` (representing the upper bound of standard Base Mainnet transactions).

### Email Cost Model (Resend with SES Scale Transition)
* **Email Frequency per Document:**
  * **Free Tier:** 2 emails per document (1 invitation, 1 completion copy).
  * **Paid Tiers (Avg. 3 Recipients):** 4 emails per document (3 invitations, 1 completion copy to sender).
* **Resend Pricing Model:**
  * For initial launch volume (under 100k emails/month), Resend is used at its standard **\$35.00/mo** plan for 100k emails.
  * Baseline email rate: `\$35.00 / 100,000 = \$0.00035 USD per email`.
  * **Variable Email Cost per Document:**
    * **Free Tier:** `2 emails * \$0.00035 = \$0.0007 USD`
    * **Paid Tiers:** `4 emails * \$0.00035 = \$0.0014 USD`
* **Scale Mitigation:**
  * If/when the platform scales past 100k emails/mo (approx. 1,000–1,500 total paid users), we will migrate from Resend to **Amazon SES** (\$0.10 per 1,000 emails, or \$0.0001 per email), which drops our variable email costs to \$0.0002 (Free) / \$0.0004 (Paid) per document.

### Payment Processor Fee (Dodo Payment)
* **Fee Structure:** 6% + \$0.40 USD per subscription payment transaction (international card + subscription rate).
* **Monthly Billing Option (catalog v1 shipped tiers):**
  * **Solo (\$20.00/mo):** `(0.06 * \$20.00) + \$0.40 = \$1.60 USD fee` (Net Revenue: \$18.40/mo)
  * **Teams (\$35.00/mo):** `(0.06 * \$35.00) + \$0.40 = \$2.50 USD fee` (Net Revenue: \$32.50/mo)
  * **Teams Pro (\$59.00/mo):** `(0.06 * \$59.00) + \$0.40 = \$3.94 USD fee` (Net Revenue: \$55.06/mo)
  * **Platform Starter (\$99.00/mo, planned):** `(0.06 * \$99.00) + \$0.40 = \$6.34 USD fee` (Net Revenue: \$92.66/mo)
  * **Platform Pro (\$349.00/mo, planned):** `(0.06 * \$349.00) + \$0.40 = \$21.34 USD fee` (Net Revenue: \$327.66/mo)
  * **Enterprise (custom, modeled \$125.00/mo):** `(0.06 * \$125.00) + \$0.40 = \$7.90 USD fee` (Net Revenue: \$117.10/mo)
* **Annual Billing Option (paid upfront annually):**
  * **Solo (\$15.00/mo, \$180.00/yr):** `(0.06 * \$180.00) + \$0.40 = \$11.20 USD fee/yr` (Monthly Equiv. Fee: \$0.93; Net Revenue: \$14.07/mo)
  * **Teams (\$29.00/mo, \$348.00/yr):** `(0.06 * \$348.00) + \$0.40 = \$21.28 USD fee/yr` (Monthly Equiv. Fee: \$1.77; Net Revenue: \$27.23/mo)
  * **Teams Pro (\$49.00/mo, \$588.00/yr):** `(0.06 * \$588.00) + \$0.40 = \$35.68 USD fee/yr` (Monthly Equiv. Fee: \$2.97; Net Revenue: \$46.03/mo)

---

## 2. Subscription Tiers Breakdown

### 1. Free (`free`)
* **Volume:** 3 documents lifetime limit per user (Max **1 recipient** per document, E2EE + PQC enabled, invite-only, No Payments).
* **Variable Cost per Document:**
  * **Model A (Low):** **`\$0.0047 USD`** (Gas \$0.0040 + Resend email \$0.0007)
  * **Model B (Conservative):** **`\$0.0107 USD`** (Gas \$0.0100 + Resend email \$0.0007)
* **Thirdweb MAU Cost:** A free user (1 sender + max 1 recipient) generates up to 4 MAU. At \$0.015 per MAU, this adds **`\$0.0600 USD`** as a one-time cost.
* **Total Marginal One-Time Cost to support 1 Free User:**
  * **Model A (Low-Congestion):** `(3 docs * \$0.0047) + \$0.060 = \$0.0741 USD` (one-time)
  * **Model B (Conservative):** `(3 docs * \$0.0107) + \$0.060 = \$0.0921 USD` (one-time)

### 2. Solo (`individual`, no settlement)
* **Volume:** 10 documents per user / month (Avg. **3 recipients** per document, E2E & PQC Encryption enabled by default).
* **Variable Cost per Document:**
  * **Model A (Low):** **`\$0.0094 USD`** (Gas \$0.0080 + Resend email \$0.0014)
  * **Model B (Conservative):** **`\$0.0214 USD`** (Gas \$0.0200 + Resend email \$0.0014)
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (10 docs * \$0.0094) = \$0.1837 USD / month` (Rounded to **... = \$0.18 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (10 docs * \$0.0214) = \$0.3037 USD / month` (Rounded to **... = \$0.30 / mo**)

### 3. Teams (settlement.basic)
* **Volume:** 30 documents per user / month (Avg. **3 recipients** per document, Web3 USDC Payments & Shared templates enabled).
* **Variable Cost per Document:**
  * **Model A (Low):** **`\$0.0134 USD`** (Gas \$0.0120 + Resend email \$0.0014)
  * **Model B (Conservative):** **`\$0.0314 USD`** (Gas \$0.0300 + Resend email \$0.0014)
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (30 docs * \$0.0134) = \$0.4917 USD / month` (Rounded to **... = \$0.49 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (30 docs * \$0.0314) = \$1.0317 USD / month` (Rounded to **... = \$1.03 / mo**)

### 4. Teams Pro (settlement + advanced routing)
* **Volume:** 30 documents per user / month (Avg. **3 recipients** per document, Custom Smart Contract rules, Web3 Payments enabled).
* **Variable Cost per Document:** Same as Team (payments enabled) = Model A: \$0.0134, Model B: \$0.0314.
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (30 docs * \$0.0134) = \$0.4917 USD / month` (Rounded to **... = \$0.49 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (30 docs * \$0.0314) = \$1.0317 USD / month` (Rounded to **... = \$1.03 / mo**)

### 5. Platform Starter (API)
* **Volume:** 100 documents per user / month (Avg. **3 recipients** per document, E2EE, PQC, signing API & webhooks enabled).
* **Variable Cost per Document:** Same as Team (payments enabled) = Model A: \$0.0134, Model B: \$0.0314.
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (100 docs * \$0.0134) = \$1.4297 USD / month` (Rounded to **... = \$1.43 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (100 docs * \$0.0314) = \$3.2297 USD / month` (Rounded to **... = \$3.23 / mo**)

### 6. Secure Enterprise (Custom Pricing / Institutional)
* **Volume:** 100 documents per user / month (Avg. **3 recipients** per document, Multi-sig, priority RPC relays).
* **Variable Cost per Document:** Same as Team (payments enabled) = Model A: \$0.0134, Model B: \$0.0314.
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (100 docs * \$0.0134) = \$1.4297 USD / month` (Rounded to **... = \$1.43 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (100 docs * \$0.0314) = \$3.2297 USD / month` (Rounded to **... = \$3.23 / mo**)

### 7. Platform Pro (Embedded)
* **Volume:** 500 documents per user / month (Avg. **3 recipients** per document, full white-labeled embedded signing, JS SDK, priority RPC relays).
* **Variable Cost per Document:** Same as Team (payments enabled) = Model A: \$0.0134, Model B: \$0.0314.
* **Total Cost per User / Month (Break-Even):**
  * **Model A (Low-Congestion):**
    `Fixed share (\$0.0897) + (500 docs * \$0.0134) = \$0.0897 + \$6.70 = \$6.7897 USD / month` (Rounded to **... = \$6.79 / mo**)
  * **Model B (Conservative):**
    `Fixed share (\$0.0897) + (500 docs * \$0.0314) = \$0.0897 + \$15.70 = \$15.7897 USD / month` (Rounded to **... = \$15.79 / mo**)

---

## 3. Subscription Cost Comparison Summary

Assuming 3,000 paying users, here is the break-even run-rate compared side-by-side:

| Subscription Tier | Payments Enabled | Monthly Document Limit | Cost per User (Model A - Low) | Cost per User (Model B - Conservative) |
| :--- | :---: | :---: | :---: | :---: |
| **Free** | No | 3 / mo | **\$0.07** (one-time support cost) | **\$0.09** (one-time support cost) |
| **Solo** | No | 10 | **\$0.18 / mo** | **\$0.30 / mo** |
| **Teams** | Yes | 15 / seat | **\$0.49 / mo** | **\$1.03 / mo** |
| **Teams Pro** | Yes | 25 | **\$0.49 / mo** | **\$1.03 / mo** |
| **Platform Starter** | Yes | 100 | **\$1.43 / mo** | **\$3.23 / mo** |
| **Secure Enterprise** | Yes | 100 | **\$1.43 / mo** | **\$3.23 / mo** |
| **Platform Pro** | Yes | 500 | **\$6.79 / mo** | **\$15.79 / mo** |

---

## 4. Profit Margin Analysis (Net of Dodo Payment Fees)

The following tables calculate the net profit margin per tier, deducting both the **Dodo Payment Fee** and the **infrastructure/gas/email costs**. We detail both the **Monthly Billing** and **Annual Billing** options.

### Table 4a: Monthly Billing Option
* **Formula:** `Net Profit = Monthly Price - Dodo Fee - Operational Cost`
* **Formula:** `Net Margin (%) = (Net Profit / Monthly Price) * 100`

| Subscription Tier | Monthly Price | Dodo Fee | Net Revenue | Model A Cost | Model A Net Profit | Model A Net Margin | Model B Cost | Model B Net Profit | Model B Net Margin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Solo** | \$20.00 | \$1.60 | \$18.40 | \$0.18 | **\$18.22** | **91.1%** | \$0.30 | **\$18.10** | **90.5%** |
| **Teams**| \$35.00 | \$2.50 | \$32.50 | \$0.49 | **\$32.01** | **91.5%** | \$1.03 | **\$31.47** | **89.9%** |
| **Teams Pro** | \$59.00 | \$3.94 | \$55.06 | \$0.49 | **\$54.57** | **92.5%** | \$1.03 | **\$54.03** | **91.6%** |
| **Platform Starter** | \$99.00 | \$6.34 | \$92.66 | \$1.43 | **\$91.23** | **92.2%** | \$3.23 | **\$89.43** | **90.3%** |
| **Secure Enterprise** | Custom (\$125.00)*| \$7.90 | \$117.10 | \$1.43 | **\$115.67** | **92.5%** | \$3.23 | **\$113.87** | **91.1%** |
| **Platform Pro** | \$349.00 | \$21.34 | \$327.66 | \$6.79 | **\$320.87** | **91.9%** | \$15.79 | **\$311.87** | **89.4%** |

*\*Note: Enterprise is marketed as "Custom/Contact Us" on the website, but calculations are modeled at an internal baseline of \$125.00/user/mo.*

### Table 4b: Annual Billing Option (Monthly Equivalent Economics)
* **Formula:** `Dodo Fee (Monthly Equiv.) = (Annual Price * 0.06 + \$0.40) / 12`
* **Formula:** `Net Monthly Profit = Monthly Equiv. Price - Dodo Fee (Monthly Equiv.) - Operational Cost`
* **Formula:** `Net Margin (%) = (Net Monthly Profit / Monthly Equiv. Price) * 100`

| Subscription Tier | Monthly Equiv. Price | Annual Transaction | Dodo Fee (Monthly Equiv.) | Net Monthly Revenue | Model A Cost | Model A Net Profit | Model A Net Margin | Model B Cost | Model B Net Profit | Model B Net Margin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Solo** | \$15.00 (\$180/yr) | \$180.00 | \$0.93 | \$14.07 | \$0.18 | **\$13.89** | **92.6%** | \$0.30 | **\$13.77** | **91.8%** |
| **Teams**| \$29.00 (\$348/yr) | \$348.00 | \$1.77 | \$27.23 | \$0.49 | **\$26.74** | **92.0%** | \$1.03 | **\$26.20** | **90.2%** |
| **Teams Pro** | \$49.00 (\$588/yr) | \$588.00 | \$2.97 | \$46.03 | \$0.49 | **\$45.54** | **93.0%** | \$1.03 | **\$45.00** | **91.8%** |
| **Platform Starter** | \$79.00 (\$948/yr) | \$948.00 | \$4.77 | \$74.23 | \$1.43 | **\$72.80** | **92.2%** | \$3.23 | **\$71.00** | **89.9%** |
| **Secure Enterprise** | Custom (\$99.00)*| \$1,188.00 | \$5.97 | \$93.03 | \$1.43 | **\$91.60** | **92.5%** | \$3.23 | **\$89.80** | **90.7%** |
| **Platform Pro** | \$299.00 (\$3,588/yr)| \$3,588.00 | \$17.97 | \$281.03 | \$6.79 | **\$274.24** | **91.7%** | \$15.79 | **\$265.24** | **88.7%** |

*\*Note: Enterprise is marketed as "Custom/Contact Us" on the website, but calculations are modeled at an internal baseline of \$99.00/user/mo billed annually (\$1,188.00/yr).*

---

## 5. Key Profitability Observations

1. **Robust Unit Economics & High Margins:**
   * Introducing developer platform plans and annual discounts preserves net margins comfortably above **88.7%** (under Model B) or **91.7%+** (under Model A) across all tiers.
   * Platform Starter (\$99/\$79) and Platform Pro (\$349/\$299) capture high margins despite high volume limits, validating our premium, cryptographic developer SDK positioning.
2. **Annual Billing Transaction Efficiency:**
   * Because annual billing triggers only a single payment transaction per year rather than 12, we avoid paying the fixed \$0.40 Dodo fee 11 times.
   * For **Solo**, annual billing can improve margin under Model B despite a lower per-month list rate (see tables above — recalculate when pricing changes).
3. **Free User Subsidy Capacity (Model B):**
   * Free tier (3 docs/mo) incurs a *one-time* marginal acquisition cost of \$0.0921 (Model B) per user path — recalculate subsidized free users from each paid tier's net profit when pricing or doc limits change.

> [!NOTE]
> **Developer Platform API & SDK Roadmap Footnote:** The Developer Platform API (Starter/Pro) and the client JS SDK are planned roadmap items. The core platform API capabilities must be built and integrated before we can actively charge developer subscribers.

---

## 6. Future Scale & Hidden Cost Considerations

While unit margins exceed 90%, scaling to 3,000+ active users introduces minor overheads to monitor:

1. **Storage & Egress (FOC):**
   * **Specs:** Filecoin Onchain Cloud (FOC) storage is \$2.50/TiB/mo (allotted in duplicate, so **\$5.00/TiB/mo**). CDN egress is fixed at **\$14.00/TiB**.
   * **Scale Impact:** At ~75 GB/mo new data and 4x downloads, storage grows to **\$4.40/mo** in Year 1, and egress adds **\$4.10/mo**. Total overhead is under **\$10.00/mo** (less than \$0.0001/doc).
2. **Post-Quantum Cryptography (PQC) Gas Markup:**
   * PQC signatures (Dilithium/ML-DSA) are **~2,400 to 3,300 bytes** (vs. legacy ECDSA's **64 bytes**). This increases Base L2 transaction size and gas fees. Model B (\$0.005/txn) cushions this, but congestion can impact fees.
3. **Settlement execution gas (server relay):**
   * Post-sign and **Settle payment** paths use the server relayer EOA on Base L2. Budget minor ETH for spikes; off-platform payouts sync via daily cron (up to ~24h UI lag).
4. **SaaS Tooling Scaling:**
   * Monitoring/log services (PostHog, Sentry, BetterStack) are free initially, but will add **\$30–\$55/mo** in aggregate once volumes cross free limits.
5. **Payment Chargebacks & Disputes:**
   * Dodo Payments charges a flat **\$30.00 fee** per dispute/chargeback.
   * **Visa RDR:** Automatically resolves disputes to protect merchant reputation, but **Dodo still bills the flat \$30.00 fee** per RDR transaction. Processor commissions (6%) are also lost on refunds.

