"""Domain reviewer for File System tasks."""

from base_reviewer import BaseReviewer


class FileSystemReviewer(BaseReviewer):
    domain_name = "file-system"
    domain_display = "File System"

    def domain_qq_prompt(self) -> str:
        return """FILE SYSTEM — Question Quality Checks:
- Is the file system operation clearly described (monitoring, indexing, virtual FS)?
- Are the expected behaviors for edge cases documented?
- Are performance or concurrency requirements stated?
- Is the interaction model clear (CLI, API, daemon)?
- Are file system semantics (symlinks, hard links, permissions) explicitly addressed?
CRITICAL: File system tasks involving custom implementations must define semantics precisely. Missing semantics → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """FILE SYSTEM — Test Quality Checks:
- Do tests exercise the file system operations with actual files?
- Are race conditions or concurrency tested if applicable?
- Do tests verify metadata (timestamps, permissions, sizes)?
- Are mount/unmount or similar lifecycle operations tested?
- Are error conditions tested (disk full, permission denied)?
CRITICAL: Tests must operate on actual file system state, not mock data → tq ≤ 5 if mocked."""

    def domain_tc_prompt(self) -> str:
        return """FILE SYSTEM — Test Coverage Checks:
- Is every specified file system operation tested?
- Are CRUD operations on files/directories all covered?
- Are edge cases tested (empty directories, deeply nested paths)?
- If custom FS semantics are defined, is each semantic rule tested?
CRITICAL: Custom file system tasks with defined semantics but untested rules → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — File System (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- phantom-backup-coverage-audit-medium → qq=7, tq=6, tc=4 (avg=5.67, SERIOUS)
  "Insufficient test coverage — coverage audit logic not thoroughly tested"

KEY PATTERNS TO DETECT:
1. Insufficient edge case testing (empty dirs, special chars, deeply nested) → tc ≤ 5
2. Happy path only without error conditions → tc ≤ 6
3. Concurrent access untested when specified → tc ≤ 4
4. File metadata (timestamps, permissions, sizes) not verified → tc -1
5. Custom FS semantics defined but not individually tested → tc -1

SCORING GUIDE:
- tc=4: Major coverage gaps, edge cases missing
- tc=6: Happy path + some edge cases, but incomplete
- tc=7+: Comprehensive coverage including edge cases, error conditions, metadata"""
