# @filosign/motion

Shared monorepo motion design package using **Framer Motion (`motion/react`)**. Standardizes spring physics, transitions, layout animation components, and system-level accessibility controls across the Filosign workspaces (both the Vite client dashboard and the Astro marketing website).

---

## Why `@filosign/motion`?

1. **Brand Consistency:** unifies all spring parameters, staggers, and visual physics between the marketing site (`apps/astro`) and the core application (`apps/client`).
2. **Zero Dependency Footprint:** isolates animation utilities from Web3 wallets, RPC wrappers, and WASM libraries inside the React SDK, allowing Astro to render light, fast pages without dependency bloat.
3. **Accessibility Out-of-the-Box:** maps system-level `prefers-reduced-motion` settings globally and provides helper hooks to automatically degrade spring animations to instant transitions or opacity fades.

---

## 1. Shared Tokens Catalog

Avoid hard-coding inline numbers (e.g. stiffness, damping, duration) across components. Instead, import standard tokens:

```typescript
import { SPRING_TOKENS, TWEEN_TOKENS, LOOP_TOKENS } from "@filosign/motion";
```

### Spring Physics Presets (`SPRING_TOKENS`)
Springs calculate movement dynamically, enabling physical inertia and interruptible transitions:

*   `pop`: `stiffness: 500, damping: 20` — aggressive, bouncy staggers (e.g., dropdown list items).
*   `bouncy`: `stiffness: 345, damping: 20` — playful mount animations (e.g., logo icon).
*   `smooth`: `stiffness: 230, damping: 25` — default panel entrances and text slide-ins.
*   `smoothHeavy`: `stiffness: 230, damping: 30, mass: 1.2` — elegant, heavier entrance slide-ins (e.g., login widgets).
*   `snappy`: `stiffness: 400, damping: 28, mass: 0.8` — immediate micro-interactions (e.g., buttons, toggles, checkboxes).
*   `soft`: `stiffness: 200, damping: 25` — gentle layout shifts (e.g., settings profile cards).
*   `glide`: `stiffness: 180, damping: 28` — low stiffness, controlled drift (e.g., sliding panels).

### Tweens (`TWEEN_TOKENS`)
Used for non-physical visual crossfades (like text label swaps and opacity sweeps) where springs can look jittery:
*   `normal`: `duration: 0.2, ease: "easeInOut"`
*   `fast`: `duration: 0.12, ease: "easeInOut"`

### Loops (`LOOP_TOKENS`)
Used for infinite animations (loading loaders, shimmer skeletons). Under reduced motion, loop execution is automatically throttled or stopped:
*   `shimmer`: `repeat: Infinity, ease: "linear", duration: 1.5`
*   `spinner`: `repeat: Infinity, ease: "linear", duration: 1`

---

## 2. Motion Primitives API

```typescript
import { Pressable, MotionReveal, PresenceSwap, Stagger } from "@filosign/motion";
```

### `<Pressable>`
Wraps clickable elements to add tactile hover (`scale: 1.02`) and click/tap (`scale: 0.97`) scale-down animations.
*   **Anti-nesting Design:** dynamically inspects the child's element type (e.g. `button`, `a`, or a forwardRef component like shadcn `<Button>`) and injects gesture listeners onto that **single** node directly. This avoids focus ring duplication and keeps keyboard accessibility clean.
*   **Supported Presets:** `snappy` (default), `smooth`, or `soft`.
```tsx
<Pressable preset="snappy" whileHover={{ scale: 1.1 }}>
  <Button variant="secondary" onClick={toggle}>
    Toggle
  </Button>
</Pressable>
```

### `<MotionReveal>`
A layout wrapper for mount animations.
*   **Re-navigation Safeguard:** by default, it animates on mount. If you pass `onlyOnce={true}` and assign an `id`, the framework flags that it has been rendered, and subsequent route changes or tab-switches will skip the intro stagger, preventing the app from feeling overly "flashy" during ordinary navigation.
```tsx
<MotionReveal preset="smooth" delay={0.2} onlyOnce id="dashboard-header">
  <h1>Dashboard</h1>
</MotionReveal>
```

### `<PresenceSwap>`
Uses `<AnimatePresence mode="wait">` to cleanly swap text labels or icons when status state changes:
```tsx
<PresenceSwap customKey={buttonState} layout>
  <span>{buttonState === "loading" ? "Processing..." : "Sign Document"}</span>
</PresenceSwap>
```

### `<Stagger>`
Animate lists sequentially.
*   **Automatic Child Wrapping:** Automatically wraps each child in a helper motion component applying `STAGGER_ITEM_VARIANTS` inside `display: contents` to prevent layout reflow issues. You do not need to add custom motion variants to children.
*   **Performance Guard:** if the list length exceeds `maxVisible` (defaults to 8 items), the stagger delay is automatically bypassed to avoid layout thrashing and preserve browser frame rate.
```tsx
<Stagger maxVisible={8}>
  {items.map(item => (
    <div key={item.id}>
      {item.name}
    </div>
  ))}
</Stagger>
```

---

## 3. Best Practices & Guidelines

1.  **Mount vs. Hover Interactions:**
    *   Use Framer Motion + shared spring tokens for **Mount** animations.
    *   Use standard **Tailwind/CSS transitions** for simple hover states (like rotating the logo mark: `group-hover/logo:-rotate-180 duration-150`) to keep hover states instantaneous.
2.  **GPU Acceleration Rule:**
    *   Only animate GPU-accelerated keys (`transform` translations, scaling, rotation, and `opacity`).
    *   **Never animate layout-shifting elements** (like `width`, `height`, `margin`, `padding`, `top`, `left`, `font-size`) as this forces costly reflows. Use layout projection (`layoutId` or `layout`) in Framer Motion instead.
3.  **Respecting Reduced Motion:**
    *   A11y settings are handled globally via `<MotionConfig reducedMotion="user">` at the app root.
    *   If you need custom animation behavior under reduced motion (e.g. disabling infinite repeat on spinners or suppressing container staggers), check preferences via the `useMotionConfig` hook:
    ```typescript
    const { reduced, resolveLoop } = useMotionConfig();
    const transition = resolveLoop("shimmer"); // returns { repeat: 0 } if reduced motion is preferred
    ```
