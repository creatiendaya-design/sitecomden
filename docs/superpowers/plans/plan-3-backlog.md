# Plan 3 Backlog — User Feedback During Plan 2 Execution

Accumulated during the Plan 2 session. Plan 3 was originally scoped as **Templates with sync**; incorporate these items when writing the Plan 3 spec/plan, either bundled into Plan 3 or in a small Plan 2.5 dedicated to styling improvements.

---

## Styling system enhancements (Estilo tab)

Plan 2 shipped a deliberately-basic "Level 2" styling system. The following fields feel missing in real use:

1. **Padding separado top/bottom**
   - Current: single `paddingY` with presets S/M/L/XL applied to both top and bottom equally
   - Desired: independent `paddingTop` and `paddingBottom`, each with its own presets (or px values). Lets admins tightly pack adjacent blocks or leave asymmetric breathing room.
   - Affects `BlockStyle` type + `applyBlockStyle` + PaddingControl.

2. **Typography controls**
   - Text size (sm / base / lg / xl + custom)
   - Font weight (regular / medium / semibold / bold)
   - Applied via Tailwind utility classes in `applyBlockStyle` and/or via CSS custom properties on the outer wrapper so block descendants inherit.

3. **Background gradients**
   - Current: flat color only (`backgroundColor`)
   - Desired: optional gradient (two colors + direction). Useful for section visual differentiation without uploading images.
   - Could be a new `backgroundGradient` field on `BlockStyle` with `{ from, to, direction }` structure.

---

## RICH_TEXT block fixes

User reports the "Texto con formato" section has issues:

- **Centering doesn't work.** When the admin sets alignment to center in the Style tab, the inner `prose` div keeps text-aligned left because of `mx-auto` on a `max-w-[65ch]` container. The alignment value needs to propagate to the prose content itself, not just the outer `<section>`.
  - Likely fix: either drop `mx-auto` and let the section's `text-*` cascade, or apply the alignment class to the inner prose div explicitly.
  - File: `components/shop/templates/blocks/RichTextBlock.tsx`

- **Multiple toolbar functions in the editor don't work.** The RichTextEditor (TipTap) at `components/admin/RichTextEditor.tsx` has buttons whose effects don't persist or don't reflect in the block preview. Needs a feature-by-feature audit:
  - Test each button: B / I / U / headings / lists / links / images / alignment / undo / redo / color
  - For each that's broken: identify whether TipTap extension is missing, the markup strips on save, or the `prose` CSS is hiding the effect
  - May need to enable more TipTap extensions and add matching `ALLOWED_TAGS`/`ALLOWED_ATTR` entries in DOMPurify in RichTextBlock

---

## Notes for Plan 3 scoping

Plan 3's original scope is templates + sync (spec section 6). These styling/text-editor issues are orthogonal and could:

- **Option A (recommended)**: be bundled into Plan 3 as a short Phase 0 before Templates (~3-5 days)
- **Option B**: be split into a dedicated Plan 2.5 (~1 week) executed between Plan 2 merge and Plan 3 start
- **Option C**: defer to a later plan if the user wants templates sooner

When writing Plan 3, ask the user which option they prefer.
