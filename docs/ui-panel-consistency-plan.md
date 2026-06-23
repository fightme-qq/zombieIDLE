# UI Panel Consistency Plan

Date: 2026-06-18

## Goal

Make the left and right side panels consistent across all prep screens:

- same panel width and height on every tab;
- same x/y anchors, header treatment, dividers, panel opacity, and padding;
- different content per tab, but the shell stays stable;
- the Fight tab also gets the same left panel;
- the current bottom Fight stat strip is removed.

## Current Problems

- Equip uses a large left grid panel and a narrower right stock panel.
- Upgrades uses left and right panels, but their content density and alignment differ from Equip.
- Fight uses no side information panel and puts combat summary in a bottom strip.
- Right and left panel widths are visually inconsistent, so switching tabs feels jumpy.
- Repeated title/header styling is manually drawn in several places instead of coming from one panel shell.
- Some content is pinned to panel-specific magic numbers, which makes later alignment changes expensive.

## Fixed Panel Shell

Create one shared side-panel layout contract:

- Left panel: `x = ROAD_BOUNDS.left - gap - panelWidth / 2`
- Right panel: `x = ROAD_BOUNDS.right + gap + panelWidth / 2`
- Both panels use the same:
  - `panelWidth`
  - `panelHeight`
  - `panelY`
  - top divider
  - bottom divider
  - title/header inset
  - inner content bounds
- Use one helper, for example:
  - `getSidePanel(side: 'left' | 'right'): PanelBounds`
  - `drawSidePanel(panel, title?)`
  - `getPanelContentBounds(panel)`

Recommended first pass:

- `panelWidth`: use the current larger side width as the baseline, then reduce only if it collides with the road.
- `panelHeight`: same for both sides, current left panel height is a good baseline.
- `gap`: keep one shared gap from road bounds.

## Tab Layout

### Fight

Left panel content:

- mounted weapons count;
- total DPS;
- active cells;
- current stage;
- kills progress;
- bunker HP;
- maybe small list of equipped weapons or top weapon summary later.

Right panel content:

- optional: next wave/stage preview, rewards, or empty state.
- For first implementation, right panel may be absent on Fight if it makes the screen too busy, but the left panel must exist.

Remove:

- bottom stat strip with `Автобой идет / Оружие / DPS`.

Keep:

- bottom tab bar;
- top HUD;
- base HP bar;
- stage/kills HUD.

### Equipment

Left panel:

- equipment grid;
- compact summary at the top inside the panel, not floating outside;
- grid remains the main content.

Right panel:

- `Склад оружия`;
- weapon cards;
- drag hint at bottom;
- card price remains `number + cap sprite`.

### Upgrades

Left panel:

- arsenal category tabs;
- weapon list;
- base upgrades can move into a `База` tab later, but this pass focuses on panel consistency.

Right panel:

- selected weapon details;
- stats;
- unlock button or upgrade rows;
- upgrade price chips use `number + cap sprite`.

### Shop

Left panel:

- future shop categories or inventory filters.
- For now, show a clean empty/coming-soon state.

Right panel:

- featured stock / purchases / coming-soon state.

## Implementation Steps

1. Add shared constants for side-panel dimensions and road gap.
2. Replace `getLeftPanel`, `getRightPanel`, and `getSupplyPanel` with one side-panel helper.
3. Update `drawOverlayPanels` to draw shells consistently per tab.
4. Move Fight summary from `drawFightTab` bottom strip into the left panel.
5. Remove the bottom Fight stat panel.
6. Re-anchor Equipment grid and stock cards to the new shared content bounds.
7. Re-anchor Upgrades arsenal list and weapon detail panel to the same content bounds.
8. Re-anchor Shop placeholder content to the shared side panels.
9. Verify desktop and mobile smoke tests.
10. Take screenshots for Fight, Equipment, Upgrades, Shop with debug road bounds on and off.

## Non-Goals

- Do not change weapon balance.
- Do not change save data.
- Do not change enemy spawning.
- Do not add new gameplay systems.
- Do not redesign the bottom tab bar in this pass.

## Acceptance Checklist

- Switching tabs does not move panel shells.
- Left and right panels have the same width on all tabs.
- Fight tab has a left stats panel.
- Fight bottom stat strip is gone.
- Equipment stock panel no longer has a different shell width.
- Upgrades weapon detail panel aligns with the same right panel shell.
- Text and buttons do not clip at desktop resolution.
- Smoke tests pass.
