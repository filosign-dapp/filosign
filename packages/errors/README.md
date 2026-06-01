# @filosign/errors

User-facing error catalog for Filosign (toasts + Astro help articles).

## Add a user-facing error

1. Add entry to `src/catalog/*.ts` with `audience: "user"` and `supportSlug`.
2. Add `apps/astro/src/content/help-errors/{supportSlug}.mdx` (one MDX source per catalog code; rendered on `/help` in an accordion; toast Help links use `/help#{supportSlug}`).

Help steps must match real UI and server checks in the repo (no assumed flows like page-by-page scroll unless the product implements them).
3. Server: `throwAppError("YOUR.CODE", { params? })` from `@filosign/errors/server`.
4. Run `bun test` in this package (MDX sync + copy guard tests must pass).

## Exports

- `@filosign/errors` — catalog, `presentError`, `isValidationOrpcError`
- `@filosign/errors/server` — `throwAppError`
- `@filosign/errors/client` — `showErrorToast` (requires `sonner`)

Internal failures: do not add user MDX; client shows `GENERIC.UNKNOWN`.

## Sonner surface

`showErrorToast` shows **title**, **description**, and the **first** catalog step only. Write `description` and `steps[0]` so each stands alone in the toast.

Optional catalog `dedupeKey` overrides Sonner `id` (templates use `{{param}}` like `description`).

## Client app

Mutation handling, `presentAppError`, and `localMutationErrorOptions`: [`apps/client/README.md`](../../apps/client/README.md).
