"""Domain reviewer for Games Development tasks."""

from base_reviewer import BaseReviewer


class GamesDevelopmentReviewer(BaseReviewer):
    domain_name = "games-development"
    domain_display = "Games Development"

    def domain_qq_prompt(self) -> str:
        return """GAMES DEVELOPMENT — Question Quality Checks:
- Are game mechanics clearly defined (rules, win conditions, scoring)?
- Are game state transitions specified?
- Are input formats defined (board state, player moves, game configuration)?
- Are edge cases in game logic described (draws, ties, invalid moves)?
- Are output formats specified (rendered canvas, game state JSON, move logs)?
- Are all game scenarios non-homogeneous (mix of runs, groups, draws, not all identical)?
CRITICAL: Games tasks have the WORST scores across all categories. Common issues:
- Problem descriptions are vague or contradictory → qq ≤ 5
- Game rules are incomplete or have unstated edge cases
- All test scenarios use homogeneous solutions (e.g., all runs, no groups) → qq ≤ 6"""

    def domain_tq_prompt(self) -> str:
        return """GAMES DEVELOPMENT — Test Quality Checks:
- Do tests verify game LOGIC (correct moves, valid states, win detection)?
- Do tests cover multiple game scenarios (not just happy path)?
- Are edge cases tested (empty hand, draws, invalid moves, ties)?
- Do tests verify interactive/visual elements if applicable?
- Are tests heterogeneous (different types of solutions, not all identical)?
- Do tests avoid vacuous assertions (assert True fallbacks)?
CRITICAL: Games tests consistently have the worst tq and tc scores.
Common failures:
  - Tests only check output format, not game logic
  - All test scenarios are homogeneous (same type of solution)
  - Tests use assert True in fallback branches
  - Tests are incomplete (pass-only placeholder functions)
Score penalty: Homogeneous scenarios → tq ≤ 6. Vacuous assertions → tq ≤ 3."""

    def domain_tc_prompt(self) -> str:
        return """GAMES DEVELOPMENT — Test Coverage Checks:
- Are ALL game mechanics tested (not just the happy path)?
- Are edge cases covered (empty state, maximum values, boundary conditions)?
- Are different game scenarios tested (wins, losses, draws, ties)?
- Is optimal/non-optimal move selection tested?
- Are multiple solution types tested (runs, groups, mixed)?
- For visual games: are rendering and interaction verified?
CRITICAL: Games tasks average tc=3.6-4.8 — the lowest of any category.
Main issues:
  - Test scenarios are severely insufficient
  - Edge cases are NOT tested
  - Visual rendering is NOT verified
  - Only happy-path scenarios are covered
When tests cover <5 scenarios, all of the same type → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Games Development (11 tasks flagged by client — MOST of any domain):

REAL CLIENT SCORES (use these as your scoring anchor):
- mahjong-medium → qq=4, tq=3, tc=3 (avg=3.33, CRITICAL)
  "Scenario 1 correct answer (DECLARE_MAHJONG) completely unverified; instruction claims ALLOW_PUNG=false but actual=true; tests contain dead code"
- chess-best-move-medium → qq=4, tq=5, tc=3 (avg=4.0, CRITICAL)
  "Case 1 and Case 2 use same FEN (Scholar's Mate); only tests one-move checkmate; no promotion/en passant/deep search"
- board-siege-medium → qq=4, tq=6, tc=3 (avg=4.33, CRITICAL)
  "Single 12x12 board; hardcoding {\"captures\":[7]} passes all tests; rules don't clarify diagonal captures"
- rummikub-medium → qq=5, tq=6, tc=4 (avg=5.0, CRITICAL)
  "All scenarios have solutions (no DRAW); all optimal solutions are runs (no groups); empty hand missing"
  IMPORTANT: Even if tests check optimality on the provided scenarios, if ALL scenarios are
  homogeneous (same type of solution), that is insufficient coverage. qq should NOT exceed 5-6
  when the problem description has gaps (missing DRAW/group scenarios). tc ≤ 4 for homogeneous tests.
- cascade-dominion-hard → qq=5, tq=7, tc=5 (avg=5.67, SERIOUS)
  "Only 1 board (15x15); no small boards, no cascade chains, no all-same-type edge cases"
- rpg-battle-engine-medium → qq=7, tq=5, tc=5 (avg=5.67, SERIOUS)
  "Tests have inter-test state dependencies; damage formula and healing mechanics not verified"
- wordle-feedback-generator-medium → qq=7, tq=7, tc=4 (avg=6.0, SERIOUS)
  "All 5 secrets have no repeated letters; missing all-GREEN/all-GRAY/repeated-letter edge cases"
- othello-style-grid-capture-medium → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Missing zero-capture, single-row, long-chain, all-same-color edge cases"
- turn-grid-war-medium → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Missing out-of-bounds movement, combo chain trigger cap, weakened stacking edge cases"
- dockside-arbitrage-medium → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Only 1 dataset; missing dense-arrival tie, idle dock, all-rejected scenarios"
- carcassonne-game-hard → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Only 1 board state; penalty threshold boundaries and meeple depletion not tested"

KEY PATTERNS TO DETECT:
1. Homogeneous test scenarios (all same solution type) → tc ≤ 4
2. Hardcoded answers can pass (single dataset) → tc ≤ 4
3. Contradictory game rules (instruction vs actual behavior) → qq ≤ 5
4. Dead code / vacuous assertions in tests → tq ≤ 3
5. Missing edge cases (empty hand, ties, draws, boundary) → tc ≤ 5
6. Inter-test state dependencies → tq -1

SCORING GUIDE:
- qq=4: Rules are contradictory or incomplete (mahjong, chess, board-siege)
- qq=5: Rules mostly clear but some ambiguity (rummikub, cascade-dominion)
- qq=7: Rules are clear and well-defined (wordle, othello, turn-grid-war)
- tc=3: Single scenario, hardcoded pass (chess, mahjong, board-siege)
- tc=4-5: Multiple scenarios but homogeneous or missing edge cases
- tc=7+: Diverse scenarios with edge cases covered"""
