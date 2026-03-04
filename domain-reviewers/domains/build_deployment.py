"""Domain reviewer for Build & Deployment tasks."""

from base_reviewer import BaseReviewer


class BuildDeploymentReviewer(BaseReviewer):
    domain_name = "build-deployment"
    domain_display = "Build & Deployment"

    def domain_qq_prompt(self) -> str:
        return """BUILD & DEPLOYMENT — Question Quality Checks:
- Is the build/deployment target clearly specified?
- Are source repositories, versions, and dependencies documented?
- Are success criteria measurable (binary runs, test suite passes, artifact produced)?
- Are environment constraints (OS, architecture, available tools) stated?
- Is the expected artifact format described?
CRITICAL: Build tasks must have unambiguous success criteria — "it compiles" is not sufficient if specific behaviors are expected."""

    def domain_tq_prompt(self) -> str:
        return """BUILD & DEPLOYMENT — Test Quality Checks:
- Do tests verify the build artifact exists and is functional?
- Are tests checking actual execution of the built artifact (not just file presence)?
- Do tests verify version constraints if specified?
- Are build reproducibility checks present?
- Do tests handle build failures gracefully?
CRITICAL: Tests should execute the built artifact to verify functionality, not just check file existence."""

    def domain_tc_prompt(self) -> str:
        return """BUILD & DEPLOYMENT — Test Coverage Checks:
- Is the core build process verified (compilation, linking, packaging)?
- Are generated artifacts tested for correctness (run test suite, execute sample)?
- Are configuration options tested if specified?
- Are deployment steps verified (service starts, health checks pass)?
CRITICAL: Build tasks often have tests that only check "binary exists" without running it → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Build & Deployment (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- cross-compile-toolchain-medium → qq=4, tq=3, tc=3 (avg=3.33, CRITICAL)
  "Both the question and tests are severely inadequate — instruction unclear, tests check nothing meaningful"

KEY PATTERNS TO DETECT:
1. Instruction doesn't define clear build target/output → qq ≤ 4
2. Tests only check "binary/artifact exists" without running it → tc ≤ 5
3. No test suite execution of the built artifact → tc -2
4. No version/compatibility verification when specified → tc -1
5. Tests don't verify the build is functional (just file presence) → tq ≤ 4

BUILD TASK TESTING HIERARCHY:
Level 1: Artifact exists (file present) → tc ≤ 4
Level 2: Artifact is valid format (can be loaded/parsed) → tc ≤ 5
Level 3: Artifact executes without error → tc ≤ 6
Level 4: Artifact produces expected output → tc ≤ 7
Level 5: Artifact passes test suite / full functional verification → tc 8+

SCORING GUIDE:
- qq=4: Build target/output unclear or contradictory
- tq=3: Tests check nothing meaningful
- tc=3: Both question and tests severely inadequate
- tc=5: File-exists-only testing
- tc=7+: Full execution + functional verification"""
