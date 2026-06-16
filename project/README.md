# Filosign project docs

Company lifecycle hub split into two primary areas:
1. **Product** (`product/`) — Everything related to building the product, roadmap, settlements/billing policy, operations, launch gates, and legal/privacy compliance.
2. **Sales** (`sales/`) — Everything related to selling the product, GTM strategy, outbound campaigns, playbooks, and lead tracking.

## Division of Concerns

### Product (Building & Readiness)
- **Scope & Roadmap:** [`product/scope/roadmap.md`](product/scope/roadmap.md)
- **Pricing & Packaging:** [`product/packaging/pricing-and-packaging.md`](product/packaging/pricing-and-packaging.md)
- **Settlement Policy:** [`product/settlements/settlements/architecture-and-non-custody.md`](product/settlements/settlements/architecture-and-non-custody.md)
- **Contract Evolution:** [`product/contracts/future-scope.md`](product/contracts/future-scope.md)
- **Billing Checkout:** [`product/billing/checkout.md`](product/billing/checkout.md)
- **Ops & Runbooks:** [`product/ops/README.md`](product/ops/README.md)
  - **Launch Checklist:** [`product/ops/production-checklist.md`](product/ops/production-checklist.md)
  - **Legal Readiness:** [`product/ops/legal/readiness-checklist.md`](product/ops/legal/readiness-checklist.md)
  - **GDPR Compliance:** [`product/ops/privacy/gdpr-control-matrix.md`](product/ops/privacy/gdpr-control-matrix.md)

### Sales (Customer Acquisition)
- **Sales Hub:** [`sales/README.md`](sales/README.md)
- **Strategy & ICP:** [`sales/strategy/icp.md`](sales/strategy/icp.md)
- **Positioning & Claims:** [`sales/strategy/positioning.md`](sales/strategy/positioning.md)
- **Outreach & Playbooks:** [`sales/outbound/playbook.md`](sales/outbound/playbook.md)
- **Leads & Pipeline:** [`sales/pipeline/conversion-validation.md`](sales/pipeline/conversion-validation.md)

---

## Technical vs Company boundary

For code, implementation rules, APIs, and dev scripts, refer to the repo root and package documents:
- **Rules & Architecture:** [`AGENTS.md`](../AGENTS.md)
- **Deploy & Compose commands:** [`deploy/README.md`](../deploy/README.md)
- **Scripts:** [`SCRIPTS.md`](../SCRIPTS.md)
- **Server runtime:** [`apps/server/README.md`](../apps/server/README.md)

Company backlog across all areas is tracked in [`todo.md`](todo.md).
