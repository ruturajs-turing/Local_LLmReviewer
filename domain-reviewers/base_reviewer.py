"""
Base reviewer class that handles LLM API calls, score parsing, and the
common review workflow. Domain-specific reviewers subclass this and
provide their own prompt augmentations.
"""

from __future__ import annotations

import json
import logging
import time
from abc import ABC, abstractmethod
from pathlib import Path

import config
from score_schema import TaskScore, QDResult, parse_scores_from_llm
from task_loader import load_task, task_summary
from prompts.qd_checks import SYSTEM_HEADER, QD_REGISTRY, build_qd_user_content

logger = logging.getLogger("domain-reviewer")


class BaseReviewer(ABC):
    """Abstract base for all domain reviewers."""

    domain_name: str = "generic"
    domain_display: str = "Generic"

    @abstractmethod
    def domain_qq_prompt(self) -> str:
        """Extra QQ evaluation rules specific to this domain."""
        ...

    @abstractmethod
    def domain_tq_prompt(self) -> str:
        """Extra TQ evaluation rules specific to this domain."""
        ...

    @abstractmethod
    def domain_tc_prompt(self) -> str:
        """Extra TC evaluation rules specific to this domain."""
        ...

    @abstractmethod
    def calibration_examples(self) -> str:
        """Client calibration examples for this domain."""
        ...

    # ── LLM integration ────────────────────────────────────────────────────

    def _call_llm(self, system: str, user: str) -> str:
        for attempt in range(1, config.MAX_RETRIES + 1):
            try:
                if config.LLM_PROVIDER == "anthropic":
                    return self._call_anthropic(system, user)
                else:
                    return self._call_openai(system, user)
            except Exception as e:
                is_rate_limit = "rate" in str(e).lower() or "429" in str(e)
                if is_rate_limit:
                    wait = 2 ** attempt
                    logger.warning("Rate limited, retrying in %ds (attempt %d/%d)", wait, attempt, config.MAX_RETRIES)
                    time.sleep(wait)
                elif attempt == config.MAX_RETRIES:
                    raise
                else:
                    logger.warning("LLM call failed: %s — retrying (%d/%d)", e, attempt, config.MAX_RETRIES)
                    time.sleep(1)
        raise RuntimeError("LLM call failed after all retries")

    def _call_anthropic(self, system: str, user: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        resp = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        if not resp.content:
            raise ValueError("Empty response from Anthropic")
        return resp.content[0].text.strip()

    def _call_openai(self, system: str, user: str) -> str:
        import openai
        client = openai.OpenAI(api_key=config.OPENAI_API_KEY, base_url=config.OPENAI_BASE_URL)
        resp = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            timeout=config.REQUEST_TIMEOUT,
        )
        return resp.choices[0].message.content.strip()

    # ── System prompt ──────────────────────────────────────────────────────

    def _system_prompt(self) -> str:
        return f"""You are a thorough and fair technical reviewer for Terminal-Bench Harbor tasks, specialized in the **{self.domain_display}** domain.

CALIBRATION: Be strict but fair. Do not inflate scores, but also do not penalize for minor issues that don't affect task usability. A score of 7+ means good quality with no critical problems. Most well-constructed tasks should be able to reach 6-7 if they have no major issues.

Your job is to evaluate task quality on three client-aligned axes (1-10 scale each):

1. **qq — Question Quality**: Evaluate instruction.md for clarity, self-consistency, completeness, humane style, file references, and domain appropriateness.
   - 9-10: Flawless humane prompt, zero contradictions, all files referenced, no ambiguity
   - 7-8: Mostly humane, minor clarity gaps, no critical contradictions
   - 5-6: Some ambiguity, scattered rules, partial contradictions or missing file refs
   - 3-4: Self-contradictory, step-by-step spec style, missing key information
   - 1-2: Malpractice (PII, model-specific language, solution references)

2. **tq — Test Quality**: Evaluate test_outputs.py for correctness, docstrings, assertion precision, forbidden patterns.
   - 9-10: All tests have docstrings, zero forbidden patterns, assertions are precise and value-checking
   - 7-8: 90%+ docstrings, no forbidden patterns, assertions mostly precise
   - 5-6: Some generic docstrings, weak assertions (key-exists only), minor issues
   - 3-4: Many missing docstrings, brittle keyword checks, hidden requirements, vacuous assertions
   - 1-2: Model gating, raw raise, solution leakage, fundamentally broken tests

3. **tc — Test Coverage**: Cross-check EVERY instruction requirement against test assertions. Count untested requirements.
   - 9-10: Every instruction requirement tested with actual value assertions, boundary cases covered
   - 7-8: 90%+ bidirectional coverage, most numeric values asserted
   - 5-6: Format/structure tested but core logic gaps, some untested requirements
   - 3-4: Tests only verify output format/shape, core algorithm NOT tested at all
   - 1-2: No meaningful coverage, tests are decorative

SCORE GUIDELINES (apply penalties proportionally — these are guidelines, not hard caps):

1. **VACUOUS / ALWAYS-PASS ASSERTIONS**: "assert True" in fallback branches, "pass"-only bodies, tautological assertions:
   → Apply -3 to tq (e.g., if otherwise 7, score 4). Only cap at ≤3 if MOST tests are vacuous.

2. **INCOMPLETE TESTS**: Placeholder "pass" with no assertions, "TODO" comments:
   → Apply -3 to tq. Cap at ≤2 only if MAJORITY of tests are incomplete.

3. **REGEX-ONLY UI TESTS**: For visual tasks with no browser tests (only regex on source code):
   → Apply -2 to tq, -2 to tc. Note: if tests use Playwright/Puppeteer, do NOT penalize.

4. **FORMAT-ONLY TESTING**: Tests only check output shape/keys but never verify computed values:
   → Apply -2 to tc. Only cap at ≤4 if NO test checks any computed value.

5. **LOOSE TOLERANCES**: Overly generous numeric tolerances:
   → Apply -1 to tq. Minor issue unless tolerances are absurdly loose.

6. **LENIENT ASSERTIONS**: Broad pattern matches instead of precise value checks:
   → Apply -1 to tq. Many tasks legitimately use substring checks for text output.

7. **SELF-CONTRADICTORY INSTRUCTIONS**: Internal contradictions in instruction.md:
   → Apply -2 to qq. Cap at ≤4 only for clear, irreconcilable contradictions.

8. **UNDISCLOSED TEST REQUIREMENTS**: Tests check things not mentioned in instruction.md OR any file it references:
   → Apply -1 to tq ONLY if tests enforce requirements with NO connection to instruction.md or its referenced spec files.
   Note: requirements from files referenced by instruction.md (report_requirements.md, design-spec.txt,
   prorules.txt, game_manual.txt, output-format.txt, etc.) are DISCLOSED, not hidden.
   Implied requirements from domain expertise are also OK.

9. **CORE ALGORITHM UNTESTED**: Tests never verify the core computation result:
   → Apply -2 to tc. Cap at ≤4 only if tests are purely decorative.

10. **MISSING RENDERING/BROWSER TESTS**: For frontend/UI/games tasks without browser tests:
    → Apply -2 to tc. Note: this only applies to visual/interactive categories.

STRICT CALIBRATION — 50 out of 294 tasks (17%) were flagged by the client. Use these REAL scores as anchors:
- games-development: 11 flagged, avg scores qq=5.8, tq=5.9, tc=4.2 — WORST domain overall
- frontend-development: 10 flagged, avg scores qq=6.3, tq=5.2, tc=4.6
- scientific-computing: 5 flagged, typical issues: loose tolerances, few coverage points
- machine-learning: 3 flagged, key issue: instruction contradicts data
- algorithm-design: 3 flagged, key issue: self-contradictory problem statements
- mathematics: 2 flagged, key issue: format-only testing (no value assertions → tc=3)
- model-training: 2 flagged, key issue: structure-only testing (no computed values → tc=4-5)
- security: 2 flagged, key issue: core algorithm untested (any output passes → tc=5)

CRITICAL CLIENT SCORE EXAMPLES (use for calibration — match these closely):
- mahjong-medium: qq=4, tq=3, tc=3 (contradictory rules + dead code in tests)
- chess-best-move-medium: qq=4, tq=5, tc=3 (duplicate FEN, single move depth)
- number-theory-explorer-medium: qq=7, tq=4, tc=3 (format-only, zero value assertions)
- vanilla-to-react-typescript-medium: qq=5, tq=3, tc=3 (regex-only, no browser)
- warehouse-inventory-reconciliation: qq=6, tq=4, tc=4 (CRITICAL — ~10/16 tests run identical logic)
- typescript-props-generator: qq=6, tq=4, tc=3 (CRITICAL — dead code + no assertions)
- kanban-board-hard: qq=6, tq=4, tc=5 (CRITICAL — no DnD/WIP/filter verification)

SEVERITY-VERDICT ALIGNMENT:
When test logic is DUPLICATED (>60% identical assertion patterns), cap tq at 4.
When the client flagged a task as "critical" severity, the LLM avg should be ≤5.0.
Tests that check source code keywords without running the app → tq ≤ 5, tc ≤ 5.

TOP 6 PROBLEM PATTERNS (ranked by frequency in client feedback):
1. No rendering/browser tests (20 tasks) — UI/frontend tests use regex on source code
2. Insufficient test scenarios/edge cases (11 tasks) — single dataset, hardcoded pass
3. Contradictory instructions/data mismatch (8 tasks) — instruction vs actual data
4. Format-only validation (7 tasks) — correct structure passes without correct values
5. Overly loose tolerances (4 tasks) — rtol=0.1, atol=10.0 allow wrong answers
6. Bugs in test code (3 tasks) — operator precedence errors, dead code, empty assertions

CLIENT CROSS-CUTTING THEMES:
A. Missing visual/rendering tests → tq & tc penalty for UI categories
B. Weak/vacuous assertions (assert True, pass-only tests) → tq ≤ 3
C. Problem description contradictions/vagueness → qq ≤ 5
D. Core algorithm untested (format passes, logic unchecked) → tc ≤ 5
E. Homogeneous test scenarios (all same type, hardcoded pass) → tc ≤ 4
F. Test logic repetitive (copy-pasted assertion patterns) → tq -2

{self.calibration_examples()}

You MUST output ONLY a JSON object with these fields:
{{
  "qq": <int 1-10>,
  "tq": <int 1-10>,
  "tc": <int 1-10>,
  "core_issue": "<one sentence describing the most critical problem>",
  "qq_details": "<brief reasoning for qq score, citing specific issues>",
  "tq_details": "<brief reasoning for tq score, citing specific test functions>",
  "tc_details": "<brief reasoning for tc score, listing untested requirements>"
}}

Do NOT output anything before or after the JSON object."""

    # ── Build the user prompt ──────────────────────────────────────────────

    def _build_user_prompt(self, task: dict) -> str:
        sections = []

        sections.append(f"# Task: {task['folder_name']}")
        sections.append(f"Category: {task['category']} | Difficulty: {task['difficulty']}")
        sections.append("")

        if task.get("task_toml_raw"):
            sections.append("## task.toml")
            sections.append("```toml")
            sections.append(task["task_toml_raw"])
            sections.append("```\n")

        if task.get("instruction_md"):
            sections.append("## instruction.md")
            sections.append("```markdown")
            sections.append(task["instruction_md"])
            sections.append("```\n")

        if task.get("test_code"):
            sections.append(f"## tests/{task.get('test_filename', 'test_outputs.py')}")
            sections.append("```python")
            sections.append(task["test_code"])
            sections.append("```\n")

        if task.get("test_sh"):
            sections.append("## tests/test.sh")
            sections.append("```bash")
            sections.append(task["test_sh"])
            sections.append("```\n")

        if task.get("solve_sh"):
            sections.append("## solution/solve.sh")
            sections.append("```bash")
            sections.append(task["solve_sh"])
            sections.append("```\n")

        if task.get("dockerfile"):
            sections.append("## environment/Dockerfile")
            sections.append("```dockerfile")
            sections.append(task["dockerfile"])
            sections.append("```\n")

        if task.get("env_files"):
            sections.append("## Environment files present")
            sections.append(", ".join(task["env_files"]))
            sections.append("")

        if task.get("_msource") and task.get("env_file_contents"):
            sections.append("## Environment File Contents (--msource deep review)")
            sections.append(
                "Below are the actual contents of data/config/rule files from "
                "the environment/ directory. Use these to cross-reference against "
                "instruction.md claims and test assertions.\n"
            )
            total_chars = 0
            max_total = 120_000
            for ef in task["env_file_contents"]:
                if total_chars >= max_total:
                    sections.append(
                        f"*(remaining files truncated to stay within prompt limits)*\n"
                    )
                    break
                name = ef["name"]
                content = ef["content"]
                budget = max_total - total_chars
                if len(content) > budget:
                    content = content[:budget] + "\n... (truncated)"
                ext = Path(name).suffix.lower()
                lang = {
                    ".py": "python", ".sh": "bash", ".json": "json",
                    ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
                    ".csv": "csv", ".sql": "sql", ".r": "r",
                    ".js": "javascript", ".ts": "typescript",
                    ".xml": "xml", ".html": "html", ".css": "css",
                }.get(ext, "")
                sections.append(f"### environment/{name} ({ef['size']} bytes)")
                sections.append(f"```{lang}")
                sections.append(content)
                sections.append("```\n")
                total_chars += len(content)

        for supp in task.get("supplementary_files", []):
            sections.append(f"## {supp['name']}")
            sections.append("```")
            sections.append(supp["content"] or "(empty)")
            sections.append("```\n")

        if task.get("model_run_dirs"):
            sections.append("## Model Run Logs")
            for run in task["model_run_dirs"]:
                sections.append(f"- {run['name']}: result={'present' if run['has_result'] else 'MISSING'}")
            sections.append("")

        # Domain-specific evaluation instructions
        sections.append("## Domain-Specific Evaluation Rules")
        sections.append(f"Domain: **{self.domain_display}**\n")
        sections.append("### Question Quality — Domain Checks")
        sections.append(self.domain_qq_prompt())
        sections.append("")
        sections.append("### Test Quality — Domain Checks")
        sections.append(self.domain_tq_prompt())
        sections.append("")
        sections.append("### Test Coverage — Domain Checks")
        sections.append(self.domain_tc_prompt())
        sections.append("")

        if task.get("_msource"):
            sections.append("## MATERIAL SOURCE REVIEW (--msource enabled)")
            sections.append(
                "You have been given the FULL CONTENTS of the environment files above. "
                "Use them to perform deeper analysis:\n"
                "1. **Data-Instruction Consistency**: Do column names, schemas, values in the "
                "data files match what instruction.md describes? Flag mismatches.\n"
                "2. **Test-Data Alignment**: Do test assertions reference values that actually "
                "exist in the environment data? Are expected outputs derivable from the input?\n"
                "3. **Hidden Dependencies**: Do tests or instruction rely on specific data "
                "properties (row counts, unique values, ranges) that aren't documented?\n"
                "4. **Rule File Completeness**: If rule/config files exist, do they cover all "
                "cases instruction.md mentions?\n\n"
                "Include an `env_analysis` field in your JSON output summarizing these findings."
            )
            sections.append("")

        sections.append("Now evaluate this task and return ONLY the JSON scores object.")

        return "\n".join(sections)

    # ── QD checks (ported from Code.gs) ──────────────────────────────────

    def _run_single_qd(self, qd_id: str, task: dict) -> QDResult:
        """Run a single QD check and return structured result."""
        qd_info = QD_REGISTRY[qd_id]

        has_required = all(task.get(f) for f in qd_info["required_files"])
        if not has_required:
            missing = [f for f in qd_info["required_files"] if not task.get(f)]
            return QDResult(
                qd_id=qd_id,
                qd_name=qd_info["name"],
                score="PASS_WITH_WARNING",
                issues=[f"Skipped: missing files {missing}"],
                summary=f"QD-{qd_id} skipped due to missing files",
            )

        user_content = build_qd_user_content(qd_id, task)
        rubric = qd_info["rubric"]
        full_user = f"{rubric}\n\n{user_content}"

        try:
            raw = self._call_llm(SYSTEM_HEADER, full_user)
        except Exception as e:
            logger.error("QD-%s LLM call failed: %s", qd_id, e)
            return QDResult(
                qd_id=qd_id,
                qd_name=qd_info["name"],
                score="PASS_WITH_WARNING",
                issues=[f"LLM call failed: {e}"],
                summary=f"QD-{qd_id} check failed due to API error",
            )

        score_val = "PASS"
        issues = []
        summary = ""

        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > 0:
                parsed = json.loads(raw[start:end])
                score_val = parsed.get("score", "PASS").upper().replace(" ", "_")
                if score_val not in ("PASS", "PASS_WITH_WARNING", "FAIL"):
                    score_val = "FAIL" if "FAIL" in score_val else "PASS"
                issues = parsed.get("issues", [])
                if isinstance(issues, str):
                    issues = [issues] if issues else []
                summary = parsed.get("summary", "")
            else:
                upper_raw = raw.upper()
                if "FAIL" in upper_raw:
                    score_val = "FAIL"
                elif "WARNING" in upper_raw:
                    score_val = "PASS_WITH_WARNING"
                summary = raw[:200]
        except (json.JSONDecodeError, KeyError):
            upper_raw = raw.upper()
            if "FAIL" in upper_raw:
                score_val = "FAIL"
            elif "WARNING" in upper_raw:
                score_val = "PASS_WITH_WARNING"
            summary = raw[:200]

        return QDResult(
            qd_id=qd_id,
            qd_name=qd_info["name"],
            score=score_val,
            issues=issues,
            summary=summary,
            raw_response=raw[:2000],
        )

    def _run_qd_checks(self, task: dict) -> list[QDResult]:
        """Run all applicable QD checks for the task."""
        results = []
        for qd_id in ("A", "B", "C", "E", "F", "G", "H", "J", "M"):
            logger.info("  Running QD-%s (%s)...", qd_id, QD_REGISTRY[qd_id]["name"])
            result = self._run_single_qd(qd_id, task)
            results.append(result)
            status = "PASS" if result.passed else "FAIL"
            logger.info("  QD-%s: %s — %s", qd_id, status, result.summary[:80] if result.summary else "(no summary)")
        return results

    # ── Main review method ─────────────────────────────────────────────────

    def _apply_qd_score_adjustments(
        self, qq: int, tq: int, tc: int, qd_results: list[QDResult]
    ) -> tuple[int, int, int, list[str]]:
        """Apply QD failure penalties as score reductions (not hard caps).

        Philosophy: QD failures are signals, not overrides. They penalize
        scores proportionally rather than capping everything to 5.
        Only truly critical issues (model gating, malpractice) get hard caps.
        """
        adjustments: list[str] = []
        qd_map = {r.qd_id: r for r in qd_results}

        # QD-J failure (Forced Gates / Model Gating) → hard cap, this is malpractice
        if qd_map.get("J") and qd_map["J"].is_blocker:
            adjustments.append(f"QD-J FAIL: tq capped {tq}→1 (model gating detected)")
            tq = 1

        # QD-A failure (Instruction Quality) → -1 penalty on qq
        if qd_map.get("A") and qd_map["A"].is_blocker:
            penalty = min(2, max(1, qq - 5))
            if qq > 4:
                adjustments.append(f"QD-A FAIL: qq reduced {qq}→{qq - penalty} (instruction issues)")
                qq -= penalty

        # QD-B failure (Tests Quality) → -1 penalty on tq
        if qd_map.get("B") and qd_map["B"].is_blocker:
            penalty = min(2, max(1, tq - 5))
            if tq > 4:
                adjustments.append(f"QD-B FAIL: tq reduced {tq}→{tq - penalty} (test issues)")
                tq -= penalty

        # QD-G failure (solve.sh) → -1 on qq (leakage/hardcoding)
        if qd_map.get("G") and qd_map["G"].is_blocker:
            if qq > 5:
                adjustments.append(f"QD-G FAIL: qq reduced {qq}→{qq - 1} (solve.sh issues)")
                qq -= 1

        # QD-M failure (Instruction-Test Alignment) → -1 on tc, -1 on tq
        if qd_map.get("M") and qd_map["M"].is_blocker:
            if tc > 4:
                adjustments.append(f"QD-M FAIL: tc reduced {tc}→{tc - 1} (alignment gaps)")
                tc -= 1
            if tq > 5:
                adjustments.append(f"QD-M FAIL: tq reduced {tq}→{tq - 1} (undisclosed reqs)")
                tq -= 1

        # QD-E failure (Dockerfile) → -1 on qq (minor)
        if qd_map.get("E") and qd_map["E"].is_blocker:
            if qq > 5:
                adjustments.append(f"QD-E FAIL: qq reduced {qq}→{qq - 1}")
                qq -= 1

        # QD-H failure (Metadata) → -1 on qq (minor)
        if qd_map.get("H") and qd_map["H"].is_blocker:
            if qq > 5:
                adjustments.append(f"QD-H FAIL: qq reduced {qq}→{qq - 1}")
                qq -= 1

        # Clamp to valid range
        qq = max(1, min(10, qq))
        tq = max(1, min(10, tq))
        tc = max(1, min(10, tc))

        return qq, tq, tc, adjustments

    def review(self, task_dir: str, run_qd: bool = True, msource: bool = False) -> TaskScore:
        """Review a single task directory and return scored result."""
        task = load_task(task_dir)
        if msource:
            task["_msource"] = True
        logger.info("Reviewing: %s", task_summary(task))

        # Phase 1: QD checks (from Code.gs)
        qd_results = []
        if run_qd:
            logger.info("Phase 1: Running QD checks...")
            qd_results = self._run_qd_checks(task)
            failed_qds = [r for r in qd_results if r.is_blocker]
            if failed_qds:
                logger.warning(
                    "  %d QD check(s) FAILED: %s",
                    len(failed_qds),
                    ", ".join(f"QD-{r.qd_id}" for r in failed_qds),
                )

        # Phase 2: Client-aligned scoring (qq/tq/tc)
        logger.info("Phase 2: Running client-aligned scoring (qq/tq/tc)...")
        system = self._system_prompt()
        user = self._build_user_prompt(task)

        raw = self._call_llm(system, user)
        logger.debug("LLM response:\n%s", raw)

        try:
            scores = parse_scores_from_llm(raw)
        except (ValueError, json.JSONDecodeError) as e:
            logger.warning("First parse attempt failed: %s — retrying with simplified prompt", e)
            retry_prompt = (
                "Your previous response could not be parsed. "
                "Please respond with ONLY a valid JSON object, nothing else:\n"
                '{"qq": <int 1-10>, "tq": <int 1-10>, "tc": <int 1-10>, '
                '"core_issue": "<one sentence>"}\n\n'
                f"Original task: {task['slug']} ({task['category']})"
            )
            try:
                raw2 = self._call_llm(system, retry_prompt)
                scores = parse_scores_from_llm(raw2)
                logger.info("Retry parse succeeded")
            except (ValueError, json.JSONDecodeError, Exception) as e2:
                logger.error("Retry also failed: %s", e2)
                return TaskScore(
                    task_name=task["slug"],
                    category=task["category"],
                    qq=0,
                    tq=0,
                    tc=0,
                    core_issue=f"PARSE ERROR: {e}",
                    details={"raw_response": raw, "difficulty": task.get("difficulty", "")},
                    qd_results=qd_results,
                )

        qq, tq, tc = scores["qq"], scores["tq"], scores["tc"]

        # Phase 3: Apply QD-based score adjustments
        if qd_results:
            qq, tq, tc, adjustments = self._apply_qd_score_adjustments(qq, tq, tc, qd_results)
            if adjustments:
                logger.info("Phase 3: QD score adjustments applied:")
                for adj in adjustments:
                    logger.info("  → %s", adj)
                scores["qd_adjustments"] = adjustments

        core_issue = scores["core_issue"]

        detail_keys = ["qq_details", "tq_details", "tc_details", "qd_adjustments"]
        if task.get("_msource"):
            detail_keys.append("env_analysis")
        details = {
            k: scores.get(k, "")
            for k in detail_keys
            if scores.get(k)
        }
        details["difficulty"] = task.get("difficulty", "")
        if task.get("_msource"):
            details["msource"] = True
            details["env_files_analyzed"] = len(task.get("env_file_contents", []))

        return TaskScore(
            task_name=task["slug"],
            category=task["category"],
            qq=qq,
            tq=tq,
            tc=tc,
            core_issue=core_issue,
            details=details,
            qd_results=qd_results,
        )
