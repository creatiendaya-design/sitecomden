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
    // The upsert pattern shouldn't allow both, but if both entries coexist
    // (or arrive via different alias names), DENY wins regardless of order.
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

describe("checkPermission - alias normalization", () => {
  it("accepts dot-form when role has colon-form (themes.update ≡ themes:update)", () => {
    const editor = makeUser({
      roleLevel: 3,
      rolePermissions: ["themes:update"],
    });
    expect(checkPermission(editor, "themes.update")).toBe(true);
  });

  it("treats products:update and products:edit as equivalent", () => {
    const legacyAdmin = makeUser({
      roleLevel: 80,
      rolePermissions: ["products:edit"],
    });
    expect(checkPermission(legacyAdmin, "products:update")).toBe(true);

    const modernAdmin = makeUser({
      roleLevel: 80,
      rolePermissions: ["products:update"],
    });
    expect(checkPermission(modernAdmin, "products:edit")).toBe(true);
  });

  it("treats orders/categories/coupons/customers edit↔update as equivalent", () => {
    const role = makeUser({
      roleLevel: 80,
      rolePermissions: [
        "orders:edit",
        "categories:edit",
        "coupons:edit",
        "customers:edit",
      ],
    });
    expect(checkPermission(role, "orders:update")).toBe(true);
    expect(checkPermission(role, "categories:update")).toBe(true);
    expect(checkPermission(role, "coupons:update")).toBe(true);
    expect(checkPermission(role, "customers:update")).toBe(true);
  });

  it("any granular settings:edit_* satisfies settings:update / settings:edit", () => {
    const role = makeUser({
      roleLevel: 80,
      rolePermissions: ["settings:edit_general"],
    });
    expect(checkPermission(role, "settings:update")).toBe(true);
    expect(checkPermission(role, "settings:edit")).toBe(true);
  });

  it("DENY on an alias blocks the canonical key too", () => {
    const role = makeUser({
      roleLevel: 80,
      rolePermissions: ["products:edit"],
      customPermissions: [{ key: "products:update", type: "DENY" }],
    });
    expect(checkPermission(role, "products:edit")).toBe(false);
    expect(checkPermission(role, "products:update")).toBe(false);
  });

  it("GRANT on an alias grants the canonical key", () => {
    const role = makeUser({
      roleLevel: 1,
      rolePermissions: [],
      customPermissions: [{ key: "products:edit", type: "GRANT" }],
    });
    expect(checkPermission(role, "products:update")).toBe(true);
  });
});
