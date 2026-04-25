# ADR Format Overview

This guide describes how to create and maintain Architecture Decision Records (ADRs) in a `docs/adr/` directory using sequential numbering.

## Core Structure

ADRs follow a minimal template: a short title plus 1-3 sentences explaining the context, decision, and rationale. As the guide notes, "The value is in recording _that_ a decision was made and _why_" rather than exhaustive documentation.

## When ADRs Matter

Record a decision as an ADR only when all three conditions apply:

1. **Hard to reverse** — changing course later carries real costs
2. **Surprising without context** — future readers will question the approach
3. **Result of trade-offs** — genuine alternatives existed and one was chosen deliberately

Examples of decisions worth documenting include architectural choices, technology selections with lock-in potential, integration patterns between system components, and deliberate deviations from conventional approaches that might otherwise appear as bugs to future maintainers.

## Optional Enhancements

Status frontmatter, considered options, and consequences sections should only appear when they genuinely add value. Most ADRs won't require all elements.
