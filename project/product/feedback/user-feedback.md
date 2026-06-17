# User feedback

Captured feedback from design partners and early users. Use for prioritisation; cross-link to [`todo.md`](todo.md) when items become backlog work.

---

## Light mode polish

**Report:** Light mode feels unpolished and washed out compared to dark mode.

**Assessment:** Correct. Dark mode is in better shape; light mode needs a dedicated polish pass (contrast, surfaces, tokens).

**Future work:** Theme / design-system pass on light mode.

---

## Document management (documents page)

**Report:**

- No way to delete or archive a document from the documents page.
- No multi-select or bulk operations (delete, archive, etc.).
- User could not find any option to select multiple documents.

**Assessment:** Correct. These features do not exist yet.

**Future work:**

- Single-document actions: delete, archive (or equivalent lifecycle).
- Multi-select UI on the documents list.
- Bulk operations on selected documents.

---

## Design Partner Invites vs marketing site

**Report:** Design Partner Invites only cover the Filosign app invite. The app has no links or mentions of the marketing site, which explains what Filosign does. Recipients may land on the dashboard without context on the product.

**Assessment:** Valid for cold outreach on design partnership. Invite copy should set expectations: visit [filosign.xyz](https://filosign.xyz) to understand the product; the invite link goes to the app dashboard.

**Future work:**

- Improve Design Partner Invite email copy so recipients know to read the marketing site first.
- Consider in-app or email links to filosign.xyz where appropriate.
- Be careful with cold outreach on design partnership until copy and onboarding context are clearer.

---

## Document cap visibility (billing + create flow)

**Report:** The document cap is too subtle right now. People may miss that there is a hard cap on how many documents they can send.

**Assessment:** Valid concern. Cap awareness should be explicit both where plan limits are shown and at the point of action.

**Future work:**

- Make cap visibility prominent in billing (plan limits and usage context).
- Surface cap clearly on the create page before users send documents.
- Add clearer usage messaging (for example, current usage vs cap) so limits are hard to miss.

---

## Localized currencies on pricing page

**Report:** Pricing should show localized currencies so visitors can see the product price in their local value, not just USD.

**Assessment:** Valid for international prospects. USD-only pricing adds friction for non-US buyers who have to mentally convert or may assume the product is US-only.

**Future work:**

- Show prices in the visitor's local currency on the marketing pricing page (with USD as fallback or source of truth).
- Use a reliable FX or geo-based currency display approach; keep checkout/billing currency behavior aligned with what Dodo or billing actually charges.
