"""
False-Positive Scanner — Second-pass pipeline for rejected/conditional tasks.

Evaluates whether a REJECTED or CONDITIONAL verdict was too harsh by asking
the LLM to play "defense attorney" for the task, looking for mitigating factors
that the initial strict review may have missed.

Produces an adjusted score and a "confidence" metric for the original verdict.
"""

from __future__ import annotations

import json
import logging
import re

import config
from score_schema import TaskScore, QDResult

logger = logging.getLogger("fp-scanner")

FP_SYSTEM_PROMPT = """You are a FAIR and BALANCED second-pass reviewer for Terminal-Bench Harbor tasks.

Your job is to review a task that was previously REJECTED or scored low by a strict first-pass reviewer.
You must determine whether the rejection was JUSTIFIED or TOO HARSH.

PHILOSOPHY:
- The first-pass reviewer is intentionally strict and may over-penalize minor issues.
- Your job is to find MITIGATING FACTORS that the first pass may have missed.
- Tasks with real, critical problems should stay rejected. Tasks with only minor/debatable issues should be rescued.

MITIGATING FACTORS to look for:
1. **Domain-implied requirements**: If tests check things not in instruction.md but a domain expert would naturally expect, this is acceptable — not a hidden requirement.
2. **Adequate overall functionality**: Even if tests aren't perfect, do they meaningfully validate the task's core intent?
3. **Reasonable ambiguity**: If the instruction is somewhat terse but an experienced developer could still solve it, that's a 6-7 qq, not a 4-5.
4. **Practical test coverage**: Tests don't need to cover every edge case to be good. 70-80% of core behavior tested is solid.
5. **Style vs substance**: Penalizing for formatting/docstring style rather than actual test logic is too harsh.
6. **QD false positives**: QD checks are pattern-based and can flag things that aren't actually problems in context.

WHEN TO KEEP THE REJECTION (original verdict stands):
- Tests have actual vacuous assertions (assert True) in primary logic paths
- Model gating or solution leakage found
- Instructions are genuinely self-contradictory on core requirements
- Core algorithm is truly untested (not just tested indirectly)
- Tests are fundamentally broken or incomplete
"""

FP_USER_TEMPLATE = """## FALSE-POSITIVE ANALYSIS

The first-pass reviewer gave this task the following scores:
- qq (Question Quality): {qq}/10
- tq (Test Quality): {tq}/10
- tc (Test Coverage): {tc}/10
- Overall: {overall}/10
- Verdict: {verdict}

### First-Pass Core Issue:
{core_issue}

### First-Pass QD Check Results:
{qd_summary}

### First-Pass Score Details:
{score_details}

---

### TASK CONTENT FOR RE-EVALUATION:

**Instruction (instruction.md):**
```
{instruction}
```

**Test File (test_outputs.py):**
```python
{test_file}
```

{solve_section}

---

### YOUR ANALYSIS:

For each axis (qq, tq, tc), determine:
1. Was the first-pass score fair, too harsh, or too lenient?
2. What mitigating factors apply?
3. What is your adjusted score? (can be same, higher, or even lower if warranted)

Respond in strict JSON:
```json
{{
  "qq_analysis": "Brief analysis of whether qq score was fair",
  "qq_adjusted": <integer 1-10>,
  "tq_analysis": "Brief analysis of whether tq score was fair",
  "tq_adjusted": <integer 1-10>,
  "tc_analysis": "Brief analysis of whether tc score was fair",
  "tc_adjusted": <integer 1-10>,
  "mitigating_factors": ["list of factors that soften the original verdict"],
  "confirmed_issues": ["list of issues that are genuinely problematic"],
  "fp_verdict": "KEEP_REJECTED" | "UPGRADE_TO_CONDITIONAL" | "UPGRADE_TO_APPROVED",
  "confidence": <float 0.0-1.0 how confident you are in the original verdict>,
  "summary": "1-2 sentence summary"
}}
```
"""


def _call_llm(system: str, user: str) -> str:
    """Call LLM (Anthropic or OpenAI based on config)."""
    if config.LLM_PROVIDER == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        resp = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=3000,
            system=system,
            messages=[{"role": "user", "content": user}],
            temperature=0.3,
        )
        if not resp.content:
            raise ValueError("Empty response from Anthropic")
        return resp.content[0].text or ""
    else:
        import openai
        client = openai.OpenAI(api_key=config.OPENAI_API_KEY, base_url=config.OPENAI_BASE_URL)
        resp = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_completion_tokens=3000,
            timeout=config.REQUEST_TIMEOUT,
        )
        return resp.choices[0].message.content or ""


def scan_for_false_positive(
    score: TaskScore,
    task_data: dict,
) -> dict:
    """Run false-positive analysis on a single rejected/conditional task.

    Returns a dict with adjusted scores, verdict, and analysis.
    """
    instruction = (task_data.get("instruction_md") or "")[:8000]
    test_file = (task_data.get("test_code") or "")[:8000]
    solve = task_data.get("solve_sh", "")

    solve_section = ""
    if solve:
        solve_section = f"**solve.sh (reference solution):**\n```bash\n{solve[:3000]}\n```"

    # Include environment file contents when --msource is active
    if task_data.get("_msource") and task_data.get("env_file_contents"):
        env_lines = ["\n**Environment File Contents (--msource):**"]
        total_chars = 0
        for ef in task_data["env_file_contents"]:
            if total_chars >= 15_000:
                break
            snippet = ef["content"][:5000]
            env_lines.append(f"\n`environment/{ef['name']}` ({ef['size']} bytes):")
            env_lines.append(f"```\n{snippet}\n```")
            total_chars += len(snippet)
        env_extra = "\n".join(env_lines)
        solve_section = (solve_section + "\n" + env_extra) if solve_section else env_extra

    qd_summary = "No QD checks run."
    if score.qd_results:
        lines = []
        for r in score.qd_results:
            status = "PASS" if r.passed else "FAIL"
            lines.append(f"  QD-{r.qd_id} ({r.qd_name}): {status} — {r.summary[:100]}")
        qd_summary = "\n".join(lines)

    score_details = ""
    if score.details:
        for k, v in score.details.items():
            if isinstance(v, str) and v:
                score_details += f"\n**{k}:** {v[:500]}\n"

    user_prompt = FP_USER_TEMPLATE.format(
        qq=score.qq,
        tq=score.tq,
        tc=score.tc,
        overall=score.overall,
        verdict=score.verdict,
        core_issue=score.core_issue or "(none)",
        qd_summary=qd_summary,
        score_details=score_details or "(no details)",
        instruction=instruction,
        test_file=test_file,
        solve_section=solve_section,
    )

    raw = _call_llm(FP_SYSTEM_PROMPT, user_prompt)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end])
        else:
            m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
            if m:
                parsed = json.loads(m.group(1))
            else:
                raise ValueError("No JSON found in LLM response")
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("FP scanner: failed to parse LLM response: %s", e)
        return {
            "qq_adjusted": score.qq,
            "tq_adjusted": score.tq,
            "tc_adjusted": score.tc,
            "fp_verdict": "KEEP_REJECTED",
            "confidence": 1.0,
            "summary": f"Parse error: {e}",
            "error": True,
        }

    result = {
        "qq_original": score.qq,
        "tq_original": score.tq,
        "tc_original": score.tc,
        "qq_adjusted": _safe_int(parsed.get("qq_adjusted", score.qq)),
        "tq_adjusted": _safe_int(parsed.get("tq_adjusted", score.tq)),
        "tc_adjusted": _safe_int(parsed.get("tc_adjusted", score.tc)),
        "qq_analysis": parsed.get("qq_analysis", ""),
        "tq_analysis": parsed.get("tq_analysis", ""),
        "tc_analysis": parsed.get("tc_analysis", ""),
        "mitigating_factors": parsed.get("mitigating_factors", []),
        "confirmed_issues": parsed.get("confirmed_issues", []),
        "fp_verdict": parsed.get("fp_verdict", "KEEP_REJECTED"),
        "confidence": float(parsed.get("confidence", 1.0)),
        "summary": parsed.get("summary", ""),
    }

    return result


def _safe_int(val) -> int:
    if isinstance(val, int):
        return max(1, min(10, val))
    if isinstance(val, str):
        m = re.match(r"(\d+)", val.strip())
        if m:
            return max(1, min(10, int(m.group(1))))
    return 5


def apply_fp_results(score: TaskScore, fp_result: dict) -> TaskScore:
    """Create a new TaskScore with adjusted values from FP scanner."""
    fp_verdict = fp_result.get("fp_verdict", "KEEP_REJECTED")

    if fp_verdict == "KEEP_REJECTED":
        adjusted = TaskScore(
            task_name=score.task_name,
            category=score.category,
            qq=score.qq,
            tq=score.tq,
            tc=score.tc,
            core_issue=score.core_issue,
            details={
                **score.details,
                "fp_scan": "Rejection confirmed",
                "fp_confidence": fp_result.get("confidence", 1.0),
            },
            qd_results=score.qd_results,
        )
    else:
        adjusted = TaskScore(
            task_name=score.task_name,
            category=score.category,
            qq=fp_result["qq_adjusted"],
            tq=fp_result["tq_adjusted"],
            tc=fp_result["tc_adjusted"],
            core_issue=score.core_issue,
            details={
                **score.details,
                "fp_scan": f"Upgraded ({fp_verdict})",
                "fp_confidence": fp_result.get("confidence", 0.5),
                "fp_mitigating": "; ".join(fp_result.get("mitigating_factors", [])),
                "fp_summary": fp_result.get("summary", ""),
            },
            qd_results=score.qd_results,
        )

    return adjusted
