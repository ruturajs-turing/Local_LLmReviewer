"""Domain reviewer for Personal Assistant tasks."""

from base_reviewer import BaseReviewer


class PersonalAssistantReviewer(BaseReviewer):
    domain_name = "personal-assistant"
    domain_display = "Personal Assistant"

    def domain_qq_prompt(self) -> str:
        return """PERSONAL ASSISTANT — Question Quality Checks:
- Is the assistant task clearly defined (scheduling, email triage, data lookup)?
- Are input data formats specified (emails, calendar entries, contacts)?
- Are decision rules explicitly stated (priority levels, matching criteria)?
- Are expected output formats defined?
- Are ambiguity resolution rules stated?
CRITICAL: Personal assistant tasks require clear decision rules. Ambiguous matching criteria → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """PERSONAL ASSISTANT — Test Quality Checks:
- Do tests verify the assistant's DECISION LOGIC (correct prioritization, matching)?
- Are ambiguous cases tested (partial name matches, overlapping schedules)?
- Do tests check actual computed results (not just output format)?
- Are tests complete (no placeholder/pass-only functions)?
CRITICAL: Watch for INCOMPLETE tests — the client flagged an email triage planner
where test functions were left as "pass" placeholders (never finished). This is an
automatic quality failure.
Score penalty: Incomplete test functions → tq ≤ 2. Vacuous assertions → tq ≤ 3."""

    def domain_tc_prompt(self) -> str:
        return """PERSONAL ASSISTANT — Test Coverage Checks:
- Are all decision rules from instruction.md tested?
- Are ambiguous/edge cases covered (name matching, time conflicts)?
- Are all output fields verified with actual values?
- Are error handling scenarios tested?
CRITICAL: Personal assistant tasks require thorough edge case coverage for matching and prioritization logic."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Personal Assistant (2 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- email-triage-planner-medium → qq=7, tq=5, tc=5 (avg=5.67, SERIOUS)
  "Insufficient test coverage — ambiguous sender matching uses 'assert True' in else branch (vacuous); time-slot matching test left as 'pass' (incomplete)"
- appointment-scheduler-medium → qq=7, tq=6, tc=5 (avg=6.0, SERIOUS)
  "Expense rule edge cases (e.g., over-limit approvals, cross-category aggregation) are not covered"

KEY PATTERNS TO DETECT:
1. Vacuous assertions (assert True in else/fallback branches) → tq ≤ 3
2. Incomplete test functions (body is just 'pass') → tq ≤ 2
3. Missing edge cases for decision logic (ties, ambiguous matches, boundary thresholds) → tc ≤ 5
4. Tests that exercise happy path only without adversarial inputs → tc -1
5. No test for overlapping/conflicting decisions (double-booking, priority conflicts) → tc -1

VACUOUS ASSERTION DETECTION:
Look for these exact patterns in test code:
  - `assert True` in any branch (especially else/except blocks)
  - `pass` as the only statement in a test function body
  - `assert result is not None` when result is always not None
  - `assert len(result) > 0` without checking content
These are ALWAYS quality failures.

SCORING GUIDE:
- tq=2: Test functions with 'pass' body (never implemented)
- tq=3: Vacuous assertions (assert True fallback)
- tq=5: Tests exist and check outcomes but miss ambiguous/edge cases
- tc=5: Happy path covered but edge cases (ties, conflicts, boundary) missing
- tc=7+: Decision logic fully tested including edge cases"""
