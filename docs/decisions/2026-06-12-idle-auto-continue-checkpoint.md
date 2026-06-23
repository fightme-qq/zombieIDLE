# Decision: Auto-Continue From Checkpoint

Date: 2026-06-12

## Context

The idle battle loop originally ended in a result modal after each stage. That made failure feel like a hard stop instead of part of the run rhythm.

## Decision

Win and loss now resolve into a short transition, then the game automatically returns to the prep state. On win, the stage advances. On loss, the run falls back to the current checkpoint stage.

## Consequences

The game stays in motion, checkpoint rules are easier to read, and failure becomes a local setback instead of a screen break.
