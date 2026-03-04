"""
Client-aligned scoring schema for the Domain-Specific LLM Reviewer.

The client scores tasks on three axes, each 1-10:
  qq — Question Quality  (instruction.md clarity, consistency, completeness)
  tq — Test Quality      (test correctness, docstrings, no forbidden patterns)
  tc — Test Coverage     (tests verify the CORE logic, not just format/structure)

This module defines the rubric bands, the data classes for scores, and helpers.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field


# ── Rubric bands (1-10) ────────────────────────────────────────────────────

QQ_RUBRIC = {
    (9, 10): "Excellent — natural humane prompt, zero contradictions, all files referenced, no ambiguity.",
    (7, 8): "Good — mostly humane, minor clarity gaps, no critical contradictions.",
    (5, 6): "Mediocre — some ambiguity, scattered rules, partial contradictions or missing file refs.",
    (3, 4): "Poor — self-contradictory, step-by-step spec style, missing key information.",
    (1, 2): "Failed — malpractice, PII, model-specific language, or fundamentally broken prompt.",
}

TQ_RUBRIC = {
    (9, 10): "Excellent — all tests have docstrings, zero forbidden patterns, assertions are precise.",
    (7, 8): "Good — 90%+ docstrings, no forbidden patterns, assertions mostly precise.",
    (5, 6): "Mediocre — some generic docstrings, weak assertions (key-exists only), minor issues.",
    (3, 4): "Poor — many missing docstrings, brittle keyword checks, hidden requirements.",
    (1, 2): "Failed — model gating, raw raise, solution leakage, or fundamentally broken tests.",
}

TC_RUBRIC = {
    (9, 10): "Excellent — every instruction requirement tested, core algorithm verified with values, boundary cases covered.",
    (7, 8): "Good — 90%+ bidirectional coverage, most numeric values asserted, minor gaps.",
    (5, 6): "Mediocre — format/structure tested but core logic gaps, some untested requirements.",
    (3, 4): "Poor — tests only verify output format/shape, core algorithm NOT tested at all.",
    (1, 2): "Failed — no meaningful coverage, tests are decorative.",
}


def rubric_description(rubric: dict, score: int) -> str:
    for (lo, hi), desc in rubric.items():
        if lo <= score <= hi:
            return desc
    return "Invalid score"


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass
class QDResult:
    """Result from a single Quality Dimension check (A, B, C, E, F, G, H, J, M)."""

    qd_id: str
    qd_name: str
    score: str  # PASS / PASS_WITH_WARNING / FAIL
    issues: list[str] = field(default_factory=list)
    summary: str = ""
    raw_response: str = ""

    @property
    def passed(self) -> bool:
        return self.score in ("PASS", "PASS_WITH_WARNING")

    @property
    def is_blocker(self) -> bool:
        return self.score == "FAIL"


@dataclass
class TaskScore:
    """Scores for a single task, aligned with the client's table format."""

    task_name: str
    category: str
    qq: int  # Question Quality 1-10
    tq: int  # Test Quality 1-10
    tc: int  # Test Coverage 1-10
    core_issue: str  # One-sentence summary like client uses
    details: dict = field(default_factory=dict)
    qd_results: list[QDResult] = field(default_factory=list)

    @property
    def overall(self) -> float:
        return round((self.qq + self.tq + self.tc) / 3, 1)

    @property
    def qd_pass_count(self) -> int:
        return sum(1 for r in self.qd_results if r.passed)

    @property
    def qd_fail_count(self) -> int:
        return sum(1 for r in self.qd_results if r.is_blocker)

    @property
    def qd_summary(self) -> str:
        if not self.qd_results:
            return "No QD checks"
        passed = self.qd_pass_count
        total = len(self.qd_results)
        failed_ids = [r.qd_id for r in self.qd_results if r.is_blocker]
        if failed_ids:
            return f"{passed}/{total} passed (FAILED: {', '.join(failed_ids)})"
        return f"{passed}/{total} passed"

    @property
    def verdict(self) -> str:
        # QD-J (model gating) is an auto-reject — malpractice
        critical_blockers = {"J"}
        has_critical_blocker = any(
            r.is_blocker and r.qd_id in critical_blockers
            for r in self.qd_results
        )
        if has_critical_blocker:
            return "REJECTED"

        # Many QD failures (4+) with low scores → REJECTED
        # Aligns with client "critical" severity tasks
        if self.qd_fail_count >= 4 and self.overall <= 5.0:
            return "REJECTED"

        if self.qq >= 7 and self.tq >= 7 and self.tc >= 7:
            return "APPROVED"
        if any(s <= 2 for s in (self.qq, self.tq, self.tc)):
            return "REJECTED"

        # Any score <=3 with overall <=5 → REJECTED
        if any(s <= 3 for s in (self.qq, self.tq, self.tc)) and self.overall <= 5.0:
            return "REJECTED"

        if min(self.qq, self.tq, self.tc) >= 5:
            return "CONDITIONAL"
        if min(self.qq, self.tq, self.tc) >= 4 and self.overall >= 5.0:
            return "CONDITIONAL"
        return "REJECTED"

    def to_csv_row(self, index: int) -> list:
        return [
            index,
            self.category,
            self.task_name,
            self.qq,
            self.tq,
            self.tc,
            self.overall,
            self.qd_summary,
            self.core_issue,
        ]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["overall"] = self.overall
        d["verdict"] = self.verdict
        d["qd_summary"] = self.qd_summary
        return d


@dataclass
class CategorySummary:
    """Aggregated scores for a domain category (client Table 3 format)."""

    category: str
    count: int
    avg_qq: float
    avg_tq: float
    avg_tc: float
    core_issue: str

    @property
    def overall_avg(self) -> float:
        return round((self.avg_qq + self.avg_tq + self.avg_tc) / 3, 1)

    def to_csv_row(self) -> list:
        return [
            self.category,
            self.count,
            self.avg_qq,
            self.avg_tq,
            self.avg_tc,
            self.overall_avg,
            self.core_issue,
        ]


def aggregate_by_category(scores: list[TaskScore]) -> list[CategorySummary]:
    """Group scores by category and compute averages."""
    from collections import defaultdict

    buckets: dict[str, list[TaskScore]] = defaultdict(list)
    for s in scores:
        buckets[s.category].append(s)

    summaries = []
    for cat, tasks in sorted(buckets.items()):
        n = len(tasks)
        avg_qq = round(sum(t.qq for t in tasks) / n, 1)
        avg_tq = round(sum(t.tq for t in tasks) / n, 1)
        avg_tc = round(sum(t.tc for t in tasks) / n, 1)
        # Most common core issue
        issues = [t.core_issue for t in tasks]
        most_common = max(set(issues), key=issues.count) if issues else ""
        summaries.append(
            CategorySummary(cat, n, avg_qq, avg_tq, avg_tc, most_common)
        )
    return summaries


def parse_scores_from_llm(raw: str) -> dict:
    """
    Extract qq, tq, tc scores and core_issue from LLM response text.
    Expects the LLM to output a JSON block with these fields.
    Robust against LLM returning strings instead of ints for score fields.
    """
    import re

    # Try to find JSON block in the response
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in LLM response")

    candidate = raw[start:end]
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        # LLM sometimes wraps JSON in markdown code fences
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if m:
            data = json.loads(m.group(1))
        else:
            raise

    required = {"qq", "tq", "tc", "core_issue"}
    missing = required - set(data.keys())
    if missing:
        raise ValueError(f"LLM response missing keys: {missing}")

    for key in ("qq", "tq", "tc"):
        val = data[key]
        if isinstance(val, str):
            # LLM sometimes returns description text in a score field.
            # Try to extract any integer from the string.
            m = re.match(r"(\d+)", val.strip())
            if not m:
                # Scan the whole string for any digit
                m = re.search(r"\b(\d{1,2})\b", val)
            if m:
                val = int(m.group(1))
            else:
                # Could not extract a number; store the raw text in a
                # detail field and fall back to a conservative score
                # so the task still gets reviewed rather than 0/0/0.
                data[f"{key}_parse_note"] = (
                    f"LLM returned text instead of score: {val[:120]}"
                )
                val = 5  # neutral fallback
        val = int(val)
        if val < 1:
            val = 1
        elif val > 10:
            val = 10
        data[key] = val

    data["core_issue"] = str(data["core_issue"]).strip()
    return data
