# Filosign Subscription Tiers Entitlement & Feature Roadmap

This document outlines the detailed entitlement breakdown for each of Filosign's subscription tiers. For each tier, it lists the **Existing Features** (already modeled/provided) and the **Suggested Features** that need to be built to support our E2EE, PQC, and Web3-integrated signature architecture.

---

## Entitlement Matrix Overview

| Tier | Type | Monthly Rate (Monthly / Annual) | Doc Limit | Existing Core Features | Suggested Features to Build |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Free Trial** | SaaS | \$0.00 | 3 lifetime (Invite-only) | E2EE + PQC, Max 1 Recipient | Standard Fields, Manual Reminders, Basic Audit Trail |
| **Secure Solo** | SaaS | \$15.00 / \$9.00 | 10 / mo | E2EE + PQC, 3 Recipients | E2EE Signer Attachments, Advanced Fields, CSV Export |
| **Secure Team Std** | SaaS | \$35.00 / \$25.00 | 30 / user/mo | USDC Escrows & Settlements, Shared Templates | Shared Template Libraries (Team Keys), Sequential Signing (Signing Order), Team Address Book, Auto-Reminders |
| **Secure Team Pro** | SaaS | \$55.00 / \$40.00 | 30 / user/mo | Custom Escrows, Multichain, Workspace Permissions | Bulk Send (Client Loop), E2EE Comments, Conditional Logic, Custom Branding, Quota Allocation, Custom Subdomains, Shared Template Folders, Advanced Audit Export, Metadata Tagging |
| **Platform Starter** | Developer | \$99.00 / \$79.00 | 100 / mo | PQC Signing API, Webhooks | API Key Mgmt, Webhook Signatures, Testnet Sandbox, Custom Metadata Passthrough |
| **Secure Enterprise** | Enterprise | Custom (\$125.00 / \$99.00) | 100 / user/mo | Multi-sig, Dedicated KMS, Organization Rules | BYOK (AWS KMS/Vault), SSO/SAML, AD Sync, Log Streaming, Custom SMTP Relay, Activity Logs |
| **Platform Pro** | Developer | \$349.00 / \$299.00 | 500 / mo | Embedded Iframe, JS SDK, Priority RPC | `postMessage` Events, Document Assembly API, Node/Go WASM SDKs, SDK White-labeled SMTP |

---

## Detailed Tier Entitlements & Suggested Roadmap

### 1. Free Trial
*Designed as a zero-barrier entry point for testing the E2EE signing flow.*

*   **Existing Features:**
    *   3 documents lifetime limit (Invite-Only).
    *   Maximum 1 recipient per document.
    *   Client-side End-to-End Encryption (E2EE) using local WASM keys.
    *   *Note:* Post-Quantum Cryptography (PQC) is active by default. Web3 payments/escrow settlements are disabled.
*   **Suggested Features to Build:**
    *   **Standard Form Fields:** Basic drag-and-drop fields (Signature, Full Name, Date Signed, and Single-line Textbox).
    *   **Manual Email Reminders:** A button in the dashboard allowing the sender to trigger a manual sign invitation reminder email.
    *   **Basic Audit Trail:** Downloadable PDF certificate showing document hash, timestamps, and IP addresses.
    *   **Mobile-Responsive Signing UI:** Mobile layout optimization for quick on-the-go signing.
*   **Free Trial Distribution & Gating Mechanics:**
    *   **"Request Access" Gate (Astro Landing Page):** Senders cannot sign up without a valid invite code ("NO SIGNUP WITHOUT CODE"). The Astro page features a "Request Access" button.
    *   **Waitlist Application Form Fields:**
        1. Social Handles (Twitter/X or LinkedIn link).
        2. "What do you plan on signing?" (Use-case check).
        3. "Where did you hear about Filosign?" (Attribution).
    *   **Automated vs. Manual Invite Logic:**
        *   *Auto-Approve (Work Emails):* If a work email domain is detected (e.g., corporate domains, excluding public providers like `@gmail.com`, `@yahoo.com`), the system automatically generates and emails a unique invite code.
        *   *Manual Review (Public/Personal Emails):* Signups with public domains are held in a review queue.
    *   **Invite Management (Superadmin Dashboard):** A simple superadmin dashboard to manage invites, view form responses, and manually trigger code emails. Future upgrades include using an LLM to automatically analyze/score form answers and trigger invite emails.

---

### 2. Secure Solo
*Designed for independent professionals, lawyers, and freelancers requiring high security.*

*   **Existing Features:**
    *   10 documents per month.
    *   Average of 3 recipients per document.
    *   Post-Quantum Cryptography (PQC) Dilithium/ML-DSA signatures fully enabled by default.
    *   Full client-side E2EE.
*   **Suggested Features to Build:**
    *   **Encrypted Signer Attachments:** Senders can request signers to upload documents (e.g., photo ID, credentials) during the signing process. 
        *   *E2EE Architecture:* The signer's browser encrypts the uploaded file with the envelope's public key before uploading it to IPFS/S3. Only the sender can decrypt it.
    *   **Advanced Field Types:** Checkbox groups, radio buttons, dropdown selects, and validation patterns (e.g., checking for valid email formats).
    *   **Local CSV Data Export:** Users can export form data. Since data is encrypted on the server, the user's browser must fetch the encrypted envelope blobs, decrypt them using local keys, and compile the CSV locally.

---

### 3. Secure Team
*Designed for small businesses implementing automated cryptocurrency payments.*

*   **Existing Features:**
    *   30 documents per user/mo (pooled across team members).
    *   Automated blockchain settlements (escrowing stablecoins like USDC and releasing payouts upon signature).
    *   Shared document templates.
*   **Suggested Features to Build:**
    *   **Shared Template Libraries (Team Key-Sharing):** Team members need to share encrypted templates.
        *   *Why E2EE Templates:* Storing templates in plaintext compromises our "Zero-Knowledge" claim (since templates contain 90% of proprietary contract text, IP terms, and pricing). It also keeps codebase rendering pipelines unified.
        *   *E2EE Architecture:* Templates are encrypted with a symmetric *Team Key*. This Team Key is encrypted for each member using their public key, allowing them to decrypt the templates on login.
    *   **Sequential Signing Workflows (Signing Order):** Allow teams to enforce a strict ordering for document completion (e.g., Recipient 1 must sign before Recipient 2 receives the invitation). Senders can toggle between parallel and sequential signing during envelope creation.
    *   **Basic Webhook Integrations:** Outgoing webhooks to push basic status changes to external URLs (e.g., notifying a Discord/Slack channel on signature).
    *   **Encrypted Shared Contacts & Team Address Book:** A central workspace directory where members can save frequently used signer details and pre-fetched public encryption keys to streamline signing workflows.
    *   **Automated Reminder Rules & Expiration Scheduler:** Senders can configure automated expiration limits and custom reminder schedules (e.g., daily/weekly follow-ups) for envelopes.

---

### 4. Secure Team Pro
*Designed for advanced Web3 teams requiring custom settlement rules and complex workspaces.*

*   **Existing Features:**
    *   30 documents per user/mo (pooled across team members).
    *   Custom smart-contract payout rules (multi-sig releases, multi-chain payouts).
    *   Workspace team permissions.
*   **Suggested Features to Build:**
    *   **Seat Quota Allocation / Redistribution:** An admin panel interface allowing workspace owners to set custom document caps per user or reallocate seat quotas within the team's pooled limit.
    *   **Bulk Send (Client-Side Loop):** Senders can upload a CSV list of names/emails and send a unique envelope to each recipient.
        *   *E2EE Architecture:* The browser must run a loop, encrypting the document uniquely for each recipient's key, and batch-upload the encrypted files.
    *   **E2EE Collaborative Comments:** A sidebar allowing signers and senders to chat about the contract. Comments must be encrypted using the envelope key, keeping comments zero-knowledge to our servers.
    *   **Conditional Field Logic & Calculations:** Dynamic fields (e.g., hiding/showing fields based on checkboxes, or summing up contract line items automatically).
    *   **Custom Branding:** Teams can upload their organization logo, customize signature page colors, and tailor email templates for a consistent, professional brand experience.
    *   **Custom Subdomains:** Allow organizations to host signing pages on their own custom domain (e.g., `sign.yourcompany.com`) using wildcard DNS routing at zero marginal hosting cost.
    *   **Shared Template Folders:** A database-level permission layer that allows teams to organize shared encrypted templates into shared folders/directories without any additional crypto or compute overhead.
    *   **Advanced Audit Export:** Client-side generation and export of decrypted audit trails and envelope metadata logs into CSV or JSON format, shifting compilation compute to the client browser.
    *   **Custom Metadata Tagging & Dashboard Filters:** Allow team users to assign custom tags (e.g., #Sales, #HR) to envelopes and filter their dashboard views for better document organization.

---

### 5. Platform Starter (API)
*Designed for developers building basic apps requiring cryptographically secure, automated sign flows.*

*   **Existing Features:**
    *   100 documents per month (then \$0.50 per document overage).
    *   Access to the PQC signing API.
    *   Webhook event delivery.
*   **Suggested Features to Build:**
    *   **API Key Management Dashboard:** Secure creation, rotation, and revocation of API credentials.
    *   **Cryptographically Signed Webhooks:** To prevent spoofing, webhooks must include a signature header (e.g., `X-Filosign-Signature` generated via a SHA256 HMAC secret), allowing developer servers to verify that the webhook came from Filosign.
    *   **Embedded Signing Sandbox (Testnet Mode):** A developer sandbox running on Sepolia/Base Sepolia, enabling end-to-end API integration tests without gas or contract charges.
    *   **Custom Metadata Passthrough:** Allow developers to append custom JSON key-value pairs (metadata) to API envelopes, which are returned in webhook events and status query responses to easily map envelopes to internal databases.

---

### 6. Secure Enterprise
*Designed for VC firms, OTC trading desks, and protocols handling institutional agreements.*

*   **Existing Features:**
    *   100 documents per user/mo (pooled).
    *   Dedicated KMS key custody.
    *   Custom organization smart-contract rules and multi-sig wallets.
    *   Priority RPC relays.
*   **Suggested Features to Build:**
    *   **Bring Your Own Key (BYOK):** Enterprise customers can configure Filosign to use their own cloud KMS (e.g., AWS KMS, HashiCorp Vault) to encrypt/decrypt master key fragments. If they revoke access to their KMS, Filosign can no longer decrypt any of their files.
    *   **Single Sign-On (SSO / SAML / OIDC):** Integration with corporate identity providers like Okta or Azure AD, while retaining local cryptographic key decryption.
    *   **Active Directory / LDAP Sync:** Automated provisioning and de-provisioning of team seats.
    *   **Audit Log Streaming:** Live export of access and signature events directly to external enterprise security monitoring tools (e.g., Splunk or Datadog).
    *   **eWitness & QES Compliance:** Video identity verification integrations to satisfy eIDAS Qualified Electronic Signature standards for regulated regions (e.g., Europe).
    *   **Bring Your Own SMTP / Custom SMTP Relay:** Allow enterprises to route signature invitations and completed document copies through their own email server configuration (such as AWS SES, Resend, or SendGrid keys) under their own corporate domains at zero marginal cost to us.
    *   **Team Activity Logs & Compliance Audit Trails:** A comprehensive workspace-wide log detailing all member actions (e.g., template edits, envelope deletions, settings updates) for compliance auditing.

---

### 7. Platform Pro (Embedded)
*Designed for Web3 SaaS products embedding white-labeled cryptographic signatures into their user journeys.*

*   **Existing Features:**
    *   500 documents per month (then \$0.40 per document overage).
    *   Full white-labeled embedded signing iframe.
    *   Javascript client-side SDK.
    *   Priority RPC relays and dedicated Slack/Telegram developer support.
*   **Suggested Features to Build:**
    *   **Iframe Window Messaging (`postMessage` events):** Enabling the parent window to capture real-time signing states from the iframe (e.g., close modal on `filosign:signed`, show toast on `filosign:declined`).
    *   **Document Assembly API (Anchor Text Matching):** Programmatic placement of signature/date fields by searching the PDF text for specific keys (e.g., placing a signature tab wherever the text `[Sign_Here_1]` is found).
    *   **Server-Side WASM SDKs:** Official SDKs (Node.js, Go, Python) that compile our WASM crypto utilities, allowing developer servers to perform E2EE encryption/decryption locally before communicating with our API endpoints.
    *   **SDK White-labeled SMTP Relay:** Allow developers using the embedded signing SDK to route system-generated email invites and completed copies through their own SMTP relays to maintain brand consistency.

---

> [!NOTE]
> **Developer Platform API & SDK Roadmap Footnote:** The Developer Platform API (Starter/Pro) and the client JS SDK are planned roadmap items. The core platform API capabilities must be built and integrated before we can actively charge developer subscribers.
