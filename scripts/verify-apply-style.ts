import { applyBlockStyle } from "../lib/blocks/apply-style"
import type { BlockStyle } from "../lib/blocks/types"

let failures = 0
function expect(actual: unknown, expected: unknown, label: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (pass) console.log(`  ✓ ${label}`)
  else {
    failures++
    console.error(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log("applyBlockStyle:")

expect(applyBlockStyle(undefined), { className: "", style: {} }, "undefined style → empty output")
expect(applyBlockStyle({} as BlockStyle), { className: "", style: {} }, "empty style → empty output")

const result1 = applyBlockStyle({
  paddingY: "md",
  alignment: "center",
  backgroundColor: "#ff0000",
  textColor: "#ffffff",
})
expect(result1.className.includes("py-8"), true, "paddingY md → py-8")
expect(result1.className.includes("text-center"), true, "alignment center → text-center")
expect(result1.style.backgroundColor, "#ff0000", "backgroundColor → inline style")
expect(result1.style.color, "#ffffff", "textColor → inline style.color")

const result2 = applyBlockStyle({
  cornerRadius: "lg",
  border: "strong",
  shadow: "subtle",
})
expect(result2.className.includes("rounded-2xl"), true, "cornerRadius lg → rounded-2xl")
expect(result2.className.includes("border-2"), true, "border strong → border-2")
expect(result2.className.includes("shadow-sm"), true, "shadow subtle → shadow-sm")

if (failures > 0) {
  console.error(`\n❌ ${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\n✅ All assertions passed")
