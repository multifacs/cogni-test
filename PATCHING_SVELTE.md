# Patching Deeply-Nested Svelte Files

When using the `patch` tool on `.svelte` files with deeply-nested HTML (8+ levels of tabs), follow these rules to avoid silent match failures.

## The Problem

The `patch` tool uses fuzzy string matching to find `old_string` in the file. With deeply-nested Svelte/HTML:

1. **Whitespace drift accumulates.** Each line may be off by a tab or space. Across 30+ lines, the cumulative difference exceeds the fuzzy matcher's tolerance and the patch silently does nothing.

2. **Tab/space ambiguity.** The file uses hard tabs, but the text you type into `old_string` may not preserve exact tab counts. Reading `read_file` output, it's easy to miscount tab depth by 1–2 levels on deeply nested lines.

3. **Large `old_string` blocks fail.** Matching an entire card component (40+ lines) almost never works. The matcher needs a tight, unambiguous anchor.

## What Works

### Use small, unique anchor points (2–5 lines)

Instead of matching an entire block, find a **unique comment or short HTML fragment** nearby and use that as the `old_string`:

```
✅ Good — small, unique, easy to match:
old_string: the line "<!-- Editable metrics section -->" + 2 lines after it

❌ Bad — 40-line card component with 10 levels of tab nesting
```

### Patch in small steps

Break a large insertion into multiple small patches:
1. First patch: insert a comment marker at a unique location
2. Second patch: expand around the marker

### Verify after every patch

Run `read_file` on the affected region after patching to confirm the change actually applied. Don't chain multiple patches assuming earlier ones succeeded.

### For `.ts` files, large patches work fine

TypeScript files have shallower nesting and simpler structure. The fuzzy matcher handles 30+ line `old_string` blocks reliably.

## Escaping a Broken State

If a patch partially applied (wrong indentation, extra `</div>` tags):

1. **Run `npm run format`** — Prettier will fix indentation but won't fix structural DOM errors (wrong number of closing tags).
2. **Check the diff** — `git diff` shows exactly what changed vs the committed state.
3. **Revert and retry** — If the nesting is hopelessly tangled, `git checkout -- <file>` and start over with a better patch strategy.

## Concrete Example

Adding a new metrics card inside an existing grid in `+page.svelte`:

```
✅ Strategy that worked:
   old_string = "<!-- Editable metrics section -->\n\t\t\t\t<div\n\t\t\t\t\tclass=\"rounded-lg..."
   new_string = "<!-- Raven Matrices -->\n...entire new card...\n\n\t\t\t\t<!-- Editable metrics section -->\n\t\t\t\t<div..."

❌ Strategy that failed:
   old_string = entire 50-line Swallow card closing + 3 </div> tags
   new_string = same 50 lines + Raven card inserted
```

The small anchor (`<!-- Editable metrics section -->`) is unique in the file and only 3 lines — the fuzzy matcher finds it every time.
