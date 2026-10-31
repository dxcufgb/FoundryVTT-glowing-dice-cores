# Dxcufgb's Glowing dice cores

FoundryVTT v13 module (id `dxcufgbs-glowing-dice-cores`, the install folder must have the same name) that requires
Dice So Nice 5. It adds a Dice So Nice dice system, **Glowing cores** (`SYSTEM_ID` `dxcufgbs-glowing-cores`), whose
d4–d20 and d100 get a ray-marched light volume inside them. No build step, no npm dependencies, no three.js import.

## Layout
- `scripts/main.js` – entry point: client setting `quality`, dynamic import of `modules/dice-so-nice/api.js`
  (`DiceSystem`), `diceSoNiceReady` registration (system, its System options, presets copied from the standard
  dice), `normalize()` (clamps System options, which come from other players' appearance data),
  `processMaterial` (per Dice So Nice material: options → glow uniforms; `material.onBeforeRender` sets the time
  and the inner radius from the geometry's bounding sphere), `beforeShaderCompile` (calls `injectGlow`), `api`.
- `scripts/glow-shader.js` – GLSL: `gcField` (one branch per effect; branch n is `EFFECTS[n]`), `gcVolume` (the
  march), the patch after `#include <map_fragment>` (darkens the body, keeps the numbers via `gcLabel`, which
  compares the face texture with the colourset's background and label colours), the patch after
  `#include <emissivemap_fragment>` (adds glow and rim light to `totalEmissiveRadiance`), and the bloom-pass
  addition when Dice So Nice injected `globalBloom`. `injectGlow` leaves a shader alone if a marker is missing.
- `scripts/constants.js` – `MODULE_ID`, `SYSTEM_ID`, `DIE_TYPES`, `EFFECTS`, `PALETTES`, `PULSES`, `DEFAULTS`,
  `INNER_RATIO`, `QUALITY_STEPS`.
- `tests/effects.test.mjs` – node:test consistency checks (effects, palettes, lang, shader branches, injectGlow),
  run by CI through `.github/foundry-module.json` (`lint`). Not shipped.
- `.github/workflows/ci.yml` / `release.yml` – thin callers of `dxcufgb/foundry-module-ci`; identical in every
  module, do not edit here.

## Conventions
- `MODULE_ID` must equal `id` in `module.json`; every visible setting needs a Name and Hint in `lang/en.json`.
  UI strings are under `DXGC.*`.
- A new **glow**: its id appended to `EFFECTS` (never inserted: the order is the shader's pattern number and is
  stored in users' settings), a `PALETTES` entry, a `DXGC.Effect.<id>` string, a branch in `gcField` before the
  final default (move the old default into an `if(gcPattern < n.5)` branch), a README row and the glow count in the
  README, `module.json` description and CHANGELOG. `node --test tests/*.test.mjs` checks most of this.
- Glows work in `q`, the position in units of the die's inner radius (`r = length(q)`, the core edge is `gcCore`),
  and return emission (rgb) and absorption (a). Features thinner than about 0.06 in `q` flicker at Low quality.
- Update `README.md` when glows, options, settings or the API change.

## Review focus
- **Never throw from a Dice So Nice callback** (`processMaterial`, `beforeShaderCompile`, `onBeforeRender`): log
  and leave the die as Dice So Nice made it.
- **Untrusted options**: System options come from other players' appearance flags; everything goes through
  `normalize()` before it reaches a uniform.
- **Program cache**: the injected GLSL may only vary by uniforms and `GC_STEPS`, so Dice So Nice's
  `customProgramCacheKey` (a hash of the shader source) stays shared across materials.
- **Per-frame cost**: `onBeforeRender` runs for every die every frame; no allocations there. The march runs per
  pixel, so a glow's branch should stay cheap (the Frost Lattice cell search is the most expensive one).
- **Stored ids**: `SYSTEM_ID`, effect ids, pulse ids and option ids are saved in users' Dice So Nice appearance;
  renaming one silently resets users' dice. `EFFECTS` and `PULSES` order is the shader's numbering.
