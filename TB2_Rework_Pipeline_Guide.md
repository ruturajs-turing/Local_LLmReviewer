# TB 2.0 — Rework Pipeline Guide

**Project:** Terminal-Bench 2.0 (Harbor)
**Version:** 1.0
**Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Client Feedback Summary](#2-client-feedback-summary)
3. [Rework Pipeline — Step by Step](#3-rework-pipeline--step-by-step)
4. [Using the Local LLM Reviewer](#4-using-the-local-llm-reviewer)
5. [Rework Status Options](#5-rework-status-options)
6. [Submission Guidelines](#6-submission-guidelines)
7. [Validation Commands](#7-validation-commands)
8. [Common Issue Patterns & Fixes](#8-common-issue-patterns--fixes)
9. [Examples of Completed Reworks](#9-examples-of-completed-reworks)
10. [FAQ](#10-faq)

---

## 1. Overview

The client has reviewed 294 tasks across three weekly batches and flagged **50 tasks** (17%) as low-quality. These tasks need to be reworked and resubmitted in a new batch.

**Rework goal:** Fix the specific issues the client identified so the task meets the quality bar:
- All three scores (qq, tq, tc) must be **> 5**
- Three-dimension average must be **> 6**
- No critical QD failures (model gating, contradictory instructions, etc.)

**Important:** Reworked tasks MUST keep the **same UUID** as the original task. Do NOT create a new task ID.

---

## 2. Client Feedback Summary

### 2.1 Quality Dimensions

| Dimension | Full Name | What It Measures |
|-----------|-----------|-----------------|
| **qq** | Question Quality | Is the instruction clear, complete, non-contradictory? |
| **tq** | Test Quality | Do tests verify actual behavior, not just format? |
| **tc** | Test Coverage | Are all requirements tested, including edge cases? |

### 2.2 Flagging Criteria

A task is flagged if **either** condition is true:

| Condition | Example |
|-----------|---------|
| Any single dimension ≤ 5 | qq=8, tq=7, **tc=5** → Flagged |
| Three-dimension average ≤ 6 | qq=6, tq=6, tc=6 → avg=6.0 → Flagged |

### 2.3 Severity Levels

| Severity | Count | Criteria | Action |
|----------|:-----:|----------|--------|
| **Critical** | 13 | Average ≤ 5 or any dimension ≤ 3 | Must rework — significant changes needed |
| **Serious** | 27 | Average 5.1–6.0 or any dimension = 4–5 | Must rework — targeted fixes needed |
| **Moderate** | 10 | Average 6.1–6.5 with one dimension at 5 | Review and fix — minor improvements needed |

### 2.4 Flagged Tasks by Domain

| Domain | Flagged | Key Issue |
|--------|:-------:|-----------|
| Games Development | 11 | Homogeneous test scenarios, missing edge cases |
| Frontend Development | 10 | No browser/rendering tests, regex-only matching |
| Scientific Computing | 5 | Tolerances too loose, too few coverage points |
| Machine Learning | 3 | Instruction contradicts actual data |
| Algorithm Design | 3 | Self-contradictory problem statements |
| Mathematics | 2 | Tests verify format only, not numerical values |
| Model Training | 2 | Tests verify structure only, not computed values |
| Personal Assistant | 2 | Incomplete tests (pass-only), vacuous assertions |
| Security | 2 | Core security algorithm completely untested |
| Data Science | 2 | Rules scattered across multiple files |
| Others (7 domains) | 7 | Various — see task-specific feedback |

### 2.5 Top 6 Problem Patterns

These are the most frequent issues across all 50 flagged tasks. **Check your task against every pattern.**

| # | Pattern | Count | Description | How to Fix |
|---|---------|:-----:|-------------|------------|
| 1 | **No rendering/browser tests** | 20 | Frontend/UI tests use regex on source code instead of Playwright/Puppeteer | Add Playwright browser tests that verify rendered DOM |
| 2 | **Insufficient test scenarios** | 11 | Single dataset, homogeneous scenarios, hardcoded values pass | Add diverse test inputs, edge cases, adversarial scenarios |
| 3 | **Contradictory instructions** | 8 | instruction.md contradicts the actual data or code | Cross-check every claim in instruction against actual files |
| 4 | **Format-only validation** | 7 | Tests check JSON keys/CSV columns but not actual values | Add value-level assertions for every computed result |
| 5 | **Overly loose tolerances** | 4 | rtol=0.1 or atol=10.0 allows wrong answers to pass | Tighten tolerances (rtol ≤ 0.01, atol context-appropriate) |
| 6 | **Bugs in test code** | 3 | Operator precedence errors, dead code, empty assertions | Review test code for `assert True`, `pass`-only functions, dead branches |

---

## 3. Rework Pipeline — Step by Step

### Step 1: Receive Rework Assignment

You will receive:
- The **task name** and **UUID** (e.g., `ff5016e5-...-rummikub-medium`)
- The **client feedback** (specific issues flagged)
- The **LLM reviewer report** (per-task .md document with scores and details)

### Step 2: Review the Feedback

Read the client feedback and LLM reviewer report carefully. Understand:
- Which dimension(s) scored low (qq, tq, tc)
- What specific issues were found
- Which QD checks failed

### Step 3: Assess Reworkability

Before starting, determine if the task can be reworked:

| Decision | Criteria | Action |
|----------|----------|--------|
| **Reworkable** | Issues are fixable (add tests, fix instruction, add edge cases) | Proceed to Step 4 |
| **Not Reworkable** | Task is fundamentally flawed (premise is wrong, domain mismatch, impossible to test) | Mark as "Rework Not Possible" with detailed reason |

### Step 4: Make Changes

Fix the identified issues. Common fixes by pattern:

| If the issue is... | Then you need to... |
|---------------------|---------------------|
| Missing edge cases | Add more test scenarios covering boundary/adversarial inputs |
| Contradictory instruction | Rewrite instruction.md to be consistent with actual data/code |
| Regex-only tests (frontend) | Replace with Playwright browser tests, update Dockerfile |
| Format-only validation | Add value-level assertions (`assert result["value"] == expected`) |
| Loose tolerances | Tighten rtol/atol to scientifically appropriate values |
| Incomplete tests | Complete all test functions (no `pass`-only or `assert True`) |
| Scattered rules | Consolidate all rules into one clear section in instruction.md |

### Step 5: Run the Local LLM Reviewer

Run the local reviewer on your fixed task to verify improvements:

```bash
cd /path/to/LLm-Reviewer/domain-reviewers

python review_batch.py --paths /path/to/your-task-directory
```

Check the per-task review document at:
```
outputs/<batch>/per-task/<task-name>.md
```

**Target scores:** All three dimensions (qq, tq, tc) should be ≥ 6, with average > 6.

### Step 6: Run Validation (Oracle + Model Runs)

```bash
# Step 6a: Oracle run (MUST pass 100%)
harbor run -p /path/to/task -a oracle

# Step 6b: Hunyuan run
harbor run -p /path/to/task -a terminus-2 \
  -m openai/hunyuan-2.0-thinking-dev-preview \
  --ak api_base=https://api.hunyuan.cloud.tencent.com/v1/ \
  -k 10 -n 4 -r 3

# Step 6c: Claude run (Hard tasks only)
harbor run -p /path/to/task -a terminus-2 \
  -m anthropic/claude-opus-4-5 \
  -k 16 -n 4 -r 3
```

**Expected results:**

| Difficulty | Oracle | Hunyuan | Claude |
|------------|--------|---------|--------|
| Medium | 100% pass | ≤ 20% pass (not 0%) | N/A |
| Hard | 100% pass | 0% pass (all fail) | > 0% and ≤ 12.5% |

### Step 7: Prepare Submission

Package your reworked task:

1. **Keep the same UUID** in the folder name
2. Rename oracle logs to `golden-solution-log/`
3. Include all model run logs
4. Include the LLM reviewer per-task report (.md file)
5. ZIP the task directory (without `.DS_Store` and `__MACOSX`)

```bash
cd /path/to/task-parent
zip -r task-name.zip task-folder/ -x "*/.DS_Store" -x "*/__MACOSX/*"
```

### Step 8: Submit with Status

Upload the ZIP to Google Drive and update the tracking sheet with your **rework status** (see Section 5).

---

## 4. Using the Local LLM Reviewer

### 4.1 Setup

```bash
# Install dependencies
pip install openai openpyxl google-auth google-api-python-client

# Set API key
export OPENAI_API_KEY=sk-...

# Optional: Set Google Drive service account (for CSV/GDrive mode)
export GDRIVE_SA_FILE=/path/to/service-account.json
```

### 4.2 Review a Single Task

```bash
cd /path/to/LLm-Reviewer/domain-reviewers

# Review one task directory
python review_batch.py --paths /path/to/your-task

# Review with verbose output
python review_batch.py --paths /path/to/your-task -v

# Skip QD checks (faster, scores only)
python review_batch.py --paths /path/to/your-task --no-qd

# Skip false-positive scan
python review_batch.py --paths /path/to/your-task --no-fp
```

### 4.3 Review Multiple Tasks

```bash
# Review all tasks in a directory
python review_batch.py --dir /path/to/tasks-folder/

# Review from a domain CSV (downloads from GDrive)
python review_batch.py --csv /path/to/domain-list.csv --batch "Rework-Batch-1"

# Parallel review (4 concurrent workers)
python review_batch.py --csv /path/to/domain-list.csv --workers 4
```

### 4.4 Output Structure

After running, reports are saved at:

```
outputs/
├── <batch-name>/
│   ├── csv/                    # Score CSVs
│   ├── markdown/               # Batch review report
│   ├── excel/                  # Color-coded Excel workbook
│   ├── per-task/               # Individual per-task review documents
│   │   ├── task-name-1.md      # ← Upload THIS with your submission
│   │   ├── task-name-2.md
│   │   └── ...
│   └── fp/                     # False-positive scan results
└── master_review_results.csv   # Cumulative tracking across all runs
```

### 4.5 Per-Task Review Document

Each per-task `.md` file contains:

| Section | Description |
|---------|-------------|
| **Header** | Task name, domain, difficulty, review date |
| **Verdict** | APPROVED / CONDITIONAL / REJECTED |
| **Scores** | qq, tq, tc with /10 ratings |
| **Core Issue** | One-sentence summary of the biggest problem |
| **Detailed Analysis** | Full reasoning for each dimension |
| **QD Checks** | All 9 quality dimension checks with PASS/FAIL |
| **Recommendations** | Actionable fix suggestions |

**Trainers should upload this document alongside their reworked task submission.**

---

## 5. Rework Status Options

When updating your rework status in the tracking sheet, use one of these four options:

### Option 1: Completed and Fixed

| Field | Value |
|-------|-------|
| **Status** | `Completed and Fixed` |
| **When to use** | All flagged issues have been resolved. Oracle passes 100%. Model runs meet thresholds. LLM reviewer scores meet the quality bar. |
| **Required evidence** | Per-task review document (.md), oracle log, model run logs |
| **Reason** | Brief summary of what was changed (e.g., "Added 27 edge case scenarios, replaced regex with Playwright tests") |

### Option 2: In Progress

| Field | Value |
|-------|-------|
| **Status** | `In Progress` |
| **When to use** | You are actively working on the rework but it is not yet complete. |
| **Required evidence** | None yet |
| **Reason** | Brief note on current progress (e.g., "Rewriting tests with Playwright, 60% done") |

### Option 3: Rework Not Possible

| Field | Value |
|-------|-------|
| **Status** | `Rework Not Possible` |
| **When to use** | The task cannot be meaningfully fixed due to fundamental design issues. |
| **Required evidence** | Detailed explanation of why the task cannot be reworked |
| **Reason** | Must include a specific, technical justification. Examples below. |

**Valid reasons for "Rework Not Possible":**

| Reason | Example |
|--------|---------|
| Task premise is fundamentally flawed | "The problem is mathematically undefined — the constraint set has no feasible solution" |
| Domain mismatch | "Task requires GPU/hardware not available in the Docker environment" |
| Cannot be tested | "The task outcome is non-deterministic and cannot be reliably verified" |
| Scope exceeds rework | "Fixing this requires rebuilding the entire task from scratch (new dataset, new instruction, new tests) — effectively a new task" |

**Invalid reasons (these should be fixed, not rejected):**

| Invalid Reason | What to do instead |
|----------------|-------------------|
| "Tests are hard to write" | Write the tests — that's the rework |
| "Instruction is too long" | Shorten and consolidate — that's the rework |
| "I don't know the domain" | Ask for reassignment to someone with domain expertise |

### Option 4: Fixed — Needs Review

| Field | Value |
|-------|-------|
| **Status** | `Fixed — Needs Review` |
| **When to use** | You've made changes but want a reviewer to verify before final submission. |
| **Required evidence** | Per-task review document, description of changes made |
| **Reason** | Summary of changes and any areas of uncertainty |

---

## 6. Submission Guidelines

### 6.1 Critical Rules

| Rule | Details |
|------|---------|
| **Keep the same UUID** | The reworked task MUST use the exact same UUID as the original. Do NOT generate a new UUID. Example: `ff5016e5-a26d-4cb4-8d97-05acd0f66594-terminal-bench-rummikub-medium` |
| **Include reviewer report** | Upload the per-task `.md` file from the local LLM reviewer |
| **Fresh model logs** | Model run logs must be from YOUR reworked version, not the old task |
| **Oracle must pass** | 100% oracle pass rate is mandatory — no exceptions |
| **ZIP cleanly** | Exclude `.DS_Store`, `__MACOSX`, `__pycache__`, `.git` |

### 6.2 Folder Structure

Your reworked task ZIP should contain:

```
<uuid>-terminal-bench-<slug>-<difficulty>/
├── instruction.md                  # Fixed/improved instruction
├── task.toml                       # Task metadata
├── Dockerfile                      # Updated if needed
├── test.sh                         # Updated if needed
├── solution/
│   └── solve.sh                    # Updated solution
├── tests/
│   ├── test_outputs.py             # Fixed/improved tests
│   └── test_state.py               # (if applicable)
├── environment/                    # Task environment files
├── golden-solution-log/            # Renamed oracle logs
├── model-run-logs/                 # Fresh model run logs
│   ├── hunyuan-2.0-thinking-dev-preview/
│   └── claude-opus-4-5/            # (Hard tasks only)
└── review-report.md                # Per-task LLM reviewer document
```

### 6.3 Submission Checklist

Before submitting, verify:

- [ ] UUID matches the original task
- [ ] instruction.md addresses the client's specific feedback
- [ ] tests/test_outputs.py fixes the identified test quality issues
- [ ] Oracle passes 100%
- [ ] Hunyuan meets threshold (Medium: ≤20% not 0% | Hard: 0%)
- [ ] Claude meets threshold (Hard only: >0% and ≤12.5%)
- [ ] LLM reviewer report shows improved scores (all dimensions > 5, avg > 6)
- [ ] Model run logs are fresh (from your reworked version)
- [ ] ZIP is clean (no .DS_Store, __MACOSX, __pycache__)

---

## 7. Validation Commands

### 7.1 Oracle Run (Required — Must Pass 100%)

```bash
harbor run -p /path/to/task -a oracle
```

After passing, rename the logs:
```bash
mv /path/to/logs golden-solution-log/
```

### 7.2 Hunyuan Run (Required for All Tasks)

```bash
harbor run -p /path/to/task -a terminus-2 \
  -m openai/hunyuan-2.0-thinking-dev-preview \
  --ak api_base=https://api.hunyuan.cloud.tencent.com/v1/ \
  -k 10 -n 10 -r 3
```

**Troubleshooting:** If you get "model can't be mapped" → use StarVPN → Mumbai server → retry.

### 7.3 Claude Run (Required for Hard Tasks Only)

```bash
harbor run -p /path/to/task -a terminus-2 \
  -m anthropic/claude-opus-4-5 \
  -k 16 -n 8 -r 3
```

### 7.4 Docker Cleanup (If Running Low on Resources)

```bash
docker system prune -af --volumes
```

---

## 8. Common Issue Patterns & Fixes

### 8.1 Frontend/UI Tasks — "No Rendering Tests"

**Problem:** Tests use regex/string matching on source code files instead of browser-based rendering tests.

**Fix:**

1. Add Playwright to the Dockerfile:
```dockerfile
RUN pip install playwright==1.49.1
RUN playwright install chromium --with-deps
```

2. Rewrite tests to use Playwright:
```python
from playwright.sync_api import sync_playwright

def test_app_renders():
    """Verify the app renders correctly in a real browser."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000")
        assert page.locator("#app").is_visible()
        browser.close()
```

3. Update `task.toml` timeout (Playwright needs more time — typically 2000–3000s).

4. Update instruction.md to mention browser-based testing.

### 8.2 Games Tasks — "Homogeneous Scenarios"

**Problem:** All test scenarios are the same type (e.g., all runs, no groups, no draws).

**Fix:**

1. Add diverse scenario types:
   - Different solution types (runs AND groups for card games)
   - Edge cases (empty hand, ties, draws, boundary values)
   - Adversarial inputs (inputs that break naive implementations)

2. Add at least **10+ diverse test scenarios** across multiple categories.

3. Ensure a hardcoded answer CANNOT pass all tests.

### 8.3 Algorithm Tasks — "Self-Contradictory Problem"

**Problem:** The problem statement contains logical contradictions.

**Fix:**

1. Read every constraint and every example carefully.
2. Verify each constraint is consistent with all examples.
3. Remove or rewrite contradictory statements.
4. Add clarifying examples for ambiguous cases.

### 8.4 Math/Science Tasks — "Format-Only Testing"

**Problem:** Tests only check output structure (JSON keys, file format) without verifying computed values.

**Fix:**

1. For EVERY computed result, add a value-level assertion:
```python
# BAD: Format-only
assert "eigenvalues" in result
assert len(result["eigenvalues"]) == 3

# GOOD: Value-level
assert result["eigenvalues"][0] == pytest.approx(3.14159, rel=1e-4)
assert result["eigenvalues"][1] == pytest.approx(2.71828, rel=1e-4)
```

2. For deterministic computations (fixed seed), assert EXACT values.

3. Tighten tolerances:
   - Scientific computing: `rtol ≤ 0.01`
   - Mathematical proofs: exact equality
   - ML metrics: `rtol ≤ 0.05`

---

## 9. Examples of Completed Reworks

### Example 1: Rummikub (Games Development — Medium)

| Aspect | Before | After |
|--------|--------|-------|
| **Client flag** | "5 scenarios but homogeneous — no DRAW, no groups" | |
| **Scenarios** | 5 (all runs, all solvable) | 32 across 5 files |
| **Solution types** | Single best set | Multi-set play (runs, groups, mixed) |
| **Edge cases** | None | 4 DRAW scenarios, empty hand, tiebreakers |
| **Oracle** | 100% | 100% |
| **Hunyuan** | — | 10% (within medium threshold) |
| **Status** | `Completed and Fixed` | |

### Example 2: Vanilla to React TypeScript (Frontend — Medium)

| Aspect | Before | After |
|--------|--------|-------|
| **Client flag** | "Jest + jsdom tests don't catch real rendering issues" | |
| **Test framework** | Jest + RTL (jsdom) | Playwright (real Chromium) |
| **Test count** | ~15 static + 1 runtime | ~15 static + ~30 browser tests |
| **Coverage** | Headings, form, add/delete | + search, filter, sort, preview, empty state |
| **Build tool** | create-react-app | Vite |
| **Oracle** | 100% | 100% |
| **Hunyuan** | 20% | 10% (harder tests → lower SOTA) |
| **Status** | `Completed and Fixed` | |

### Example 3: Analytics Dashboard Token Migration (UI/UX — Hard)

| Aspect | Before | After |
|--------|--------|-------|
| **Client flag** | "Static regex tests don't validate real browser behavior" | |
| **Tests** | Regex/string matching | Playwright (live DOM, computed styles) |
| **QA guidance** | None | Added `update.txt` documenting pitfalls |
| **Timeout** | 600s | 3000s (Playwright needs more time) |
| **Oracle** | 100% | 100% |
| **Hunyuan** | — | 0% (hard threshold met) |
| **Opus** | — | 12.5% (hard threshold met) |
| **Status** | `Completed and Fixed` | |

---

## 10. FAQ

### Q: Can I change the UUID of a reworked task?
**A: No.** The reworked task MUST keep the exact same UUID. This is critical for tracking and matching the rework to the original submission.

### Q: What if my reworked task still doesn't pass the LLM reviewer?
**A:** Review the per-task report carefully. Focus on the lowest-scoring dimension first. If you're stuck, ask your pod lead for guidance.

### Q: What if the oracle fails after my changes?
**A:** Your changes broke the solution. Check `solve.sh` — it must produce output that passes all tests. Debug by running the oracle with `--no-delete` flag to inspect the container.

### Q: What if Hunyuan passes too much (> 20% for medium)?
**A:** Your tests may be too easy. Add more edge cases, tighten assertions, or add more complex test scenarios.

### Q: What if Hunyuan passes 0% for a medium task?
**A:** Your task may be too hard for medium difficulty, or there might be an environment issue. Check if the model can actually access the required tools/data. If the task is genuinely too hard, consider whether it should be reclassified as hard.

### Q: How do I know which model run logs to include?
**A:** Include ONLY logs from your reworked version. Do NOT reuse old model run logs — the client will verify that logs match the reworked tests.

### Q: What if I think the client feedback is wrong?
**A:** Document your reasoning in the "Reason" field and mark as `Fixed — Needs Review`. Include evidence (test outputs, LLM reviewer scores) to support your case.

### Q: Where do I upload my reworked task?
**A:** Upload the ZIP to Google Drive and update the tracking sheet with your rework status, the Drive link, and the reason/summary.

---

*Document maintained by: TB 2.0 QA Team*
*For questions, contact your pod lead.*
