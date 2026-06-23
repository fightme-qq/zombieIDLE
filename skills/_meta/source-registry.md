# Source Registry For Agents

Use these sources when a task needs current Phaser or Agent Skills knowledge.

## Primary Sources

- Phaser official skills: https://github.com/phaserjs/phaser/tree/master/skills
- Phaser docs: https://docs.phaser.io/
- Phaser examples: https://github.com/phaserjs/examples
- Phaser Vite TypeScript template: https://github.com/phaserjs/template-vite-ts
- Agent Skills spec: https://agentskills.io/specification.md
- Anthropic skill creator: https://github.com/anthropics/skills/tree/main/skills/skill-creator
- Taste Skill visual quality references: https://github.com/Leonxlnx/taste-skill
- Idle Game Maker Handbook: https://orteil.dashnet.org/igm/help.html
- Idle Game Maker Bunny Clicker source: https://orteil.dashnet.org/igm/games/bunnyclicker.txt
- Yandex Games SDK docs: https://yandex.com/dev/games/doc/en/sdk/sdk-about
- Yandex Games requirements: https://yandex.ru/dev/games/doc/ru/concepts/requirements

## Update Policy

- Use official Phaser sources first for Phaser APIs.
- Use project-local skills first for repository workflow.
- When official sources disagree with local skills, update the local skill and explain why.
- Keep this project focused on Phaser mobile/desktop games.
- Do not introduce unrelated framework guidance into core skills.
- Treat generic frontend taste sources as inspiration only; adapt them to Phaser canvas, HUD, menus, and game screens.

## Version Notes

This generated project starts with Phaser 3 because the Phaser 3 ecosystem has broad examples and plugin support. If upgrading to Phaser 4, use the official Phaser migration skills/docs before changing APIs.

## Sync History

- 2026-06-02: synced the local archive with `fightme-qq/PhaserGameCreator` commit `5b816905802aca2b7fc78a89bd86e8835c30377a`.
- 2026-06-11: synced idle skills from `G:\Work Installs\my-phaser-game (3)\my-phaser-game`.
