"""Domain reviewer for Software Engineering tasks."""

from base_reviewer import BaseReviewer


class SoftwareEngineeringReviewer(BaseReviewer):
    domain_name = "software-engineering"
    domain_display = "Software Engineering"

    def domain_qq_prompt(self) -> str:
        return """SOFTWARE ENGINEERING — Question Quality Checks:
- Is the software system/component to build or modify clearly described?
- Are functional requirements specific and testable?
- Are non-functional requirements stated (performance, concurrency, error handling)?
- Are APIs, interfaces, and data formats defined?
- Are constraints (language, framework, backward compatibility) stated?
- Is the expected behavior under edge conditions described?
CRITICAL: Software engineering tasks must define observable, testable behaviors. "Build a system" without specifying what it should DO → qq ≤ 4."""

    def domain_tq_prompt(self) -> str:
        return """SOFTWARE ENGINEERING — Test Quality Checks:
- Do tests verify functional behavior (correct outputs for given inputs)?
- Are integration tests present (not just unit tests of helpers)?
- Do tests verify error handling and edge cases?
- Are concurrency/race condition tests present if applicable?
- Do tests avoid testing implementation details (internal data structures)?
- Are tests covering both success and failure paths?
CRITICAL: Tests that only check "program runs without error" → tq ≤ 4. Tests must verify actual computed outputs."""

    def domain_tc_prompt(self) -> str:
        return """SOFTWARE ENGINEERING — Test Coverage Checks:
- Is every specified feature/requirement tested?
- Are both success and failure paths covered?
- Are edge cases tested (empty input, max input, concurrent access)?
- Are state transitions verified if applicable?
- If the task involves debugging, is the specific fix verified?
CRITICAL: If instruction lists 5 requirements and tests only verify 3 → tc ≤ 6."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Software Engineering (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- time-travel-deterministic-debugger-medium → qq=6, tq=5, tc=5 (avg=5.33, SERIOUS)
  "Insufficient test coverage — core debugging/replay logic not fully verified"

KEY PATTERNS TO DETECT:
1. Insufficient test coverage (core logic untested) → tc ≤ 5
2. Tests verify surface behavior without core algorithm → tq ≤ 5
3. Missing edge cases (concurrent access, race conditions, boundary inputs) → tc -1
4. No regression testing when modifying existing code → tc -1
5. Tests check output format but not computed values → tc ≤ 4

SCORING GUIDE:
- tq=5: Tests exist but core logic not fully verified
- tc=5: Major coverage gaps in core functionality
- tc=7+: Full functional coverage with edge cases and regression tests"""
