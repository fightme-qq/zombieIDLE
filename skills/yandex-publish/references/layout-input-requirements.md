# Layout And Input Requirements

Mobile:

- Fullscreen gameplay.
- Gesture controls; no keyboard-only actions.
- No long-tap selection.
- No browser scrollbars or swipe-to-refresh.
- Elements must not distort or overlap on resize.

Desktop:

- Keyboard/mouse control by default.
- Active game field should stretch appropriately.
- Avoid browser/OS hotkey conflicts.
- No context menu or text selection during game interaction.

CSS requirements:

- `overflow: hidden`.
- `overscroll-behavior: none`.
- `touch-action: none` for the game surface.
- `user-select: none`.
- Avoid `100vh` containers when browser chrome can cause overflow.
