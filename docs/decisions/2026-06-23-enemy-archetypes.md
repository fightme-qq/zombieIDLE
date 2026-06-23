# Decision: Enemy combat archetypes

Date: 2026-06-23

## Context

Enemy variants need to change wave tactics instead of acting as cosmetic skins with nearly identical behavior.

## Decision

Every enemy definition has a stable combat role. Existing enemies cover grunt, bruiser, skirmisher, and tank roles. Five generated enemies add runner, berserker, juggernaut, swarm, and elite roles. Their health, speed, damage, attack cadence, reward, size, and stage availability are configured as data.

The first ten-stage block introduces the roster gradually: Runner and Crawler on stage 2, Berserker on stage 4, Armored on stage 5, and Alpha Mutant on stage 8. Later blocks reuse the same tactical wave patterns with reinforcements.

## Consequences

Wave composition is deterministic and testable. New enemies can be balanced through content data without adding scene branches. All nine enemies continue to share the battle movement and animation system.
