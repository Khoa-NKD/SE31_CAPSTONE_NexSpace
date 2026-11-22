# React Bits integration

Source: David Haz / React Bits, pinned revision `701a8acc34f718b305d1ff0cc7d4700df0e1f1c9`.
https://github.com/DavidHDev/react-bits/tree/701a8acc34f718b305d1ff0cc7d4700df0e1f1c9

License: MIT + Commons Clause; see LICENSE.md. Components are used as part of NexSpace, not sold as a standalone component library.

Vendored effects: ElectricLogo, BlurText, SpotlightCard, GridMotion, Orb, GridScan, HoldButton, CodeSlots, SwipeToast, Counter, CardSwap and MetaBalls. Native upstream rendering is retained. The existing Motion runtime and the approved OGL dependency are used.

NexSpace adaptations:
- BlurText uses a span root to fit a semantic h1.
- CodeSlots and SwipeToast use the application's shared Hugeicons adapters.
- CardSwap has no default demonstration items or remote sample-document images.
- Decorative wrappers defer rendering until visible, disable effects for reduced motion and preserve static content without WebGL.
- Document CardSwap is manual, not autoplay; local object URLs are released on change/unmount.
- Sonner remains the application's notification engine. SwipeToast's visual/gesture pattern is adapted in ui/sonner.tsx and toast-motion.css to preserve existing promise, queue, callback and timer behavior. Its standalone reference is not used to replace Sonner's lifecycle.
