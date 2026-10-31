/**
 * Dxcufgb's Glowing dice cores – entry point.
 *
 * Adds a Dice So Nice dice system, "Glowing cores" (id SYSTEM_ID), with the standard d4–d20 and d100. A player picks
 * it per die type in Dice So Nice's Appearance tab; its System options (Dice So Nice's own dialog) hold the glow
 * settings. Those are stored in the player's Dice So Nice appearance and travel with their rolls, so everyone sees
 * the same glow on that player's dice.
 *
 * API: game.modules.get("dxcufgbs-glowing-dice-cores").api
 *   SYSTEM_ID   the Dice So Nice system id
 *   EFFECTS     glow effect ids
 *   PULSES      pulse ids
 *   DEFAULTS    default system settings
 */
import { MODULE_ID, SYSTEM_ID, DIE_TYPES, EFFECTS, PALETTES, PULSES, DEFAULTS, INNER_RATIO, QUALITY_STEPS } from "./constants.js";
import { injectGlow } from "./glow-shader.js";

const t = key => game.i18n.localize(`DXGC.${key}`);
const TIME = { value: 0 };
const START = performance.now();
let DiceSystemClass = null;
let apiImport = null;

/* ---------- colour helpers (no three.js needed) ---------- */

/** "#rrggbb" (or any colour Foundry can read) to {r, g, b} in 0–1 sRGB, or null. */
function parseColour(value) {
  if (Array.isArray(value)) value = value[0];
  if (typeof value !== "string" || !value) return null;
  try {
    const c = foundry.utils.Color.from(value);
    if (!Number.isFinite(Number(c))) return null;
    const [r, g, b] = c.rgb;
    return { r, g, b };
  } catch (err) {
    return null;
  }
}
const toLinear = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linear = c => ({ r: toLinear(c.r), g: toLinear(c.g), b: toLinear(c.b) });

/* ---------- settings ---------- */

const num = (v, fallback, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Clamp and fill in one die type's system settings (they come from other players' appearance data). */
function normalize(raw = {}) {
  const s = { ...DEFAULTS, ...(raw ?? {}) };
  return {
    effect: EFFECTS.includes(s.effect) ? s.effect : DEFAULTS.effect,
    colours: s.colours === "custom" ? "custom" : "effect",
    core: parseColour(s.core) ? s.core : DEFAULTS.core,
    glow: parseColour(s.glow) ? s.glow : DEFAULTS.glow,
    intensity: num(s.intensity, DEFAULTS.intensity, 0, 300) / 100,
    coreSize: num(s.coreSize, DEFAULTS.coreSize, 30, 120) / 100,
    speed: num(s.speed, DEFAULTS.speed, 0, 300) / 100,
    pulse: PULSES.includes(s.pulse) ? s.pulse : DEFAULTS.pulse,
    rim: num(s.rim, DEFAULTS.rim, 0, 200) / 100,
    body: num(s.body, DEFAULTS.body, 0, 100) / 100,
    bloom: num(s.bloom, DEFAULTS.bloom, 0, 200) / 100
  };
}

function qualitySteps() {
  try {
    return QUALITY_STEPS[game.settings.get(MODULE_ID, "quality")] ?? QUALITY_STEPS.medium;
  } catch (err) {
    return QUALITY_STEPS.medium;
  }
}

/* ---------- Dice So Nice callbacks ---------- */

function shapeOf(type) {
  const preset = game.dice3d?.DiceFactory?.systems?.get(SYSTEM_ID)?.dice?.get(type);
  return preset?.shape ?? type;
}

/** Called once per (die type, look, settings) material: build its glow uniforms. */
function processMaterial(type, material, appearance) {
  try {
    const s = normalize(appearance?.systemSettings);
    const palette = s.colours === "effect" ? PALETTES[s.effect] : { core: s.core, glow: s.glow };
    const realistic = !!game.dice3d?.DiceFactory?.realisticLighting;
    const data = material.userData?.materialData ?? {};
    const bg = parseColour(data.background) ?? { r: 0, g: 0, b: 0 };
    const fg = parseColour(data.foreground) ?? { r: 1, g: 1, b: 1 };
    const ratio = INNER_RATIO[shapeOf(type)] ?? 0.6;

    const uniforms = {
      gcTime: TIME,
      gcIntensity: { value: s.intensity },
      gcCore: { value: s.coreSize },
      gcSpeed: { value: s.speed },
      gcRim: { value: s.rim },
      gcPulse: { value: PULSES.indexOf(s.pulse) },
      gcR: { value: 30 * ratio },
      gcPattern: { value: EFFECTS.indexOf(s.effect) },
      gcSeed: { value: Math.random() * 50 },
      gcDark: { value: s.body },
      gcBloom: { value: s.bloom },
      gcC1: { value: linear(parseColour(palette.core)) },
      gcC2: { value: linear(parseColour(palette.glow)) },
      // The face texture is decoded to linear light only with realistic lighting.
      gcBg: { value: realistic ? linear(bg) : bg },
      gcFg: { value: realistic ? linear(fg) : fg }
    };
    material.userData.glowingCore = { uniforms, ratio };

    const previous = material.onBeforeRender;
    material.onBeforeRender = function (renderer, scene, camera, geometry, object, group) {
      if (typeof previous === "function") previous.call(this, renderer, scene, camera, geometry, object, group);
      TIME.value = (performance.now() - START) / 1000;
      if (geometry) {
        if (!geometry.boundingSphere) geometry.computeBoundingSphere?.();
        const radius = geometry.boundingSphere?.radius;
        if (radius) uniforms.gcR.value = radius * ratio;
      }
    };
  } catch (err) {
    console.error(`${MODULE_ID} | could not prepare a die material`, err);
  }
}

/** Called when three.js compiles the material: add the glow to its shader. */
function beforeShaderCompile(shader, material) {
  const glow = material?.userData?.glowingCore;
  if (!glow) return;
  try {
    if (!injectGlow(shader, glow.uniforms, qualitySteps()))
      console.warn(`${MODULE_ID} | this die's material has no place for the glow; it is shown without one`);
  } catch (err) {
    console.error(`${MODULE_ID} | could not add the glow to a die`, err);
  }
}

/* ---------- registration ---------- */

function buildSystem() {
  const options = (ids, group) => Object.fromEntries(ids.map(id => [id, t(`${group}.${id}`)]));
  const system = new DiceSystemClass(SYSTEM_ID, t("SystemName"), "default", "Dxcufgb");
  system.addSettingSeparator({ name: t("System.Header") });
  system.addSettingSelect({ id: "effect", name: t("System.Effect"), defaultValue: DEFAULTS.effect, options: options(EFFECTS, "Effect") });
  system.addSettingSelect({ id: "colours", name: t("System.Colours"), defaultValue: DEFAULTS.colours, options: options(["effect", "custom"], "Colours") });
  system.addSettingColor({ id: "core", name: t("System.Core"), defaultValue: DEFAULTS.core });
  system.addSettingColor({ id: "glow", name: t("System.Glow"), defaultValue: DEFAULTS.glow });
  system.addSettingRange({ id: "intensity", name: t("System.Intensity"), defaultValue: DEFAULTS.intensity, min: 0, max: 300, step: 5 });
  system.addSettingRange({ id: "coreSize", name: t("System.CoreSize"), defaultValue: DEFAULTS.coreSize, min: 30, max: 120, step: 1 });
  system.addSettingRange({ id: "speed", name: t("System.Speed"), defaultValue: DEFAULTS.speed, min: 0, max: 300, step: 5 });
  system.addSettingSelect({ id: "pulse", name: t("System.Pulse"), defaultValue: DEFAULTS.pulse, options: options(PULSES, "Pulse") });
  system.addSettingRange({ id: "rim", name: t("System.Rim"), defaultValue: DEFAULTS.rim, min: 0, max: 200, step: 5 });
  system.addSettingRange({ id: "body", name: t("System.Body"), defaultValue: DEFAULTS.body, min: 0, max: 100, step: 5 });
  system.addSettingRange({ id: "bloom", name: t("System.Bloom"), defaultValue: DEFAULTS.bloom, min: 0, max: 200, step: 5 });
  system.registerProcessMaterialCallback(processMaterial);
  system.registerBeforeShaderCompileCallback(beforeShaderCompile);
  return system;
}

async function registerWithDiceSoNice(dice3d) {
  try {
    if (!DiceSystemClass) await apiImport;
    if (!DiceSystemClass || !dice3d?.DiceFactory) {
      console.warn(`${MODULE_ID} | Dice So Nice 5's dice system API was not found; no glowing dice`);
      return;
    }
    const factory = dice3d.DiceFactory;
    if (factory.systems.has(SYSTEM_ID)) return;
    dice3d.addSystem(buildSystem());
    const standard = factory.systems.get("standard");
    for (const type of DIE_TYPES) {
      const preset = standard?.dice?.get(type);
      if (!preset) continue;
      dice3d.addDicePreset({ type, labels: [...preset.labels], system: SYSTEM_ID });
    }
    console.log(`${MODULE_ID} | added the "${t("SystemName")}" dice system to Dice So Nice`);
  } catch (err) {
    console.error(`${MODULE_ID} | could not add the dice system to Dice So Nice`, err);
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "quality", {
    name: "DXGC.Settings.Quality.Name",
    hint: "DXGC.Settings.Quality.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      low: "DXGC.Settings.Quality.low",
      medium: "DXGC.Settings.Quality.medium",
      high: "DXGC.Settings.Quality.high"
    },
    default: "medium",
    requiresReload: true
  });

  apiImport = import("../../dice-so-nice/api.js")
    .then(mod => { DiceSystemClass = mod.DiceSystem ?? null; })
    .catch(err => console.warn(`${MODULE_ID} | Dice So Nice is not installed or too old`, err));

  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = Object.freeze({ SYSTEM_ID, EFFECTS: [...EFFECTS], PULSES: [...PULSES], DEFAULTS: { ...DEFAULTS } });
});

Hooks.once("diceSoNiceReady", dice3d => { registerWithDiceSoNice(dice3d); });
