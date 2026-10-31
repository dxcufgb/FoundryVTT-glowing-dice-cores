# Dxcufgb's Glowing dice cores

[![Foundry v13](https://img.shields.io/github/v/release/dxcufgb/FoundryVTT-glowing-dice-cores?label=Foundry%20v13&logo=foundryvirtualtabletop&color=ff6400)](https://github.com/dxcufgb/FoundryVTT-glowing-dice-cores/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dxcufgb/FoundryVTT-glowing-dice-cores/module.zip?label=downloads&color=blue)](https://github.com/dxcufgb/FoundryVTT-glowing-dice-cores/releases)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/dxcufgb)\
[![CI](https://img.shields.io/github/actions/workflow/status/dxcufgb/FoundryVTT-glowing-dice-cores/ci.yml?branch=main&label=CI)](https://github.com/dxcufgb/FoundryVTT-glowing-dice-cores/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/dxcufgb/FoundryVTT-glowing-dice-cores)](LICENSE)
[![Requires Dice So Nice](https://img.shields.io/badge/requires-Dice%20So%20Nice%205-8a5cf6)](https://foundryvtt.com/packages/dice-so-nice)

<a href="https://dxcufgb.github.io/FVTT-dev-showcase/"><img src="https://dxcufgb.github.io/FVTT-dev-showcase/assets/img/workshop-badge.png" alt="Dxcufgb's Workshop: every Foundry VTT project, video and changelog in one place" width="650"></a>

Gives [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice) dice a glowing core of light inside the die. The glow is a 3D volume inside the glass, so it shifts and turns as the die tumbles, while the numbers stay readable on top. Pick one of 16 glows per die type, tune its colours, strength and pulse, and everyone at the table sees it on your rolls.

**Foundry VTT:** v13 · **System:** any · **Requires:** Dice So Nice 5

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this link into **Manifest URL** at the bottom, and click **Install**:

```
https://github.com/dxcufgb/FoundryVTT-glowing-dice-cores/releases/latest/download/module.json
```

## How to use

1. Open **Game Settings → Configure Settings → Dice So Nice → Dice So Nice Settings**, tab **Appearance**.
2. For **Global** or one die type, set the dice system to **Glowing cores**.
3. Click the system options button next to it and pick a glow, its colours, strength and pulse.
4. Save and roll.

A dark die colour with the glass material shows the glow best. The options are stored with your Dice So Nice appearance, so each die type can have its own glow and other players see yours.

## Glows

| Glow | Look |
| --- | --- |
| Ember Heart | A banked fire that churns upward |
| Arcane Vortex | A spiral galaxy turning on its axis |
| Pocket Nebula | Drifting gas clouds with twinkling stars |
| Storm Cell | Forked lightning that flashes on its own rhythm |
| Heartstone | A single core that beats like a heart |
| Eclipse | A black core inside a burning corona |
| Frost Lattice | Crystal seams that glint like ice |
| Lava Lamp | Slow molten blobs that rise and merge |
| Plasma Globe | Crackling tendrils reaching out from a bright core |
| Aurora | Curtains of northern lights drifting through the die |
| Will-o'-Wisps | Three little lights circling with fading tails |
| Arcane Rings | Three rune-marked rings turning like a gyroscope |
| Bubbling Potion | A glowing liquid that sloshes, with bubbles rising |
| Twin Helix | Two intertwined strands joined by glowing rungs |
| Radiant Sun | A white-hot core throwing rays of light |
| Fairy Lights | Tiny motes of light drifting and twinkling |

## System options

Set per die type in Dice So Nice's system options dialog:

| Option | What it does |
| --- | --- |
| Glow | One of the 16 glows above |
| Colours | The glow's own colours, or your own core and glow colour |
| Core colour, Glow colour | Used when Colours is set to your own |
| Intensity (%) | How bright the glow is (0–300) |
| Core size (%) | How far the glow reaches toward the faces (30–120) |
| Animation speed (%) | 0 freezes the glow (0–300) |
| Pulse | Steady, Breathe, Heartbeat or Flicker |
| Rim light (%) | Glow colour along the die's edges (0–200) |
| Darken the die body (%) | Darkens the die around the numbers so the glow shows (0–100) |
| Bloom (%) | How much the glow blooms, only with Dice So Nice's realistic lighting (0–200) |

## Settings

| Setting | Scope | What it does |
| --- | --- | --- |
| Glow quality | Client | Low, Medium or High samples through each die; lower is faster on weak graphics cards. Takes effect after a reload. |

## API / integration

`game.modules.get("dxcufgbs-glowing-dice-cores").api`

| Member | What it is |
| --- | --- |
| `SYSTEM_ID` | The Dice So Nice system id, `"dxcufgbs-glowing-cores"` |
| `EFFECTS` | The glow ids the `effect` option accepts |
| `PULSES` | The pulse ids the `pulse` option accepts |
| `DEFAULTS` | The default system options |

To give a user's dice a glow from a macro or another module, set their Dice So Nice appearance for a die type to `system: "dxcufgbs-glowing-cores"` with `systemSettings` holding any of the option ids above (`effect`, `colours`, `core`, `glow`, `intensity`, `coreSize`, `speed`, `pulse`, `rim`, `body`, `bloom`). Missing or invalid values fall back to the defaults.

## Compatibility

- Uses Dice So Nice 5's dice system API (`DiceSystem` with its process-material and shader-compile callbacks). Works with and without realistic lighting, and with any Dice So Nice colourset, texture and material.
- Dice that use a custom 3D model are shown without a glow.
- Works alongside Dxcufgb's dice trails.

## License

MIT
