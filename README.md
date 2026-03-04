# Domain-Specific LLM Reviewer

A Python-based task quality reviewer that uses GPT-5.2 to evaluate Terminal-Bench tasks across 22 domains. Produces structured scores (qq, tq, tc), runs 9 Quality Dimension checks, performs false-positive scanning, and generates comprehensive reports.

---

## Setup

### 1. Install dependencies

```bash
pip install openai openpyxl google-auth google-api-python-client
```

### 2. Set API keys

```bash
# Required — OpenAI API key
export OPENAI_API_KEY="sk-..."

# Optional — Google Drive service account (for CSV/GDrive mode)
export GDRIVE_SA_FILE="/path/to/service-account.json"

# Optional — override model (default: gpt-5.2)
export REVIEWER_MODEL="gpt-5.2"
```

### 3. Verify setup

```bash
cd domain-reviewers/
python3 -c "from config import OPENAI_API_KEY; print('Key set:', bool(OPENAI_API_KEY))"
```

---

## Usage

### Review tasks from a domain CSV (downloads from GDrive)

```bash
# Sequential (1 task at a time)
python3 review_batch.py --csv /path/to/algorithm-design.csv --batch "algo-review" --output ./outputs

# Parallel (4 concurrent workers — 3-4x faster)
python3 review_batch.py --csv /path/to/algorithm-design.csv --batch "algo-review" --output ./outputs --workers 4
```

### Review local task directories

```bash
# Single or multiple task paths
python3 review_batch.py --paths /path/to/task1 /path/to/task2

# All tasks in a directory
python3 review_batch.py --dir /path/to/tasks/
```

### Review from a GDrive folder

```bash
python3 review_batch.py --gdrive-folder-id <FOLDER_ID> --batch "batch-name" --output ./outputs
```

### Skip QD checks (faster, scoring only)

```bash
python3 review_batch.py --csv /path/to/tasks.csv --batch "quick-review" --no-qd
```

### Skip false-positive scanning

```bash
python3 review_batch.py --csv /path/to/tasks.csv --batch "strict-review" --no-fp
```

### Include environment/material source files in prompt

```bash
python3 review_batch.py --paths /path/to/task --msource
```

### Use Anthropic instead of OpenAI

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python3 review_batch.py --paths /path/to/task --provider anthropic --model claude-sonnet-4-6
```

### Full command with all options

```bash
python3 review_batch.py \
  --csv /path/to/domain.csv \
  --batch "week5-algorithm-design" \
  --output ./outputs \
  --workers 4 \
  --msource \
  --verbose
```

---

## CLI Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--csv` | | Path to domain CSV with GDrive links | — |
| `--paths` | | One or more local task directory paths | — |
| `--dir` | | Directory containing multiple tasks | — |
| `--gdrive-folder-id` | | Google Drive folder ID with task ZIPs | — |
| `--output` | `-o` | Output directory for reports | `./outputs/` |
| `--batch` | `-b` | Batch name for report filenames | CSV stem |
| `--domain` | `-d` | Filter to a specific domain | all |
| `--workers` | `-w` | Number of parallel review workers | `1` |
| `--no-qd` | | Skip Quality Dimension checks | off |
| `--no-fp` | | Skip false-positive scan | off |
| `--msource` | | Include environment files in LLM prompt | off |
| `--verbose` | `-v` | Enable debug logging | off |
| `--model` | | Override LLM model | `gpt-5.2` |
| `--provider` | | LLM provider (`openai` or `anthropic`) | `openai` |
| `--api-key` | | Override API key at runtime | env var |
| `--custom-url` | | Custom API endpoint URL | — |

---

## Output Structure

```
outputs/
├── <batch-name>/
│   ├── csv/
│   │   ├── <batch>_task_scores.csv
│   │   └── <batch>_summary.csv
│   ├── markdown/
│   │   └── <batch>_report.md
│   ├── excel/
│   │   └── <batch>_report.xlsx
│   ├── per-task/
│   │   ├── task-name-1.md          ← individual review doc (for trainer upload)
│   │   ├── task-name-2.md
│   │   └── ...
│   └── fp/
│       ├── <batch>_fp_report.md    ← false-positive scan results
│       └── <batch>_fp_report.csv
└── master_review_results.csv       ← appended across all runs
```

---

## Review Pipeline

The reviewer runs a 3-phase pipeline:

### Phase 1: Download & Extract
- Reads task links from CSV
- Downloads ZIPs from Google Drive (using service account)
- Extracts and locates task files (`task.toml`, `instruction.md`, `tests/`)

### Phase 2: Review (per task)
- **QD Checks** (9 quality dimensions): A, B, C, E, F, G, H, J, M
- **Scoring**: qq (question quality), tq (test quality), tc (test coverage) — each 1-10
- **Verdict**: APPROVED (all ≥7) / CONDITIONAL (≥5) / REJECTED (<5 or QD-J fail)

### Phase 3: False-Positive Scan
- Re-evaluates REJECTED and CONDITIONAL tasks
- Checks if the initial failure was too harsh
- Can upgrade verdicts (REJECTED→CONDITIONAL, CONDITIONAL→APPROVED)

---

## Supported Domains (22)

| Domain | Registry Key |
|--------|-------------|
| Algorithm Design | `algorithm-design` |
| Application Development | `application-development` |
| Build & Deployment | `build-deployment` / `build-and-deployment` |
| Data Analysis | `data-analysis` |
| Data Preprocessing | `data-preprocessing` |
| Data Querying | `data-querying` |
| Data Science | `data-science` |
| Debugging | `debugging` |
| File Operations | `file-operations` |
| File System | `file-system` |
| Frontend Development | `frontend-development` |
| Games Development | `games-development` |
| Machine Learning | `machine-learning` |
| Mathematics | `mathematics` |
| Model Training | `model-training` |
| Personal Assistant | `personal-assistant` |
| Protocol Analysis | `protocol-analysis` |
| Scientific Computing | `scientific-computing` |
| Security | `security` |
| Software Engineering | `software-engineering` |
| System Administration | `system-administration` |
| UI/UX Optimization | `ui-ux-optimization` |

---

## CSV Format

The input CSV should have these columns:

```
task_name,task_id,uuid,domain,email,reviewer,turing_task_url,labeling_tool_link,status,link,Difficulty,Week
```

The key columns used:
- `task_name` — display name
- `domain` — domain for reviewer selection
- `link` — Google Drive link to the task ZIP

---

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 8-10 | Excellent — meets or exceeds standards |
| 7 | Good — approval threshold |
| 5-6 | Needs improvement — conditional |
| 3-4 | Poor — significant issues |
| 1-2 | Critical — fundamental problems |

### Verdict Logic

- **APPROVED**: qq ≥ 7, tq ≥ 7, tc ≥ 7
- **CONDITIONAL**: min(qq, tq, tc) ≥ 5, or min ≥ 4 with overall ≥ 5.0
- **REJECTED**: any score ≤ 2, or QD-J (model gating) failure

---

## Per-Task Review Documents

Each reviewed task gets an individual Markdown report in `outputs/<batch>/per-task/<task-name>.md` containing:
- Verdict banner and score card
- Core issue summary
- Detailed analysis per dimension (qq, tq, tc)
- QD checks table with pass/fail
- Recommendations for improvement

Trainers can upload these `.md` files alongside their task submissions.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GDRIVE_SA_FILE` | For CSV mode | Path to Google service account JSON |
| `REVIEWER_MODEL` | No | Model override (default: `gpt-5.2`) |
| `OPENAI_BASE_URL` | No | Custom API endpoint |
