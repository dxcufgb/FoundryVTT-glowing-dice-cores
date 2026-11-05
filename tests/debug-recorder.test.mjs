// The optional Debug Recorder helper: registers once whatever the load order, does nothing without the
// recorder or while it is not recording, and never lets a recorder error through. Run by CI: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const hooks = {};
const modules = new Map();
globalThis.Hooks = { once: (name, fn) => (hooks[name] ??= []).push(fn), on: (name, fn) => (hooks[name] ??= []).push(fn) };
globalThis.game = { modules: { get: id => modules.get(id) } };
const run = (name, ...args) => { for (const fn of hooks[name] ?? []) fn(...args); };

const { MODULE_ID } = await import("../scripts/constants.js");
const { crumb, noteError, registerDebugRecorder } = await import("../scripts/debug-recorder.js");

test("the helper registers once and only crumbs while recording", () => {
  registerDebugRecorder(() => ({ state: 1 }));
  run("init");
  assert.doesNotThrow(() => crumb("x.y", { a: 1 }), "no recorder: nothing happens");

  const calls = { register: [], breadcrumb: [] };
  let recording = false;
  const rec = {
    register: (id, opts) => calls.register.push([id, opts]),
    breadcrumb: (...args) => { calls.breadcrumb.push(args); throw new Error("recorder bug"); },
    isRecording: () => recording
  };
  modules.set("dxcufgbs-debug-recorder", { active: true, api: rec });
  run("dxcufgbs-debug-recorder.ready", rec);
  run("ready");
  run("dxcufgbs-debug-recorder.ready", rec);
  assert.equal(calls.register.length, 1, "registered exactly once");
  assert.equal(calls.register[0][0], MODULE_ID);

  crumb("x.y", { a: 1 });
  assert.equal(calls.breadcrumb.length, 0, "no breadcrumb while not recording");
  recording = true;
  assert.doesNotThrow(() => crumb("x.y", { a: 1 }), "a recorder error is swallowed");
  assert.deepEqual(calls.breadcrumb[0], [MODULE_ID, "x.y", { a: 1 }]);

  noteError("shader.inject");
  const snap = calls.register[0][1].snapshot();
  assert.equal(snap.state, 1);
  assert.equal(snap.errors.counts["shader.inject"], 1);
  assert.equal(snap.errors.last, "shader.inject");
  assert.doesNotThrow(() => JSON.stringify(snap));
});
