/** Sign-page field overlays: translucent chrome so PDF shows through. */
export const PLACEMENT_SIGNER_PREVIEW_OVERLAY_CLASSNAME = "opacity-95";

/** Readonly draft/template/file preview overlays (signer-style placeholders). */
export const PLACEMENT_READONLY_SIGNER_OVERLAY_CLASSNAME = `z-[5] ${PLACEMENT_SIGNER_PREVIEW_OVERLAY_CLASSNAME}`;

/** How empty readonly placeholders look on placement overlays. */
export type PlacementPlaceholderPresentation = "recipient" | "signer";
