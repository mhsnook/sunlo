# Interface Design Process Summary

This document outlines a structured approach for exploring multiple interface designs for a chosen module using parallel sub-agents.

## Core Methodology

The process follows "Design It Twice" principles, recognizing that initial concepts rarely prove optimal. It uses consistent architectural vocabulary from companion documents (LANGUAGE.md, DEEPENING.md, CONTEXT.md).

## Three-Step Workflow

**Step 1: Frame the Problem**
Present users with a grounded explanation covering constraints, dependencies, and illustrative code sketches—without proposing solutions. This allows users to think while work proceeds in parallel.

**Step 2: Spawn Sub-Agents**
Launch 3+ agents with distinct design briefs, each optimizing for different priorities:

- Minimalist approach (1–3 entry points, maximum leverage)
- Flexible approach (many use cases, extensibility)
- Pragmatic approach (optimize common caller patterns)
- Ports & adapters approach (cross-seam dependencies)

Each agent delivers interface specifications, usage examples, implementation details, dependency strategies, and trade-off analysis.

**Step 3: Present and Compare**
Sequentially show designs, then compare by depth, locality, and seam placement. Provide opinionated recommendations, potentially proposing hybrids combining strong elements from multiple designs.

This methodology emphasizes exploration grounded in project-specific vocabulary and coupling patterns.
