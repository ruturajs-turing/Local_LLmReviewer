"""Domain reviewer for Scientific Computing tasks."""

from base_reviewer import BaseReviewer


class ScientificComputingReviewer(BaseReviewer):
    domain_name = "scientific-computing"
    domain_display = "Scientific Computing"

    def domain_qq_prompt(self) -> str:
        return """SCIENTIFIC COMPUTING — Question Quality Checks:
- Are mathematical/physical models precisely defined?
- Are numerical methods specified (or left flexible)?
- Are convergence criteria and precision requirements stated?
- Are physical units and dimensional analysis addressed?
- Are input parameter ranges and boundary conditions defined?
- Are reference solutions or analytical benchmarks provided?
CRITICAL: Scientific computing demands extreme precision. Ambiguous physical models or missing units → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """SCIENTIFIC COMPUTING — Test Quality Checks:
- Do tests verify numerical results against known analytical solutions?
- Are numerical tolerances scientifically appropriate and TIGHT ENOUGH?
- Do tests check convergence behavior?
- Are conservation laws or invariants tested?
- Are tests checking physical plausibility of results?
CRITICAL: Tests that check output format without verifying physical/mathematical correctness → tq ≤ 4.
TOLERANCE CHECK: Are tolerances too loose? (e.g., rtol=0.1 when rtol=0.01 is appropriate)
The client flagged scientific-computing for "Tolerance too loose; coverage points too few."
Overly generous tolerances mask computational errors → tq penalty."""

    def domain_tc_prompt(self) -> str:
        return """SCIENTIFIC COMPUTING — Test Coverage Checks:
- Is every computed physical/mathematical quantity verified?
- Are convergence metrics tested?
- Are boundary conditions verified in the solution?
- Are conservation laws tested?
- Are different parameter regimes tested?
- Are there ENOUGH coverage points (multiple test inputs, not just one)?
CRITICAL: If a simulation task tests "output file has N columns" without checking physical values → tc ≤ 3.
COVERAGE DENSITY: The client flagged "coverage points too few" — tests should verify
results at multiple parameter values, not just a single happy-path case."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Scientific Computing (5 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- pde-solver-heat-equation-medium → qq=5, tq=4, tc=3 (avg=4.0, CRITICAL)
  "Tests only check output shape (grid dimensions); no temperature value verification; rtol=0.1 way too loose"
- orbital-mechanics-simulation-hard → qq=6, tq=5, tc=4 (avg=5.0, CRITICAL)
  "Only 1 orbit tested; no elliptical/hyperbolic cases; conservation of energy not checked; atol=10.0 too loose"
- fluid-dynamics-channel-flow-medium → qq=7, tq=6, tc=5 (avg=6.0, SERIOUS)
  "Velocity profile checked but only at 2 points; no pressure drop or mass conservation test; rtol=0.05 borderline"
- quantum-harmonic-oscillator-hard → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Energy eigenvalues verified but only ground state; missing excited states and wave function orthogonality"
- molecular-dynamics-lj-medium → qq=8, tq=7, tc=6 (avg=7.0, MODERATE)
  "Good tests but missing temperature equilibration check and RDF computation"

KEY PATTERNS TO DETECT:
1. Tolerances too loose (rtol > 0.05 or atol > 1.0 for typical problems) → tq -2
2. Too few coverage points (< 3 test inputs/parameter values) → tc ≤ 5
3. Shape-only testing (check grid is NxM without value checks) → tc ≤ 3
4. Missing conservation law checks (energy, mass, momentum) → tc -1
5. Only 1 test scenario (single orbit, single flow condition) → tc ≤ 4
6. Missing boundary condition verification → tc -1

TOLERANCE CALIBRATION:
- rtol > 0.1: WAY too loose → tq -3
- rtol 0.05-0.1: Too loose for most problems → tq -2
- rtol 0.01-0.05: Borderline, depends on problem → tq -1
- rtol ≤ 0.01: Appropriate for most scientific computing
- atol > 10.0: Always too loose → tq -2
- atol 1.0-10.0: Usually too loose → tq -1

SCORING GUIDE:
- tc=3: Shape/format only, no physical values checked
- tc=4: Values checked but only 1 scenario/parameter set
- tc=5: Multiple scenarios but missing conservation/boundary checks
- tc=7+: Multiple scenarios, conservation laws, boundary conditions all verified"""
