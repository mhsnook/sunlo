# Migrate shadcn/ui from Radix to Base UI

## Why

Radix UI has known cross-browser bugs that affect Firefox and Safari:

- Popovers inside dialogs flash/close immediately ([shadcn#6770](https://github.com/shadcn-ui/ui/issues/6770), [radix#2848](https://github.com/radix-ui/primitives/issues/2848))
- Playwright click actions cause Radix dropdowns to instantly close ([radix#2288](https://github.com/radix-ui/primitives/issues/2288))
- `data-state` attribute handling differs across browsers ([shadcn#9443](https://github.com/shadcn-ui/ui/issues/9443))

These cause 19 Firefox test failures in our mutation suite. All are in Radix-powered interactive components (dropdowns, dialogs, popovers, selects).

Since January 2026, shadcn/ui officially supports **Base UI** (by the ex-MUI team) as a drop-in alternative. Base UI uses `@floating-ui` for positioning instead of Radix's custom system, which has better cross-browser behavior. The consumer API stays identical — only the underlying primitives change.

## Current Radix Surface Area

### 18 Radix packages in `package.json`

```
@radix-ui/react-accordion       @radix-ui/react-navigation-menu
@radix-ui/react-alert-dialog     @radix-ui/react-popover
@radix-ui/react-avatar           @radix-ui/react-progress
@radix-ui/react-checkbox         @radix-ui/react-radio-group
@radix-ui/react-collapsible      @radix-ui/react-scroll-area
@radix-ui/react-dialog           @radix-ui/react-select
@radix-ui/react-dropdown-menu    @radix-ui/react-separator
@radix-ui/react-label            @radix-ui/react-slot
@radix-ui/react-tabs             @radix-ui/react-tooltip
```

### 23 UI components importing Radix directly

All in `src/components/ui/` except one:

- `manage-playlist-phrases-dialog.tsx` imports `DialogClose` from `@radix-ui/react-dialog` directly (should use the re-export from `ui/dialog.tsx` instead)

### 6 test selectors referencing Radix internals

All in `e2e/mutations/decks.spec.ts`:

- `[data-radix-menu-content]` (used 4 times for dropdown menu targeting)
- These need to be replaced with `data-testid` or role-based selectors anyway

### `data-slot` selectors (safe)

Several tests use `data-slot=` selectors (e.g., `data-slot=navigation-menu`, `data-slot=card`). These are shadcn conventions, not Radix-specific, and should survive the migration.

## Migration Plan

### Phase 0: Prep (do first, no risk)

1. **Fix the direct Radix import** in `manage-playlist-phrases-dialog.tsx` — import `DialogClose` from `@/components/ui/dialog` instead of `@radix-ui/react-dialog`
2. **Replace `[data-radix-menu-content]` selectors** in `decks.spec.ts` with `data-testid` or role-based selectors (e.g., `getByRole('menu')`)
3. **Audit for any other `data-radix-*` usage** in app code or tests

### Phase 1: Regenerate UI components

Use `npx shadcn add` with Base UI configured to regenerate each component one at a time:

**High priority (most Firefox-broken):**

1. `dialog.tsx` + `sheet.tsx` (both use `@radix-ui/react-dialog`)
2. `alert-dialog.tsx`
3. `dropdown-menu.tsx`
4. `popover.tsx`
5. `select.tsx`
6. `command.tsx` (wraps dialog)

**Medium priority:**

7. `accordion.tsx`
8. `checkbox.tsx`
9. `collapsible.tsx`
10. `navigation-menu.tsx`
11. `radio-group.tsx`
12. `tabs.tsx`
13. `tooltip.tsx`

**Low priority (simple/visual only):**

14. `avatar.tsx`
15. `label.tsx`
16. `progress.tsx`
17. `scroll-area.tsx`
18. `separator.tsx`

**Utility (may need manual handling):**

19. `button.tsx` — uses `@radix-ui/react-slot` for `asChild`
20. `form.tsx` — uses `@radix-ui/react-label` and `@radix-ui/react-slot`
21. `sidebar.tsx` — uses `@radix-ui/react-slot`
22. `item.tsx` — uses `@radix-ui/react-slot`

For each component:

- Run `npx shadcn add <component>` (will pull Base UI variant)
- Diff against current version for any local customizations
- Re-apply customizations on the new Base UI version
- Verify component works in the app

### Phase 2: Custom components

Review components that extend shadcn primitives:

- `authenticated-dialog.tsx` — wraps `dialog.tsx`, should Just Work
- `drawer.tsx` — uses `vaul`, separate from Radix (leave as-is)
- `multi-select.tsx` — check if it depends on Radix internals
- `chart.tsx` — likely no Radix dependency

### Phase 3: Remove Radix packages

After all components are migrated:

```bash
pnpm remove @radix-ui/react-accordion @radix-ui/react-alert-dialog \
  @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label \
  @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress \
  @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select \
  @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs \
  @radix-ui/react-tooltip
```

Verify no remaining Radix imports: `grep -r "@radix-ui" src/`

### Phase 4: Cross-browser test pass

1. Run full mutation suite on chromium — should still pass
2. Run full mutation suite on Firefox — should fix the 19 failures
3. Run full mutation suite on webkit — assess improvement
4. Consider adding Firefox to CI if it passes reliably

## Risks and Gotchas

- **`asChild` / `Slot` pattern**: Radix's `Slot` is used in `button.tsx`, `sidebar.tsx`, `form.tsx`, and `item.tsx`. Base UI has its own equivalent but the API may differ slightly. Check the shadcn Base UI variant for how this is handled.
- **`cmdk` (command palette)**: The `command.tsx` component wraps `cmdk` which has its own dialog integration. May need special handling.
- **`vaul` (drawer)**: The drawer uses `vaul`, not Radix directly. Leave it as-is unless it has Radix peer deps.
- **Local customizations**: Some UI components may have been customized beyond the shadcn defaults. Diff carefully before overwriting.
- **CSS `data-state` selectors**: If any Tailwind classes target `data-[state=open]` or similar Radix-specific attributes, they may need updating for Base UI equivalents.

## Estimated Effort

- Phase 0 (prep): 15 minutes
- Phase 1 (regenerate components): 2-3 hours (mostly mechanical, with careful diffing)
- Phase 2 (custom components): 30 minutes
- Phase 3 (cleanup): 15 minutes
- Phase 4 (test pass): 30 minutes

Total: ~half a day
