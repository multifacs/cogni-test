# Patching Svelte Files in opencode

This guide explains why `edit` operations on `.svelte` files frequently fail and how to make them reliable.

## How opencode's Edit Tools Work

opencode uses three different editing tools depending on the model:

| Tool | Models | Matching strategy |
|------|--------|-------------------|
| `edit` (V1) | Claude, Gemini, non-GPT | 8-level fuzzy cascade: Simple → LineTrimmed → BlockAnchor → WhitespaceNormalized → IndentationFlexible → EscapeNormalized → TrimmedBoundary → ContextAware |
| `apply_patch` | GPT models (except GPT-4) | `*** Begin Patch` / `*** End Patch` format with `@@` hunks; 4-level seek: exact → rstrip → trim → normalized |
| `edit` (V2/core) | Some contexts | **Exact match only** — `content.indexOf(oldString)`, no fuzzy fallback |

Model routing logic from the registry:
- GPT models **except** `gpt-4` and `gpt-*-oss` → `apply_patch`
- All other models → `edit` (V1)

You don't control which tool is used; you control whether your `old_string` can be matched by all of them.

## Myth: CRLF Causes Failures

**False.** opencode's `edit` tool automatically normalizes line endings before matching:

1. Detect the file's line ending (LF or CRLF)
2. Convert `\r\n` → `\n` in both `oldString` and `newString`
3. Convert back to the file's original line ending for the replacement

CRLF vs LF mismatch **does not** cause edit failures. Don't waste time converting line endings.

## The Real Root Causes

### #1: Multiple matches (the primary killer)

Every replacer in V1 `edit` requires the match to be **unique**:

```
if (firstIndex !== lastIndex) → SKIP — not unique!
```

In Svelte files with repetitive components (e.g., 13 identical `options={[{ label: 'Никогда', value: 'never' }]}` blocks or 23 `type="choice"` TableRows), even fuzzy replacers find multiple identical matches and refuse to apply.

**This is the single most common cause of edit failure in `.svelte` files.**

### #2: Disproportionate match refusal

If a fuzzy replacer matches a block much larger than `oldString`, the edit is rejected as a safety guard:

- Matched block has ≥ max(oldLines + 3, oldLines × 2) lines
- OR matched text is > max(oldLength + 500, oldLength × 4) characters

### #3: BlockAnchor similarity threshold < 0.65

The BlockAnchorReplacer computes Levenshtein distance on middle lines. If similarity falls below 0.65, no match is found.

### #4: V2 core edit has no fuzzy matching

If your request hits the V2 code path, only an exact `indexOf` match works. No whitespace tolerance, no trimming, no fuzzy fallback.

## What Actually Works

### Include a unique identifier inside `old_string`

The single most reliable strategy. Add a unique label, comment, or attribute that appears nowhere else in the file:

```
✅ Good — unique comment guarantees single match:
old_string: "<!-- Raven Matrices card -->\n\t\t\t\t<div class=\"metrics-card\">"

❌ Bad — generic pattern appears 23 times in the file:
old_string: "<TableRow type=\"choice\" options={...}>"
```

### Don't fear large blocks

40-line blocks work fine if they contain unique content. The old advice "small anchors only" was wrong about the root cause. Large blocks fail when they contain **repeating patterns**, not because of their size.

```
✅ Good — 40 lines with a unique header comment:
old_string: "<!-- Section: Behavioral Metrics -->\n...40 lines..."

❌ Bad — 5 lines that appear verbatim in 12 places:
old_string: "<div class=\"card\">\n\t<h3>Title</h3>\n</div>"
```

### Small anchors still help

2–5 line anchors work well because short fragments are more likely to be unique. But the reason isn't "fuzzy matching can't handle large blocks" — it's that short fragments have a higher chance of appearing only once.

### For `apply_patch`: use `@@` context markers

When the model uses `apply_patch`, include surrounding context lines in `@@` hunks. The 4-level seek algorithm (exact → rstrip → trim → normalized) uses context to disambiguate location.

### Verify after every edit

Run `read_file` on the affected region after patching to confirm the change actually applied. Don't chain multiple edits assuming earlier ones succeeded.

## Escaping a Broken State

If an edit partially applied (wrong indentation, extra tags, malformed markup):

1. **Run `npm run format`** — Prettier fixes indentation but won't fix structural errors (wrong number of closing tags).
2. **Check the diff** — `git diff` shows exactly what changed vs the committed state.
3. **Revert and retry** — If the nesting is hopelessly tangled, `git checkout -- <file>` and start over with a better anchor strategy.

## Quick Reference

| Problem | Solution | Why |
|---------|----------|-----|
| Edit fails with "multiple matches" | Add a unique comment/label inside `old_string` | Makes the match unambiguous for all replacer levels |
| Edit silently does nothing on large block | Check that the block contains unique content; if not, reduce to a unique sub-anchor | Disproportionate match guard or multiple matches |
| Apply patch fails to locate hunk | Add `@@` context lines above and below the change | Helps the 4-level seek algorithm disambiguate |
| Edit works for `.ts` but not `.svelte` | `.svelte` files have more repetitive patterns; use unique identifiers | Same tool, different file structure |
| V2 edit fails with "not found" | Ensure `old_string` is an exact byte-for-byte match | V2 has zero fuzzy tolerance |
