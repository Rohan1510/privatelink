import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Alfa Romeo Theme - Design Tokens & Variables Verification", () => {
  const cssPath = path.resolve("src/index.css");
  assert.ok(fs.existsSync(cssPath), "src/index.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Verify all 14 color tokens from DESIGN.md
  const expectedTokens = [
    { name: "--brand", value: "#ba0816" },
    { name: "--brand-hover", value: "#8e0d25" },
    { name: "--ink", value: "#000000" },
    { name: "--ink-charcoal", value: "#292b35" },
    { name: "--ink-deep", value: "#1c1f2a" },
    { name: "--canvas", value: "#f4f4f4" },
    { name: "--canvas-light", value: "#f4f4f4" },
    { name: "--canvas-dark", value: "#292b35" },
    { name: "--canvas-deep", value: "#1c1f2a" },
    { name: "--surface-1", value: "#e5e5e5" },
    { name: "--ink-muted", value: "#595959" },
    { name: "--hairline", value: "#b6b6b6" },
    { name: "--hairline-light", value: "#c4c4c4" },
    { name: "--disabled", value: "#686868" },
    { name: "--info", value: "#0064cf" },
    { name: "--success", value: "#1d5b40" },
    { name: "--error", value: "#eb143d" },
  ];

  for (const token of expectedTokens) {
    assert.ok(
      css.includes(token.name) && css.includes(token.value),
      `CSS must declare token ${token.name}: ${token.value}`
    );
  }

  // Rounded Curvature System Verification
  assert.ok(
    css.includes("--radius-md") && css.includes("--radius:"),
    "CSS must declare rounded radius tokens"
  );
  assert.ok(
    css.includes("border-radius: var(--radius-lg)") || css.includes("border-radius: 12px"),
    "CSS must implement rounded curvature across components"
  );

  // Detailed Sliding & Animation Keyframes Verification
  assert.ok(
    css.includes("@keyframes slideUpFade") && css.includes("@keyframes slideDownFade"),
    "CSS must specify detailed sliding animations (slideUpFade, slideDownFade)"
  );
  assert.ok(
    css.includes("@keyframes radarPing"),
    "CSS must specify radar telemetry pulsing animation"
  );

  // Typography verification: Space Grotesk and 1.5px tracking
  assert.ok(
    css.includes("Space Grotesk"),
    "CSS must specify Space Grotesk font family"
  );
  assert.ok(
    css.includes("letter-spacing: 1.5px"),
    "CSS must declare 1.5px letter-spacing for timing-screen label cadence"
  );
});

test("Alfa Romeo Theme - HTML Font Resource Verification", () => {
  const htmlPath = path.resolve("index.html");
  assert.ok(fs.existsSync(htmlPath), "index.html must exist");

  const html = fs.readFileSync(htmlPath, "utf-8");
  assert.ok(
    html.includes("Space+Grotesk"),
    "index.html must link Space Grotesk from Google Fonts"
  );
});

test("Alfa Romeo Theme - Dual Theme (Light Mode) Tokens Verification", () => {
  const cssPath = path.resolve("src/index.css");
  assert.ok(fs.existsSync(cssPath), "src/index.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Verify [data-theme="light"] block exists
  assert.ok(css.includes('[data-theme="light"]'), "CSS must define [data-theme=\"light\"] selector");

  // Verify Italian luxury ivory and linen beige tokens
  assert.ok(css.includes("#FAF8F5"), "CSS must declare ivory canvas #FAF8F5 in light mode");
  assert.ok(css.includes("#EFEAE1"), "CSS must declare linen beige panel surface #EFEAE1 in light mode");
  assert.ok(css.includes("#1C1F2A"), "CSS must declare deep charcoal text #1C1F2A in light mode");
  assert.ok(css.includes("#D9D2C5"), "CSS must declare warm sand hairline #D9D2C5 in light mode");
  assert.ok(css.includes("#E5DFD3"), "CSS must declare sand surface #E5DFD3 in light mode");

  // Verify smooth transition engine is wired
  assert.ok(
    css.includes("transition: background-color 0.4s") || css.includes("background-color 0.4s"),
    "CSS must declare smooth 0.4s theme transition for surfaces"
  );

  // Verify chat bubbles and panels in light mode
  assert.ok(css.includes('[data-theme="light"] .bubble-me'), "CSS must override .bubble-me in light mode");
  assert.ok(css.includes('[data-theme="light"] .bubble-peer'), "CSS must override .bubble-peer in light mode");
  assert.ok(css.includes('[data-theme="light"] .connect-panel'), "CSS must override .connect-panel in light mode");
});

test("Alfa Romeo Theme - Theme State Hook & Toggle Component Verification", async () => {
  const hookPath = path.resolve("src/useTheme.js");
  const togglePath = path.resolve("src/ThemeToggle.jsx");

  assert.ok(fs.existsSync(hookPath), "src/useTheme.js must exist");
  assert.ok(fs.existsSync(togglePath), "src/ThemeToggle.jsx must exist");

  const hookCode = fs.readFileSync(hookPath, "utf-8");
  assert.ok(hookCode.includes("privatelink_theme"), "useTheme must persist to privatelink_theme storage key");
  assert.ok(hookCode.includes("data-theme"), "useTheme must synchronize data-theme attribute on documentElement");

  const toggleCode = fs.readFileSync(togglePath, "utf-8");
  assert.ok(toggleCode.includes("ThemeToggle"), "ThemeToggle component must be declared");
  assert.ok(toggleCode.includes("Sun") && toggleCode.includes("Moon"), "ThemeToggle must render Sun and Moon icons");
});
