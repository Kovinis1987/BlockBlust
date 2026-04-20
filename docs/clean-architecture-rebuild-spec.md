# Blast Puzzle Rebuild Spec

## Purpose

This document describes the current game behavior of the `Blust` project and converts it into a detailed rebuild specification for implementing the same game from scratch with clean architecture.

The spec is based on the current runtime code, level data, and unit tests in this repository. It is intended for:

- full rewrite on `Cocos Creator 2.4.x + TypeScript`
- or full rewrite on `Unity 6.3`
- with strict separation of domain logic, application orchestration, presentation, and infrastructure

The goal is to preserve gameplay behavior, progression rules, and content format, while improving architecture and maintainability.

## Product Summary

Game genre: `Blast Puzzle`

Core loop:

1. Player clicks a group of adjacent same-color tiles.
2. If the group size is at least 3, the group is destroyed.
3. Player gains score for destroyed normal color tiles.
4. Remaining tiles fall down.
5. Empty spaces are filled with new random tiles.
6. The game checks:
   - win by reaching target score
   - lose by running out of moves
   - lack of available moves and possible auto-shuffle

Additional mechanics:

- obstacle tiles
- super tiles created from large groups
- super tile chain reactions
- bomb booster
- teleport booster
- limited shuffle attempts
- continue flow with extra moves
- per-level starter super tiles
- per-level bonus boosters
- level editor

## Reference Behavior

### Tile Types

Use the following semantic tile types:

- `0 = EMPTY` in runtime model
- `1 = OBSTACLE`
- `2 = RED`
- `3 = GREEN`
- `4 = BLUE`
- `5 = YELLOW`
- `6 = ROCKET_VERTICAL`
- `7 = ROCKET_HORIZONTAL`
- `8 = BOMB`
- `9 = MEGA`

Important nuance:

- In `levels.json`, value `0` does not mean "pre-placed empty runtime cell".
- In level layout input, value `0` means "spawn a random color tile here".
- Runtime empty cells appear only after destruction or movement resolution.

### Colors

There are exactly 4 base colors:

- red
- green
- blue
- yellow

### Board Coordinates

Use logical coordinates `(row, col)`.

- `row = 0` is the bottom row in runtime logic
- `row` increases upward
- `col = 0` is left

Level JSON is stored top-to-bottom, but runtime model uses bottom-to-top indexing. While loading from JSON:

- source index = `(rows - 1 - row) * cols + col`

This mapping must be preserved if the new implementation keeps the same level format.

## Core Gameplay Rules

### Group Detection

A valid group is:

- orthogonally connected
- same color
- size `>= 3`

Diagonal adjacency is not allowed.

Obstacle and empty tiles do not form groups.

### Click on Normal Tile

If clicked group size is less than 3:

- no move is spent
- clicked tile may play a shake feedback

If clicked group size is at least 3:

- spend 1 move
- clear all tiles in the group
- award score for all destroyed normal color tiles
- if group qualifies for a super tile, spawn exactly one super tile at the clicked cell after group destruction
- resolve gravity
- fill empty cells
- check win/lose/available moves

### Score

Default score:

- `10` points per destroyed normal color tile

Score is awarded only for normal color tiles.

Obstacle tiles do not give score.

Booster and super tile explosions award score only for normal color tiles destroyed as part of the effect.

## Super Tile Creation Rules

Config defaults:

- `rocketMin = 5`
- `bombMin = 7`
- `megaMin = 10`

### Group Size to Super Tile

- size `< 5`: no super tile
- size `5..6`: rocket
- size `7..9`: bomb
- size `>= 10`: mega

### Rocket Orientation Rule

Current implementation uses legacy enum names:

- `ROCKET_VERTICAL` actually blasts a whole row
- `ROCKET_HORIZONTAL` actually blasts a whole column

Current selection rule:

- if group height is greater than width, create `ROCKET_HORIZONTAL`
- otherwise create `ROCKET_VERTICAL`

For the rebuild:

- keep gameplay behavior identical
- but document names clearly in code to avoid future confusion

## Super Tile Activation Rules

### Single Rocket

- `ROCKET_VERTICAL`: destroys the entire row
- `ROCKET_HORIZONTAL`: destroys the entire column

### Single Bomb

Bomb blast affects a square centered on the epicenter.

Default config:

- `bombRadius = 3`

Affected area:

- all cells from `(r - radius .. r + radius)`
- all cells from `(c - radius .. c + radius)`
- clipped to board bounds

### Single Mega

Mega destroys all cells on the board.

## Super Tile Combos

If an activated super tile has an adjacent orthogonal super tile, combo logic is used.

Adjacency is checked in 4 directions only.

### Rocket + Rocket

Effect:

- destroy row + column crossing at epicenter
- play cross effect

### Bomb-family + Bomb-family

Bomb-family means:

- `BOMB`
- `MEGA`

Effect:

- square explosion with radius `bombRadius + 1`
- pre-explosion bomb effect
- main mega effect

This means combinations like:

- bomb + bomb
- bomb + mega
- mega + mega

all resolve through the same "bomb-family + bomb-family" rule.

### Rocket + Bomb-family

Effect:

- line blast from rocket
- plus square blast from bomb radius
- affected cells are union without duplicates
- pre-explosion rocket effect
- final bomb effect

### Chain Reactions

If an explosion reaches another super tile:

- that super tile is consumed
- it activates its own plan
- chain reaction continues recursively

Explosion waves finish only after all pending chained explosions are completed.

## Bomb Booster

This is a player inventory booster, not a board super tile.

### Default Inventory

- `bombBoosters = 5`

### Activation Flow

When bomb mode is active and player clicks a target cell:

- target must contain a renderable tile
- target must not be an obstacle
- affected area is a square with radius = `bombRadius`
- all non-obstacle renderable tiles in that square are affected

Behavior:

- spend 1 move only if booster use succeeds
- spend 1 bomb booster after completion
- leave bomb mode and return to playing state
- trigger regular gravity/fill/finalization after effect completes

Scoring:

- only normal color tiles in the affected area give score

Chain behavior:

- if affected area contains super tiles, they must activate

## Teleport Booster

This is a player inventory booster, not a board super tile.

### Default Inventory

- `teleportBoosters = 5`

### Activation Flow

When teleport mode is active:

1. First click selects a non-obstacle tile.
2. Second click on the same tile cancels selection.
3. Second click on another non-obstacle tile swaps the two tiles.

Behavior:

- does not spend a regular move
- spends 1 teleport booster on successful swap completion
- returns to playing state after swap
- after swap, available moves are checked

Current implementation does not immediately resolve blasts after swap. It only finishes booster flow and checks move availability. Rebuild should preserve this unless product requirements explicitly change.

## Obstacles

Obstacle rules:

- never part of groups
- not cleared by `clearCells`
- can block falling
- can create side-fall behavior around themselves

## Gravity and Fill Rules

### Falling

The board resolves falling until no movement remains.

Current logic:

1. For each empty cell:
   - try to pull the closest movable tile vertically from above
   - stop vertical search if an obstacle is encountered
2. If no vertical source found:
   - if the cell is directly below an obstacle, try pulling from left or right on the obstacle row

Movable tiles:

- color tiles
- super tiles

Non-movable:

- obstacle
- empty

### Fill

After all falling is done:

- every empty cell is filled with a random color tile

Random fill colors:

- red
- green
- blue
- yellow

## Available Move Rule

A board is considered to have available moves if at least one of the following is true:

- there is any super tile on the board
- there exists a color group with size `>= minMatch`

Default:

- `minMatch = 3`

## Shuffle Rule

Default shuffle attempts:

- `3`

When physics finalization completes:

1. Check win.
2. Check lose.
3. If target score already reached, stop.
4. If there are available moves, do nothing.
5. If no moves:
   - if shuffle attempts remain, consume 1 attempt and shuffle colors only
   - otherwise lose

Shuffle behavior:

- only color tiles are shuffled
- obstacles and super tiles remain where they are

## Win/Lose Rules

### Win

Win when:

- score >= targetScore
- and state is still `PLAYING`

### Lose

Lose when:

- moves == 0
- score < targetScore
- and state is still `PLAYING`

### Continue

Continue button gives:

- `5` extra moves by default

After continue:

- game returns to `PLAYING`
- if no moves are available, board auto-shuffles if possible

## Game States

Required states:

- `PLAYING`
- `WIN`
- `LOST`
- `BOOSTER_TELEPORT`
- `BOOSTER_BOMB`

Only one state may be active at a time.

## Level Data Format

Each level entry must contain:

```json
{
  "rows": 9,
  "cols": 9,
  "moves": 25,
  "targetScore": 1500,
  "tiles": [],
  "bonusBombBoosters": 0,
  "bonusTeleportBoosters": 0,
  "startRowRocketTiles": 0,
  "startColumnRocketTiles": 0,
  "startBombTiles": 0,
  "startMegaTiles": 0
}
```

### Level Field Semantics

- `rows`, `cols`: board size
- `moves`: initial move count for the level
- `targetScore`: score required for win
- `tiles`: flattened top-to-bottom board layout
- `bonusBombBoosters`: inventory added on level load
- `bonusTeleportBoosters`: inventory added on level load
- `startRowRocketTiles`: random row-blast rockets placed on color cells at start
- `startColumnRocketTiles`: random column-blast rockets placed on color cells at start
- `startBombTiles`: random bombs placed on color cells at start
- `startMegaTiles`: random megas placed on color cells at start

### Start Super Tile Placement

On level load:

- build base board from `tiles`
- collect all color cells
- shuffle candidates
- replace first N candidates with requested start super tiles

This replacement happens after initial board creation.

## Default Level Fallback

If level loading fails or level is missing:

```json
{
  "rows": 9,
  "cols": 9,
  "moves": 25,
  "targetScore": 1500,
  "tiles": null,
  "bonusBombBoosters": 0,
  "bonusTeleportBoosters": 0,
  "startRowRocketTiles": 0,
  "startColumnRocketTiles": 0,
  "startBombTiles": 0,
  "startMegaTiles": 0
}
```

Historical default bonus exceptions used by current implementation if level data is missing:

- level `2`: `+1 bomb`, `+1 teleport`
- level `5`: `+1 bomb`, `+2 teleport`
- level `8`: `+2 bomb`, `+2 teleport`

For a clean rewrite, prefer explicit data in `levels.json` over hardcoded fallback exceptions.

## UI Requirements

Required HUD elements:

- current score
- target score
- moves left
- bomb booster count
- teleport booster count
- optional shuffle attempts display

Required overlays:

- win window
- lose window

Lose window actions:

- continue
- restart

Win window actions:

- next level

### Visual Feedback

Required feedback:

- tile spawn animation
- tile destroy animation
- tile movement animation
- score popup
- camera shake on explosions
- selection emphasis for teleport first pick
- click sound
- booster sound
- win/lose sounds

Use placeholders if production art is unavailable.

## Level Editor Requirements

Recreate an in-editor level tool with the following capabilities:

- open editor window from engine editor menu
- choose level id
- edit rows and cols
- edit moves and target score
- edit bonus bomb boosters
- edit bonus teleport boosters
- edit starting row rockets
- edit starting column rockets
- edit starting bombs
- edit starting megas
- edit tile grid by clicking cells
- save to `levels.json`

Grid edit rules:

- left click cycles forward through tile values
- right click cycles backward through tile values

## Architecture Requirements

### Main Goal

Rebuild the game with strict clean architecture.

### Mandatory Layer Split

#### Domain

Pure game rules, no engine dependencies:

- tile types
- group search
- move availability detection
- falling rules
- fill rules
- score rules
- super tile generation rules
- super tile combo planning
- win/lose conditions
- state machine rules
- level data contracts

Domain layer must not reference:

- `cc.*`
- `UnityEngine.*`
- scene objects
- audio playback
- animation
- pools
- prefabs

#### Application

Use cases and orchestration:

- handle tile click
- handle bomb booster click
- handle teleport flow
- resolve turn
- load/reload level
- continue/restart/next level
- finalize physics
- check progression

Application depends on domain abstractions and ports, not concrete engine objects.

#### Presentation

Engine-facing layer:

- board view
- HUD
- windows
- button widgets
- scene controllers / presenters / mediators
- animation controllers

Presentation should react to view models or application outputs, not contain domain rules.

#### Infrastructure

- resource loading
- audio playback
- pooling
- persistence
- editor tooling

### Ports / Interfaces

At minimum define ports for:

- board visual operations
- score feedback
- audio feedback
- level loading
- randomness provider
- time / scheduling if asynchronous effects are needed

### Composition Root

One composition root per game scene:

- build services
- wire ports to adapters
- inject dependencies explicitly

No global container lookups from random components.
No service locator.

## Suggested Domain Modules

- `BoardModel`
- `GroupFinder`
- `GravityResolver`
- `RefillGenerator`
- `MoveAvailabilityChecker`
- `SuperTileFactory`
- `SuperTilePlanBuilder`
- `TurnResolver`
- `BombBoosterUseCase`
- `TeleportBoosterUseCase`
- `ProgressionService`
- `SessionState`
- `GameStateMachine`
- `LevelDefinition`

## Suggested Application Use Cases

- `LoadCurrentLevelUseCase`
- `ReloadCurrentLevelUseCase`
- `HandleBoardClickUseCase`
- `ActivateBoardSuperTileUseCase`
- `UseBombBoosterUseCase`
- `UseTeleportBoosterUseCase`
- `ContinueGameUseCase`
- `RestartLevelUseCase`
- `GoToNextLevelUseCase`

## Testing Requirements

Automated tests must cover:

- group detection
- clearing rules
- falling and side-fall around obstacles
- fill generation
- super tile creation thresholds
- rocket orientation behavior
- single super tile plans
- combo super tile plans
- duplicate removal in combo plans
- chain reactions
- move consumption
- score accumulation
- bomb booster behavior
- teleport booster behavior
- shuffle logic
- win/lose logic
- level loading fallback
- per-level bonus booster granting

Keep tests engine-free whenever possible.

## Acceptance Criteria

The rebuild is accepted only if all of the following are true:

1. Gameplay behavior matches the current project.
2. No domain or application service depends directly on engine scene objects.
3. No global service locator or hidden resolve pattern exists.
4. Super tile and booster logic is centralized and easy to extend.
5. UI and animation are replaceable without rewriting domain rules.
6. Level data remains editable through a custom tool.
7. Automated tests cover all gameplay-critical rules.

## Delivery Plan

Preferred implementation stages:

1. Define domain contracts and enums.
2. Implement board model and deterministic tests.
3. Implement progression and session rules.
4. Implement super tile planning and chain reactions.
5. Implement level loading and level schema.
6. Build application use cases around ports.
7. Build presentation adapters.
8. Add level editor.
9. Add effects, audio, animation, pooling.
10. Add final integration tests and polish.

## Rebuild Prompt Template

Use the following prompt as a starting point for a coding agent.

### Universal Prompt

```text
Build a complete blast puzzle game from scratch with clean architecture, based on the following specification.

Engine target: [Cocos Creator 2.4.x + TypeScript] or [Unity 6.3].

Requirements:

- Reproduce the gameplay behavior of the provided reference spec exactly.
- Use strict separation of Domain, Application, Presentation, and Infrastructure.
- Do not use a Service Locator or hidden global container resolution.
- All gameplay rules must be engine-agnostic and unit-testable.
- Super tile logic and booster logic must be centralized, not scattered.
- UI and visual effects must be replaceable without changing gameplay rules.
- Implement level loading from a JSON schema matching the reference format.
- Implement a level editor tool for content authoring.
- Include automated tests for all gameplay-critical mechanics.

Gameplay rules to preserve:

- 4 base colors: red, green, blue, yellow
- obstacles
- group blast on 3+ adjacent same-color tiles
- score 10 per destroyed normal tile
- moves-based loss
- target-score-based win
- auto-shuffle when no moves remain and shuffles are available
- teleport booster inventory
- bomb booster inventory
- super tiles created from large groups:
  - 5+ rocket
  - 7+ bomb
  - 10+ mega
- single and combo super tile behavior
- chain reactions
- starter super tiles and level bonus boosters

Architectural constraints:

- Domain layer must not depend on engine APIs.
- Application layer may depend only on domain contracts and ports.
- Presentation layer handles scene objects, widgets, animation, and rendering.
- Infrastructure handles resources, pooling, audio, persistence, and editor tooling.
- One explicit composition root wires the scene.

Delivery requirements:

- Provide project structure
- Implement core gameplay
- Implement UI
- Implement level loading
- Implement level editor
- Implement tests
- Use placeholders where art/sound assets are missing
- Document setup and run instructions

Do not generate a monolithic GameController with all logic inside it.
```

### Cocos Creator 2.4 Prompt

```text
Rebuild the game in Cocos Creator 2.4.x using TypeScript.

Additional constraints:

- Use Cocos components only in presentation and infrastructure layers.
- Keep domain and application classes as plain TypeScript classes.
- Use explicit constructor injection from a scene composition root.
- Use Cocos resources and prefabs only via adapters.
- Provide a custom Cocos editor extension for level editing.
- Keep runtime code compatible with Cocos Creator 2.4 APIs.
```

### Unity 6.3 Prompt

```text
Rebuild the game in Unity 6.3 using C#.

Additional constraints:

- Domain and application layers must be plain C# classes with no MonoBehaviour dependency.
- MonoBehaviours should exist only in presentation and infrastructure.
- Use ScriptableObjects only for configuration and content, not as service locators.
- Use an explicit composition root in the bootstrap scene.
- Implement the level editor either as a custom EditorWindow or inspector-driven tool.
- Prefer interfaces and plain DTOs for data exchange between layers.
```

## Notes for the Rebuild Team

- Preserve behavior first, improve structure second.
- Do not "simplify" away current mechanics such as combo rules, shuffle limits, or start booster placement.
- If you want to change any gameplay rule, treat it as a product decision and document it explicitly.

