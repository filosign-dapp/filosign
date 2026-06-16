# Additional workspace checkout (Dodo)

New workspace checkout (`billing.createNewWorkspaceCheckout`) should use **Dodo products without a free trial**.

Why: each additional workspace is a separate subscription. Per-subscription trials allow repeated trial stacking (checkout → create → cancel → repeat).

Implementation notes:

- Checkout metadata includes `filosign_checkout_kind: new_workspace` and `filosign_no_trial: true`.
- Configure Teams / Teams Pro SKUs used for this flow with **no trial period** in the Dodo dashboard.
- Solo (`individual`) is not offered on this path; Solo remains on the personal workspace only.
