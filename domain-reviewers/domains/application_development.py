"""Domain reviewer for Application Development tasks."""

from base_reviewer import BaseReviewer


class ApplicationDevelopmentReviewer(BaseReviewer):
    domain_name = "application-development"
    domain_display = "Application Development"

    def domain_qq_prompt(self) -> str:
        return """APPLICATION DEVELOPMENT — Question Quality Checks:
- Is the application's purpose and functionality clearly described?
- Are required features/endpoints/components specified with expected behavior?
- Are data models, APIs, and interfaces sufficiently described?
- Is the technology stack clear (or left flexible for the agent)?
- Are any external service dependencies mentioned and available in the environment?
- Is error handling behavior specified?
CRITICAL: Application tasks must define observable behaviors that can be tested, not just internal architecture."""

    def domain_tq_prompt(self) -> str:
        return """APPLICATION DEVELOPMENT — Test Quality Checks:
- Do tests exercise the application's external interfaces (API endpoints, CLI commands, file I/O)?
- Are integration-level tests present (not just unit tests of helper functions)?
- Do tests verify error handling and edge cases (invalid input, missing data)?
- Are response formats and status codes verified?
- Do tests avoid testing internal implementation details?
CRITICAL: For application tasks, tests should verify behavior through the same interfaces a user would use."""

    def domain_tc_prompt(self) -> str:
        return """APPLICATION DEVELOPMENT — Test Coverage Checks:
- Is every specified feature/endpoint tested?
- Are both success and failure paths covered?
- Are data persistence/state changes verified?
- If the app processes data, are transformation results checked with actual values?
- Are concurrent/async behaviors tested if specified?
CRITICAL: Application tests must cover the full feature set. Untested features = coverage gap."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Application Development (0 tasks directly flagged, but cross-cutting patterns apply):

CROSS-CUTTING PATTERNS FROM CLIENT FEEDBACK:
1. "Format-only validation" — tests check "server starts" without testing endpoints → tc ≤ 4
2. "Insufficient test scenarios" — only happy-path tested → tc ≤ 5
3. Common app-dev anti-patterns:
   - Tests verify app runs without crashing but don't test feature logic → tc ≤ 4
   - API endpoint tests only check status code 200, not response body → tq ≤ 5
   - No error handling tests (invalid input, missing data, auth failures) → tc -1
   - State persistence not verified (DB writes, file saves) → tc -1

APPLICATION TESTING HIERARCHY:
Level 1: App starts without error → tc ≤ 3
Level 2: Endpoints return 200 → tc ≤ 4
Level 3: Response body matches expected → tc ≤ 6
Level 4: CRUD operations verified with state changes → tc ≤ 7
Level 5: Error handling + edge cases + concurrency → tc 8+

SCORING GUIDE:
- tc=3: App starts only
- tc=4: Status codes checked, no body verification
- tc=6: Responses verified but missing error paths
- tc=7+: Full feature testing with error handling and edge cases"""
