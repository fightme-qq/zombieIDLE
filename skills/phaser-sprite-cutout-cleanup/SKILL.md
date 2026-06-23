---
name: phaser-sprite-cutout-cleanup
description: Use when cleaning generated sprite PNGs or weapon/item art: removing backdrop spill, preserving inner holes and cutouts, cropping to silhouette, adding padding, and verifying the asset at game scale.
---

# Phaser Sprite Cutout Cleanup

## Workflow

1. Inspect the source PNG on both light and dark backgrounds before editing.
2. Find the real silhouette first, then separate backdrop spill from intentional empty spaces.
3. Preserve holes and cutouts that define the shape: trigger guards, barrel gaps, scopes, sight windows, handle openings.
4. Remove only pixels that belong to the background, not pixels that help the weapon read.
5. Crop tightly to the silhouette and add small padding for in-game placement.
6. Keep related variants aligned to the same facing, origin, and scale.
7. Replace the file under `public/assets/`, update manifest cache-busters if needed, and record the asset in `public/assets/credits.md`.
8. Verify the edited sprite inside its actual UI or gameplay container, not only on a checkerboard.

## Rules

- Do not flatten alpha unless the target is a deliberate opaque asset.
- Do not erase internal gaps just because they are bright or empty.
- Do not trust one flood-fill pass without checking disconnected regions.
- Do not keep large transparent margins that make icons look tiny.
- Do not distort the silhouette to hide cleanup mistakes.
- Regenerate the source if the cutout cannot be cleaned without damaging the read.

