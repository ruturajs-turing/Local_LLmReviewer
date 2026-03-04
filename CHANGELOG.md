# LLM-Reviewer Changelog

## Latest Updates (January 2026)

### 5. Harbor Version Updates (P0)

Major changes to support Harbor version tasks:

**Removed:**
- **I) SFT Notebook check** - Not applicable for Harbor tasks (no .ipynb files)

**Added:**
- **H) Task Metadata (task.toml)** - Validates required metadata fields:
  - `[metadata]`: author_name, author_email, difficulty, category, tags, time estimates
  - `[verifier]`: timeout_sec
  - `[agent]`: timeout_sec
  - `[environment]`: build_timeout_sec, cpus, memory_mb, storage_mb

- **K) Model Run Summary** - Aggregated pass/fail stats from `model-run-logs/`:
  - Reads `model-run-logs/<model>/result.json` (aggregated, not individual runs)
  - Extracts: n_trials, passed, failed, pass_rate
  - Flags: crashes (n_errors > 0), exceptions, 0% pass rate, 100% pass rate
  - No LLM call needed - pure data extraction

- **K) Trajectory Analysis (Cheating Detection)** - Checks `trajectory.json` for agent peeking at solution files:
  - Parses `model-run-logs/<model>/<run-id>/agent/trajectory.json`
  - Detects forbidden commands: `cat solve.sh`, `cat solution/*`, `vim/nano solve.sh`, etc.
  - **Always shows status** for each model:
    - `✓ TRAJECTORY ANALYSIS: X runs checked - No cheating detected`
    - `🚨 TRAJECTORY ANALYSIS: CHEATING DETECTED (N instances)`
  - Flags each cheating instance with run ID, step, and command
  - **VERDICT: ❌ FAIL** if any cheating detected

- **K) Failure Analysis (Per Model)** - LLM analyzes worst run's failures for EACH model:
  - Finds the worst run for each model separately (from ctrf.json)
  - Creates separate analysis section for each model (e.g., hunyuan, claude-opus)
  - Extracts failed test names, traces, and messages
  - LLM classifies each failure as: VALID, AMBIGUOUS, or UNFAIR
  - Output format:
    ```
    ========================================
    MODEL: hunyuan-2.0-thinking-dev-preview
    ========================================
    Worst Run: <run-id>
    Failed: X/Y tests
    
    [LLM analysis of failures]
    
    ========================================
    MODEL: claude-opus-4-5
    ========================================
    ...
    ```

- **Final Verdict Logic:**
  - `❌ FAIL` - Cheating detected
  - `⚠️ REVIEW NEEDED` - Errors/crashes, 0% pass rate, or <20% pass rate
  - `✓ PASS` - Normal distribution or 100% pass rate

**Files modified:** `Code.gs` - Major restructure for Harbor compatibility

---

### 4. Humane Prompt Mode (M Criterion Update)

Modified **M) Instruction-Test Alignment** to support humane prompts.

**Problem:** 100% of tasks failed M criterion because tests check implementation details not explicitly stated in human-readable prompts.

**Solution:** Tiered severity classification:

| Severity | Effect | Examples |
|----------|--------|----------|
| CRITICAL | FAIL | Undisclosed files, secret requirements, hidden traps |
| MINOR | PASS (noted) | Standard library usage, format details from examples |
| ACCEPTABLE | PASS | Industry standards, domain conventions |

**New behavior:**
- PASS if no CRITICAL issues (MINOR issues are noted but don't fail)
- FAIL only for truly hidden/malicious requirements
- Accepts that humane prompts imply industry standards

**Files modified:** `Code.gs` - `llmPromptM_InstructionAlignment_()` (STAGE 4 evaluation)

---

### 1. Model Detection (Malpractice Detection)

Enhanced **A) PROMPT** and **J) FORCED GATES** to detect model-specific malpractice.

**What it detects:**
- `TB_MODEL`, `MODEL`, `OPENAI_MODEL` environment variable checks
- `FAIL_MODELS` blocklists
- `_detect_model_name()` functions
- Conditional failures based on model identity
- Model-specific language in instruction.md (e.g., "only Claude will understand this")

**Files modified:** `Code.gs` - `llmPromptA_()`, `llmPromptJ_()`

---

### 2. Dimension Reviewer (Decoupled Mode)

New feature to review individual files without uploading a full ZIP.

**Available Dimensions:**

| Dimension | Required Files |
|-----------|----------------|
| A) Prompt Alignment | instruction.md, Dockerfile, solve.sh |
| B) Tests Validation | instruction.md, test_state.py |
| M) Instruction-Test Alignment | instruction.md, test_state.py |
| G) Solution Alignment | instruction.md, Dockerfile, solve.sh |
| E) Dockerfile Review | instruction.md, Dockerfile |
| J) Forced Gates | test_state.py, test.sh |

**How to use:**
1. Select dimension from dropdown
2. Upload required files
3. Click "Run Dimension Review"
4. Get Google Doc with review

**Files modified:** `Code.gs` - `runDimensionReview()`, `index.html` - Dimension Reviewer UI

---

### 3. Environment Folder Upload

New feature for **A) Prompt Alignment** to upload the entire `environment/` folder.

**Purpose:** Verify that files mentioned in instruction.md actually exist in the environment folder.

**How it works:**
- Only accepts folders named "environment"
- Excludes Dockerfile (uploaded separately)
- Excludes hidden files, `__pycache__`, `.pyc`
- Preserves full paths (e.g., `environment/src/trainer.py`)
- LLM sees all file contents for verification

**Files modified:** `Code.gs` - `llmPromptA_WithSrc_()`, `index.html` - folder upload handler

---

## Previous Updates

- Removed D) CLEAN DIRECTORY
- Removed H) MODEL-RUN-LOGS
- Strengthened F) test.sh: exact-match vs default, plus existing checks
- New H) DOCKER-COMPOSE: exact-match vs default
