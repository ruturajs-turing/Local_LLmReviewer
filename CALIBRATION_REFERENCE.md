# Harbor LLM Reviewer \- Calibration Reference Document

## Overview

This document describes how we calibrated the LLM Reviewer for **Harbor version** tasks by analyzing sample tasks from `terminal-bench-2.0`. The goal was to optimize the reviewer to correctly evaluate tasks with **humane (natural language) prompts** while maintaining quality standards.

---

## Sample Tasks Used for Calibration

### Source Repository

- **Repository:** `https://github.com/laude-institute/terminal-bench-2.git`  
- **Organization:** Tasks organized by difficulty (easy/medium/hard) based on `task.toml`

### Selected Calibration Tasks (20 Total)

#### Medium Difficulty (10 Tasks)

| Task | Domain | Key Characteristics |
| :---- | :---- | :---- |
| `build-cython-ext` | Systems | Dockerfile only, build-focused |
| `code-from-image` | Data Processing | Image file input (code.png) |
| `financial-document-processor` | Data Processing | Multiple documents (PDFs, JPGs) |
| `headless-terminal` | Application Dev | Python source file |
| `modernize-scientific-stack` | Scientific | Nested src folder with data |
| `pytorch-model-cli` | Machine Learning | Complex deps (C files, model, image) |
| `pytorch-model-recovery` | Machine Learning | Dataset and weights files |
| `rstan-to-pystan` | Scientific | R to Python conversion, CSV files |
| `tune-mjcf` | Scientific | XML model files |
| `vulnerable-secret` | Security | C source file |

#### Hard Difficulty (10 Tasks)

| Task | Domain | Key Characteristics |
| :---- | :---- | :---- |
| `bn-fit-modify` | Scientific Computing | Bayesian network, Dockerfile only |
| `circuit-fibsqrt` | Hardware | Gates file, nested tests |
| `dna-assembly` | Bioinformatics | FASTA sequence file |
| `feal-differential-cryptanalysis` | Cryptography | Python \+ C files |
| `llm-inference-batching-scheduler` | ML Infra | Complex nested structure |
| `make-doom-for-mips` | Systems | Game-related deps |
| `model-extraction-relu-logits` | ML Security | Model extraction task |
| `sam-cell-seg` | Computer Vision | Images \+ metadata CSV |
| `sparql-university` | Knowledge Graphs | TTL graph files |
| `write-compressor` | Systems | Rust \+ C source files |

---

## Calibration Observations & Prompt Evolution

### Observation 1: Test File Naming Conventions

**Reference Tasks:** `build-cython-ext`, `code-from-image`, `bn-fit-modify`, `sparql-university`, `write-compressor`

**What We Observed:**

```
tasks-2.0/medium/
└── */tests/
    └── test_outputs.py  ← Terminal-bench-2.0 format

tasks-2.0/hard/
└── */tests/
    └── test_outputs.py  ← Consistent across difficulties
```

**Calibration Applied:**

- Updated file extraction regex to support both `test_outputs.py` and `test_state.py` formats  
- Prompts reference the appropriate test file based on task version

**Affected Prompts:** A, B, E, J, L, M (all test-related prompts)

---

### Observation 2: Humane Prompt Style

**Reference Tasks:** `pytorch-model-recovery`, `dna-assembly`, `headless-terminal`, `tune-mjcf`, `make-doom-for-mips`

**What We Observed:**

```
# Example Humane Instruction (from pytorch-model-recovery)
"You are provided with a corrupted PyTorch model weights file. Your task 
is to recover the original model architecture and restore the weights 
to produce valid predictions..."

# Example Humane Instruction (from dna-assembly)
"You have a set of DNA sequences in FASTA format. Assemble them into 
a complete genome sequence..."

vs

# Traditional Robotic Instruction
"1. Open file X
 2. Implement function Y with signature Z
 3. Write output to path W"
```

**Calibration Applied:** Added **HUMANE PROMPT STYLE CHECK** to Prompt A:

```javascript
"✅ HUMANE PROMPT CHARACTERISTICS (should have MOST of these):\n" +
"- Natural, conversational language ('You have a...', 'Your task is to...')\n" +
"- Describes the GOAL/WHAT, not step-by-step HOW\n" +
"- Uses context and background to explain the problem\n" +
"- Allows flexibility in implementation approach\n" +
"- Reads like a message from a colleague, not a spec document\n"
```

**Affected Prompt:** `llmPromptA_` (Prompt A \- Instruction Validation)

---

### Observation 3: Tests Verify Implied Requirements

**Reference Tasks:** `bn-fit-modify`, `pytorch-model-recovery`, `dna-assembly`, `feal-differential-cryptanalysis`, `model-extraction-relu-logits`

**What We Observed:**

- Tests check data structures standard for the domain (e.g., pandas DataFrames)  
- Tests verify numeric precision experts would expect  
- Tests validate formulas that are the obvious choice for the task  
- Tests check file formats implied by output type

**Example from `bn-fit-modify`:**

```py
# Instruction says: "Save edges to learned_dag.csv"
# Test checks: expected_columns = ["from", "to"]
# This is IMPLIED - standard CSV format for graph edges
```

**Calibration Applied:** Updated **Prompt B** to HUMANE PROMPT MODE:

```javascript
"=== ACCEPT AS VALID (DO NOT FLAG) ===\n" +
"- Tests checking data structures/formats that are standard for the domain\n" +
"- Tests verifying numeric precision/behavior that experts would expect\n" +
"- Tests checking file naming conventions implied by the output type\n" +
"- Tests validating intermediate steps that are necessary for final output\n" +
"- Tests verifying formulas/algorithms that are the obvious choice for the task\n"
```

**Affected Prompt:** `llmPromptB_` (Prompt B \- Test Alignment)

---

### Observation 4: Environment Folder Structure

**Reference Tasks:** `pytorch-model-cli`, `llm-inference-batching-scheduler`, `sam-cell-seg`, `financial-document-processor`, `rstan-to-pystan`

**What We Observed:**

```
environment/
├── Dockerfile
├── src/           ← Nested source folders
├── task_file/
│   └── input_data/
│       └── requests.jsonl
└── resources/
    └── demo_metadata.csv
```

**Calibration Applied:** Added **Environment File Validation** to Prompt A:

- Check if INPUT files exist in environment/ folder  
- Accept files generated by Dockerfile (git clone, RUN commands)  
- Accept nested folder structures

```javascript
"FILE RULES:\n" +
"- INPUT files must exist in environment/ OR be generated by Dockerfile\n" +
"- OUTPUT files (agent creates them) are OK if not present\n" +
"- Files generated during Docker build (git clone, compile) PASS\n"
```

**Affected Prompt:** `llmPromptA_` with `getEnvironmentFiles_()` function

---

### Observation 5: Subprocess Usage in Tests

**Reference Tasks:** `headless-terminal`, `modernize-scientific-stack`, `vulnerable-secret`, `circuit-fibsqrt`

**What We Observed:**

- Tests legitimately use `subprocess.run()` to execute and validate outputs  
- Used for running compiled binaries, scripts, and validation commands
- Previous restriction was too strict for modern task formats

**Calibration Applied:**

- Removed blanket ban on `subprocess.run`, `Popen`, `os.system` from Prompt B  
- Only flag if tests directly execute `solve.sh`

**Affected Prompt:** `llmPromptB_`

---

### Observation 6: Trajectory Analysis for Model Runs

**Reference Tasks:** All calibration tasks with model-run-logs

**What We Observed:**

When reviewing model run logs, we needed to:
1. **Validate failures**: Determine if a model's failure was VALID (task is hard but fair) or INVALID (task has hidden requirements)
2. **Detect cheating**: Check if a passed model cheated by peeking at `solve.sh` or test files

**Calibration Applied:** Added **Trajectory Analysis** section (K):

**For WORST Run (Failure Validation):**
```javascript
"CLASSIFICATION:\n" +
"- VALID FAILURE: Task is hard but fair, instruction provides necessary info\n" +
"- AMBIGUOUS: Instruction could be clearer about what's being tested\n" +
"- UNFAIR FAILURE: Test checks something not mentioned in instructions\n"
```

**For BEST Run (Cheating Check):**
```javascript
"FORBIDDEN COMMANDS (automatic CHEATED):\n" +
"- cat solve.sh | cat /solution/* | cat /app/solution/*\n" +
"- head/tail/less/more/view on solve.sh\n" +
"- cat test_state.py | cat test_outputs.py | cat tests/*.py\n" +
"- cp solve.sh | source solve.sh\n"
```

**Key Design Decision:** The cheating analysis focuses ONLY on **shell commands executed in the trajectory**, not on what appears in prompts/context. This prevents false positives from confusing prompt content with model actions.

**Output Format:**
```
--- WORST RUN (Failure Validation) ---
Run ID: xxx
Failed: X/Y tests
Trajectory: Available
[LLM Analysis]
VERDICT: ✓ PASS / ✗ FAIL / ⚠️ REVIEW

--- BEST RUN (Cheating Check) ---
Run ID: yyy
Passed: X/Y tests
[LLM Analysis]
VERDICT: ✓ CLEAN / ✗ CHEATED / ⚠️ SUSPICIOUS
```

**Affected Functions:**
- `llmPromptK_FailureAnalysis_` - Analyzes worst run with trajectory
- `llmPromptK_CheatingAnalysis_` - Analyzes best run for forbidden commands
- `getModelRunSummary_` - Tracks best/worst runs and stores trajectory content

---

## Final Calibrated Prompts Summary

| Prompt | Function | Key Calibrations |
| :---- | :---- | :---- |
| **A** | `llmPromptA_` | Humane style check, environment file validation, malpractice check |
| **B** | `llmPromptB_` | Accept implied requirements, removed subprocess restriction |
| **C** | `llmPromptC_` | Slug naming validation (unchanged) |
| **E** | `llmPromptE_` | Dockerfile validation with leaky copy detection |
| **F** | `llmPromptF_` | test.sh validation |
| **G** | `llmPromptG_` | solve.sh validation |
| **H** | `llmPromptH_` | task.toml metadata validation |
| **J** | `llmPromptJ_` | Model gating detection |
| **K (Failure)** | `llmPromptK_FailureAnalysis_` | Worst run analysis with trajectory, VALID/INVALID failure classification |
| **K (Cheating)** | `llmPromptK_CheatingAnalysis_` | Best run cheating detection via shell command analysis |
| **M** | `llmPromptM_` | Instruction-test alignment (humane mode ready) |

---

## Configuration Updates

### Issue Tracking Sheet

```javascript
var ISSUE_SHEET_ID = "18IVqltNnia4ifAx9I15ohQrQm6Zai-EVApOjb_AJrN8"; 
var ISSUE_SHEET_NAME = "Harbor_Issues";
```

### Test File Support

```javascript
// Supports both formats
var testsPy = findEntry_(entries, /(^|\/)tests\/(test_state|test_outputs)\.py$/i);
```

### Trajectory Analysis Data Structures

```javascript
// Worst run tracking (most failures)
worstRunPerModel = {
  "model-name": {
    runId: "run-uuid",
    model: "model-name",
    totalTests: 20,
    passedCount: 15,
    failedCount: 5,
    failureOutput: "pytest output...",
    trajectoryContent: "agent trajectory JSON..."
  }
};

// Best run tracking (all tests passed)
bestRunPerModel = {
  "model-name": {
    runId: "run-uuid",
    model: "model-name",
    totalTests: 20,
    passedCount: 20,
    failedCount: 0,
    trajectoryContent: "agent trajectory JSON..."
  }
};
```

---

## References

- **Task Source Repository:** `https://github.com/laude-institute/terminal-bench-2.git`
- **Calibration Tasks Location:** `/tasks-2.0/medium/` and `/tasks-2.0/hard/`
