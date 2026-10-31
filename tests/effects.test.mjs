// Consistency checks that need neither Foundry, three.js nor a GPU. Run by CI: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EFFECTS, PALETTES, PULSES, DEFAULTS, INNER_RATIO, QUALITY_STEPS, DIE_TYPES } from "../scripts/constants.js";
import { injectGlow } from "../scripts/glow-shader.js";

const shader = readFileSync(new URL("../scripts/glow-shader.js", import.meta.url), "utf8");
const lang = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8")).DXGC;
const hex = /^#[0-9a-f]{6}$/i;

test("every effect has a palette and an English name", () => {
  assert.equal(new Set(EFFECTS).size, EFFECTS.length, "effect ids are unique");
  for (const id of EFFECTS) {
    assert.match(PALETTES[id]?.core ?? "", hex, `${id} core colour`);
    assert.match(PALETTES[id]?.glow ?? "", hex, `${id} glow colour`);
    assert.ok(lang.Effect[id], `lang DXGC.Effect.${id}`);
  }
  assert.deepEqual(Object.keys(PALETTES).sort(), [...EFFECTS].sort(), "no palette without an effect");
});

test("the shader has one branch per effect, in order", () => {
  const cuts = [...shader.matchAll(/gcPattern < (\d+)\.5/g)].map(m => Number(m[1]));
  assert.deepEqual(cuts, EFFECTS.slice(0, -1).map((_, i) => i), "branches 0.5, 1.5, ... and a final default");
});

test("every pulse has an English name and a shader branch", () => {
  for (const id of PULSES) assert.ok(lang.Pulse[id], `lang DXGC.Pulse.${id}`);
  const cuts = [...shader.matchAll(/gcPulse < (\d+)\.5/g)].map(m => Number(m[1]));
  assert.deepEqual(cuts, PULSES.slice(0, -1).map((_, i) => i));
});

test("defaults are valid options", () => {
  assert.ok(EFFECTS.includes(DEFAULTS.effect));
  assert.ok(PULSES.includes(DEFAULTS.pulse));
  assert.ok(["effect", "custom"].includes(DEFAULTS.colours));
  assert.match(DEFAULTS.core, hex);
  assert.match(DEFAULTS.glow, hex);
  for (const shape of ["d4", "d6", "d8", "d10", "d12", "d20"]) assert.ok(INNER_RATIO[shape] > 0 && INNER_RATIO[shape] < 1, shape);
  for (const type of DIE_TYPES) assert.match(type, /^d\d+$/);
  for (const q of Object.keys(QUALITY_STEPS)) assert.ok(lang.Settings.Quality[q], `quality ${q}`);
});

test("injectGlow patches a lit material and leaves others alone", () => {
  const lit = {
    vertexShader: "void main(){\n#include <project_vertex>\n}",
    fragmentShader: "void main(){\n#include <map_fragment>\n#include <emissivemap_fragment>\n}",
    uniforms: {}
  };
  const u = { gcTime: { value: 0 } };
  assert.equal(injectGlow(lit, u, 24), true);
  assert.match(lit.fragmentShader, /#define GC_STEPS 24/);
  assert.match(lit.fragmentShader, /totalEmissiveRadiance \+= gcEmit/);
  assert.match(lit.vertexShader, /gcObjCam =/);
  assert.equal(lit.uniforms.gcTime, u.gcTime);
  assert.doesNotMatch(lit.fragmentShader, /globalBloom/, "no bloom code without Dice So Nice's bloom uniform");

  const bloom = { ...lit, vertexShader: "void main(){\n#include <project_vertex>\n}", fragmentShader: "uniform float globalBloom;\nvoid main(){\n#include <map_fragment>\n#include <emissivemap_fragment>\n}", uniforms: { globalBloom: { value: 0 } } };
  injectGlow(bloom, u, 16);
  assert.match(bloom.fragmentShader, /globalBloom > 0\.5\) \{ gl_FragColor\.rgb \+= gcEmit/);

  const basic = { vertexShader: "void main(){}", fragmentShader: "void main(){}", uniforms: {} };
  assert.equal(injectGlow(basic, u, 24), false);
  assert.equal(basic.fragmentShader, "void main(){}");
});
