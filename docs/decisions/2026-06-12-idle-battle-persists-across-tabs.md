# Decision: Battle Persists Across Tabs

Date: 2026-06-12

## Context

The idle shell now includes bottom navigation for fight management, weapons, upgrades, and shop. The battle loop should not stop when the player opens another tab.

## Decision

The battle system keeps updating while the scene renders other tabs. Switching back to `Fight` redraws the live battle view, and `Fight` stays centered in the bottom navigation.

## Consequences

Browsing the loadout and upgrade tabs no longer pauses or resets combat, so the run feels continuous and the fight remains the core of the session.
