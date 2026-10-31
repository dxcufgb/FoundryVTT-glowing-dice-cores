export const MODULE_ID = "dxcufgbs-glowing-dice-cores";
/** Dice So Nice dice system id. Stored in every user's Dice So Nice appearance: never rename. */
export const SYSTEM_ID = "dxcufgbs-glowing-cores";

/** Die types the system offers, copied from Dice So Nice's standard dice. */
export const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

/** Glow effects in shader order (index = pattern number in the shader). Ids are stored data: never rename. */
export const EFFECTS = ["ember", "vortex", "nebula", "storm", "heart", "eclipse", "frost", "lava",
  "plasma", "aurora", "wisps", "rings", "potion", "helix", "sun", "fairy"];

/** Each effect's own colours, used when "Colours" is set to the glow's own colours. */
export const PALETTES = {
  ember:   { core: "#ffd27a", glow: "#ff4d12" },
  vortex:  { core: "#efdcff", glow: "#8a3cff" },
  nebula:  { core: "#7ff3ff", glow: "#ff4fd8" },
  storm:   { core: "#f0f6ff", glow: "#3f8cff" },
  heart:   { core: "#ff9db0", glow: "#e3133f" },
  eclipse: { core: "#fff0b8", glow: "#ff8a00" },
  frost:   { core: "#e8fbff", glow: "#5ad1ff" },
  lava:    { core: "#ffe066", glow: "#ff3b6b" },
  plasma:  { core: "#ffe6ff", glow: "#c040ff" },
  aurora:  { core: "#7dffb2", glow: "#5a4dff" },
  wisps:   { core: "#c8fff4", glow: "#3fd6c0" },
  rings:   { core: "#ffe9a8", glow: "#ffb020" },
  potion:  { core: "#b6ff6b", glow: "#2fbf3a" },
  helix:   { core: "#7fd8ff", glow: "#ff5ca8" },
  sun:     { core: "#fff6d0", glow: "#ffb347" },
  fairy:   { core: "#fff3b0", glow: "#ff9ad5" }
};

/** Pulse modes in shader order. Stored data: never rename. */
export const PULSES = ["steady", "breathe", "heartbeat", "flicker"];

/** Default system settings (ranges are percentages, as Dice So Nice's range inputs show them). */
export const DEFAULTS = {
  effect: "ember",
  colours: "effect",
  core: PALETTES.ember.core,
  glow: PALETTES.ember.glow,
  intensity: 130,
  coreSize: 85,
  speed: 100,
  pulse: "breathe",
  rim: 90,
  body: 70,
  bloom: 100
};

/** Inner radius of each die shape as a share of its bounding-sphere radius: the glow lives inside this. */
export const INNER_RATIO = { d4: 0.36, d6: 0.6, d8: 0.6, d10: 0.62, d12: 0.79, d20: 0.79 };

/** Ray-march samples per pixel for the quality setting. */
export const QUALITY_STEPS = { low: 16, medium: 24, high: 32 };
