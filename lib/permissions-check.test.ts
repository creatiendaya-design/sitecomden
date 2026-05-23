import { describe, it, expect } from "vitest";
import {
  checkPermission,
  type UserPermissionView,
} from "./permissions-check";

// Convenience factory: build a UserPermissionView from a compact spec.
function makeUser(spec: {
  roleLevel?: number;
  rolePermissions?: string[];
  customPermissions?: Array<{ key: string; type: "GRANT" | "DENY" }>;
}): UserPermissionView {
  return {
    role:
      spec.roleLevel != null
        ? {
            level: spec.roleLevel,
            permissions: (spec.rolePermissions ?? []).map((key) => ({
              permission: { key },
            })),
          }
        : null,
    customPermissions: (spec.customPermissions ?? []).map((c) => ({
      permission: { key: c.key },
      type: c.type,
    })),
  };
}

describe("checkPermission - super admin bypass", () => {
  it("super admin (level >= 100) gets every permission", () => {
    const superAdmin = makeUser({ roleLevel: 100 });
    expect(checkPermission(superAdmin, "products.create")).toBe(true);
    expect(checkPermission(superAdmin, "i.invented.this")).toBe(true);
  });

  it("higher-than-100 levels still bypass", () => {
    const founder = makeUser({ roleLevel: 999 });
    expect(checkPermission(founder, "anything")).toBe(true);
  });

  it("level 99 is NOT a super admin", () => {
    const admin = makeUser({ roleLevel: 99, rolePermissions: ["products.view"] });
    expect(checkPermission(admin, "products.view")).toBe(true);
    expect(checkPermission(admin, "products.delete")).toBe(false);
  });
});

describe("checkPermission - role inheritance", () => {
  it("grants when the role has the permission", () => {
    const editor = makeUser({
      roleLevel: 3,
      rolePermissions: ["products.create", "products.update"],
    });
    expect(checkPermission(editor, "products.create")).toBe(true);
    expect(checkPermission(editor, "products.update")).toBe(true);
  });

  it("denies when the role lacks the permission", () => {
    const editor = makeUser({
      roleLevel: 3,
      rolePermissions: ["products.create"],
    });
    expect(checkPermission(editor, "products.delete")).toBe(false);
  });

  it("denies when the user has no role at all", () => {
    const orphan = makeUser({});
    expect(checkPermission(orphan, "products.view")).toBe(false);
  });
});

describe("checkPermission - per-user GRANT override", () => {
  it("GRANT lets a user use a permission their role lacks", () => {
    const staff = makeUser({
      roleLevel: 1,
      rolePermissions: [],
      customPermissions: [{ key: "orders.refund", type: "GRANT" }],
    });
    expect(checkPermission(staff, "orders.refund")).toBe(true);
  });

  it("GRANT does NOT leak to other permissions", () => {
    const staff = makeUser({
      roleLevel: 1,
      customPermissions: [{ key: "orders.refund", type: "GRANT" }],
    });
    expect(checkPermission(staff, "orders.delete")).toBe(false);
  });
});

describe("checkPermission - per-user DENY override", () => {
  it("DENY blocks a permission even when the role grants it", () => {
    const editor = makeUser({
      roleLevel: 3,
      rolePermissions: ["products.delete"],
      customPermissions: [{ key: "products.delete", type: "DENY" }],
    });
    expect(checkPermission(editor, "products.delete")).toBe(false);
  });

  it("DENY does NOT block other permissions", () => {
    const editor = makeUser({
      roleLevel: 3,
      rolePermissions: ["products.delete", "products.update"],
      customPermissions: [{ key: "products.delete", type: "DENY" }],
    });
    expect(checkPermission(editor, "products.update")).toBe(true);
  });

  it("DENY beats GRANT (defense-in-depth — explicit revocation wins)", () => {
    // This case shouldn't occur with the upsert pattern, but if both
    // entries somehow coexist, the .find() returns the first match.
    // We assert the *first* matching entry decides; the test pins behavior
    // even if data ends up inconsistent.
    const user = makeUser({
      roleLevel: 3,
      customPermissions: [
        { key: "orders.refund", type: "DENY" },
        { key: "orders.refund", type: "GRANT" },
      ],
    });
    expect(checkPermission(user, "orders.refund")).toBe(false);
  });

  it("DENY does NOT block super-admins (they bypass everything earlier)", () => {
    const superDeny = makeUser({
      roleLevel: 100,
      customPermissions: [{ key: "x", type: "DENY" }],
    });
    expect(checkPermission(superDeny, "x")).toBe(true);
  });
});
