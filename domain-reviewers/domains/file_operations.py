"""Domain reviewer for File Operations tasks."""

from base_reviewer import BaseReviewer


class FileOperationsReviewer(BaseReviewer):
    domain_name = "file-operations"
    domain_display = "File Operations"

    def domain_qq_prompt(self) -> str:
        return """FILE OPERATIONS — Question Quality Checks:
- Are input file paths and formats clearly specified?
- Are output file paths, names, and formats defined?
- Are file manipulation rules explicit (rename patterns, content transformations)?
- Are directory structure requirements clear?
- Are permission/ownership requirements stated if applicable?
CRITICAL: File operations tasks must specify exact paths and naming conventions. Ambiguous paths → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """FILE OPERATIONS — Test Quality Checks:
- Do tests verify file contents, not just file existence?
- Are file permissions tested if specified?
- Are directory structures verified?
- Do tests check file encoding if relevant?
- Are tests resilient to trailing whitespace/newline differences?
CRITICAL: Tests that only check os.path.exists() without reading file content → tq ≤ 4."""

    def domain_tc_prompt(self) -> str:
        return """FILE OPERATIONS — Test Coverage Checks:
- Is every file operation (create, move, rename, modify, delete) tested?
- Are file contents verified after transformation?
- Are naming patterns verified (regex or exact match)?
- Are edge cases tested (empty files, special characters in names, nested directories)?
- Are error cases tested (missing source files)?
CRITICAL: If instruction lists 5 file operations and tests verify 3 → tc ≤ 6."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — File Operations (0 tasks directly flagged, but cross-cutting patterns apply):

CROSS-CUTTING PATTERNS FROM CLIENT FEEDBACK:
1. "Format-only validation" — tests check os.path.exists() but never read file content → tc ≤ 4
2. "Insufficient edge cases" — missing empty files, special chars in names, nested dirs → tc -1
3. Common file-ops anti-patterns:
   - Tests verify top-level files but miss nested directory structure → tc ≤ 6
   - Tests don't verify file content after transformation → tc ≤ 5
   - File permissions/ownership not verified when specified → tc -1

SCORING GUIDE:
- tc=4: File existence only (os.path.exists), no content check
- tc=5: Content partially verified, missing transformations
- tc=6: Top-level verified, nested structure missed
- tc=7+: All files verified with content + metadata + edge cases"""
