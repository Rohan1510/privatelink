import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Production Headers & CSP Verification", () => {
  const htmlPath = path.resolve("index.html");
  assert.ok(fs.existsSync(htmlPath), "index.html must exist");

  const content = fs.readFileSync(htmlPath, "utf-8");

  // Verify Content Security Policy meta tag presence
  assert.ok(content.includes('http-equiv="Content-Security-Policy"'), "CSP meta tag must be present in index.html");

  // Extract CSP content string
  const cspMatch = content.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(cspMatch, "CSP content attribute must be extractable");
  const csp = cspMatch[1];

  // Verify strict rules
  assert.ok(!csp.includes("'unsafe-inline'"), "CSP must NOT contain 'unsafe-inline' directive");
  assert.ok(csp.includes("object-src 'none'"), "CSP must include object-src 'none'");
  assert.ok(csp.includes("base-uri 'none'"), "CSP must include base-uri 'none'");
  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must include frame-ancestors 'none'");
  assert.ok(csp.includes("form-action 'none'"), "CSP must include form-action 'none'");
});
