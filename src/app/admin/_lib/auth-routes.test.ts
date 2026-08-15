import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminPath, isPublicAdminPath } from "./auth-routes.ts";

describe("isPublicAdminPath", () => {
  it("allows the first-run and credential screens", () => {
    assert.equal(isPublicAdminPath("/admin/setup"), true);
    assert.equal(isPublicAdminPath("/admin/login"), true);
    assert.equal(isPublicAdminPath("/admin/forgot-password"), true);
    assert.equal(isPublicAdminPath("/admin/reset-password"), true);
    assert.equal(isPublicAdminPath("/admin/reset-password/"), true);
  });

  it("does not treat the dashboard as public", () => {
    assert.equal(isPublicAdminPath("/admin"), false);
    assert.equal(isPublicAdminPath("/admin/dashboard"), false);
    assert.equal(isPublicAdminPath("/admin/posts"), false);
  });
});

describe("isAdminPath", () => {
  it("matches the admin tree only", () => {
    assert.equal(isAdminPath("/admin"), true);
    assert.equal(isAdminPath("/admin/login"), true);
    assert.equal(isAdminPath("/"), false);
    assert.equal(isAdminPath("/api"), false);
  });
});
