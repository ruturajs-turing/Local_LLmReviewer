"""Domain reviewer for Debugging tasks."""

from base_reviewer import BaseReviewer


class DebuggingReviewer(BaseReviewer):
    domain_name = "debugging"
    domain_display = "Debugging"

    def domain_qq_prompt(self) -> str:
        return """DEBUGGING — Question Quality Checks:
- Is the bug/issue clearly described with observable symptoms?
- Is the expected correct behavior specified?
- Is the buggy code or system provided in the environment?
- Are reproduction steps or test cases provided?
- Is it clear what the agent should fix (specific files, functions, configurations)?
CRITICAL: Debugging tasks must describe the SYMPTOM clearly. "Fix the code" without describing what's wrong → qq ≤ 4."""

    def domain_tq_prompt(self) -> str:
        return """DEBUGGING — Test Quality Checks:
- Do tests verify the bug is FIXED (correct behavior restored)?
- Do tests verify no regressions (other functionality still works)?
- Are the original failing test cases included?
- Do tests check the root cause, not just symptom masking?
- Are edge cases around the bug tested?
CRITICAL: Tests that only check "code runs without error" don't verify the bug is fixed → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """DEBUGGING — Test Coverage Checks:
- Is the specific bug fix verified with a targeted test?
- Are related functionalities tested for regressions?
- Are edge cases around the fixed area covered?
- If multiple bugs exist, is each one tested independently?
CRITICAL: If the task says "fix 3 bugs" but tests only verify 1 → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Debugging (0 tasks directly flagged, but cross-cutting patterns apply):

CROSS-CUTTING PATTERNS FROM CLIENT FEEDBACK:
1. "Format-only validation without value verification" — if tests only check "script completes without error"
   but don't verify the bug is actually fixed → tc ≤ 3
2. "Insufficient test scenarios / edge cases" — if tests verify the fix for 1 case but not edge cases → tc ≤ 5
3. "Contradictory instructions / data mismatch" — if the bug description contradicts the actual code → qq ≤ 5
4. "Bugs in test code itself" — if the test has Python operator precedence errors or dead code → tq ≤ 4

KEY PATTERNS TO DETECT:
- Tests that pass with ANY output (no exception = pass) → tc ≤ 3
- Tests that don't verify the SPECIFIC bug is fixed → tc ≤ 4
- No regression testing (other functionality still works) → tc -1
- Bug description unclear or contradicts code → qq ≤ 5

SCORING GUIDE:
- tc=3: "Script completes" is the only assertion
- tc=4: Bug fix verified for one case, no edge cases
- tc=5: Fix verified + some regression, missing edge cases
- tc=7+: Fix verified + regression + edge cases around the fix"""
