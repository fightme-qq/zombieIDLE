---
name: phaser-ai-art-asset-brief
description: Use when planning game art assets for a Phaser project without generating the art directly: sprite lists, sizes, animation frames, style guide, palette, naming convention, export format, atlas plan, placeholder fallback, UI icons, tilesets, VFX sprites, background layers, and asset handoff briefs for image generators or artists.
---

# Phaser AI Art Asset Brief

## Workflow

1. Read `references/asset-brief-template.md`.
2. List only the assets needed for the current playable slice first.
3. Define sizes, frame counts, naming, palette, and export format.
4. Separate runtime sprites, UI icons, backgrounds, VFX, tiles, and promotional art.
5. Include placeholder fallback names so coding can continue without final art.
6. Record asset ownership and licensing in `public/assets/credits.md` when assets are added.
7. For top-down battlefield backgrounds, prefer `create_topdown_tileset` for terrain, `create_map_object` for props/debris, and `create_character` only for animated enemies or actors. Treat a single full-scene background image as a last resort, not the default.

## Rules

- Do not generate assets from copyrighted game art or brand references.
- Keep gameplay readability above decorative detail.
- Prefer small consistent spritesheets/atlases over many loose files when content grows.
- Keep briefs specific enough for an artist or image tool to produce usable files.
- For top-down game backgrounds, describe the layer plan explicitly: terrain tiles, road/path tiles, props, ambient VFX, and what should stay readable during combat.
- For image-generator sprite sheets that will be cut automatically, request a flat `#FF00FF` chroma background with no transparency, gradient, texture, touching shadow/glow, or edge spill. Use `#00FF00` when sprites contain purple elements. The chroma color must not appear inside sprites.
