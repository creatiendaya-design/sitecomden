import { resolveForDevice, resolveContentForDevice } from "../lib/blocks/resolve"
import type { BlockContentV2 } from "../lib/blocks/types"

let failures = 0
function expect(actual: unknown, expected: unknown, label: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (pass) {
    console.log(`  ✓ ${label}`)
  } else {
    failures++
    console.error(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log("resolveForDevice:")
expect(resolveForDevice("red", "desktop"), "red", "primitive shared → returns primitive")
expect(resolveForDevice(undefined, "desktop"), undefined, "undefined → undefined")
expect(resolveForDevice({ desktop: "red", mobile: "blue" }, "desktop"), "red", "override desktop")
expect(resolveForDevice({ desktop: "red", mobile: "blue" }, "mobile"), "blue", "override mobile")
expect(resolveForDevice({ desktop: "red" }, "mobile"), "red", "mobile missing → falls back to desktop")
expect(resolveForDevice({ mobile: "blue" }, "desktop"), "blue", "desktop missing → falls back to mobile")

console.log("\nresolveContentForDevice:")
const content: BlockContentV2 = {
  data: { title: "Hello" },
  style: {
    backgroundColor: { desktop: "#fff", mobile: "#eee" },
    paddingY: "md",
    cornerRadius: "sm",
  },
  media: {
    image: { desktop: "a.jpg", mobile: "b.jpg" },
  },
}
const desktopResolved = resolveContentForDevice(content, "desktop")
expect(desktopResolved.data, { title: "Hello" }, "data passes through unchanged")
expect(desktopResolved.style.backgroundColor, "#fff", "style override resolved to desktop")
expect(desktopResolved.style.paddingY, "md", "shared style passes through")
expect(desktopResolved.style.cornerRadius, "sm", "non-device style passes through")
expect(desktopResolved.media.image, { desktop: "a.jpg", mobile: "a.jpg" }, "image resolved to desktop (both slots filled with same)")

const mobileResolved = resolveContentForDevice(content, "mobile")
expect(mobileResolved.style.backgroundColor, "#eee", "style override resolved to mobile")
expect(mobileResolved.media.image, { desktop: "b.jpg", mobile: "b.jpg" }, "image resolved to mobile")

if (failures > 0) {
  console.error(`\n❌ ${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\n✅ All assertions passed")
