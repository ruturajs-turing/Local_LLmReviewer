"""
Load all relevant files from a Harbor task directory into a structured dict
that reviewers can feed into LLM prompts.
"""

from __future__ import annotations

import re
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    import tomli as tomllib  # type: ignore[no-redef]


def _read_text(path: Path, max_chars: int = 200_000) -> str | None:
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        return text[:max_chars]
    except (OSError, UnicodeDecodeError):
        return None


def _find_file(base: Path, candidates: list[str]) -> Path | None:
    for c in candidates:
        p = base / c
        if p.exists():
            return p
    return None


def _list_dir(path: Path) -> list[str]:
    if not path.is_dir():
        return []
    return sorted(p.name for p in path.iterdir() if not p.name.startswith("."))


def _resolve_task_root(base: Path) -> Path:
    """
    Harbor tasks may be nested arbitrarily deep. Walk down until we find
    a directory containing instruction.md or task.toml.
    Handles patterns like:
      outer/inner/Tasks/domain/slug/instruction.md
      outer/outer/Tasks/domain/slug/instruction.md
      outer/slug/instruction.md
    """
    if (base / "instruction.md").exists() or (base / "task.toml").exists():
        return base

    # Breadth-first search up to 6 levels deep for instruction.md
    for toml_hit in base.rglob("task.toml"):
        return toml_hit.parent
    for md_hit in base.rglob("instruction.md"):
        return md_hit.parent

    return base


def load_task(task_dir: str | Path) -> dict:
    """
    Load a Harbor task directory into a dict with all files reviewers need.

    Returns dict with keys:
      task_dir, folder_name, task_toml (parsed), instruction_md,
      test_code, test_sh, solve_sh, dockerfile, env_files,
      model_run_logs, category, difficulty, slug
    """
    base = Path(task_dir).resolve()
    if not base.is_dir():
        raise FileNotFoundError(f"Task directory not found: {base}")

    base = _resolve_task_root(base)
    result: dict = {"task_dir": str(base), "folder_name": base.name}

    # task.toml
    toml_path = base / "task.toml"
    toml_raw = _read_text(toml_path)
    result["task_toml_raw"] = toml_raw
    if toml_raw:
        try:
            result["task_toml"] = tomllib.loads(toml_raw)
        except (ValueError, KeyError):
            result["task_toml"] = {}
    else:
        result["task_toml"] = {}

    meta = result["task_toml"].get("metadata", {})
    result["category"] = meta.get("category", "unknown")
    result["difficulty"] = meta.get("difficulty", "unknown")

    # Extract slug from folder name: UUID-tb-<domain>-<slug>-<difficulty>
    slug_match = re.search(r"terminal-bench-(.+?)-(medium|hard)$", base.name)
    if slug_match:
        result["slug"] = slug_match.group(1)
    else:
        slug_match2 = re.search(r"tb-[a-z-]+-(.+?)-(medium|hard)$", base.name)
        result["slug"] = slug_match2.group(1) if slug_match2 else base.name

    # instruction.md
    result["instruction_md"] = _read_text(base / "instruction.md")

    # Tests
    test_file = _find_file(
        base / "tests",
        ["test_outputs.py", "test_state.py", "test.py"],
    )
    result["test_code"] = _read_text(test_file) if test_file else None
    result["test_filename"] = test_file.name if test_file else None

    # test.sh
    test_sh = _find_file(base / "tests", ["test.sh"]) or _find_file(base, ["tests/test.sh"])
    result["test_sh"] = _read_text(test_sh) if test_sh else None

    # solve.sh
    solve_path = _find_file(base / "solution", ["solve.sh"])
    result["solve_sh"] = _read_text(solve_path) if solve_path else None

    # Dockerfile
    dockerfile_path = _find_file(
        base / "environment", ["Dockerfile"]
    ) or _find_file(base, ["Dockerfile"])
    result["dockerfile"] = _read_text(dockerfile_path) if dockerfile_path else None

    # Environment file listing
    env_dir = base / "environment"
    result["env_files"] = _list_dir(env_dir) if env_dir.is_dir() else []

    # Model run logs summary (both naming conventions)
    model_logs_dir = base / "model_run_logs"
    if not model_logs_dir.is_dir():
        model_logs_dir = base / "model-run-logs"
    result["model_run_dirs"] = []
    if model_logs_dir.is_dir():
        for sub in sorted(model_logs_dir.iterdir()):
            if sub.is_dir():
                result_json = sub / "result.json"
                result["model_run_dirs"].append({
                    "name": sub.name,
                    "has_result": result_json.exists(),
                    "result_json": _read_text(result_json) if result_json.exists() else None,
                })

    # Environment file contents (for --msource deep review)
    env_file_contents: list[dict] = []
    if env_dir.is_dir():
        skip_names = {"Dockerfile", ".DS_Store"}
        skip_exts = {".pyc", ".pyo", ".so", ".o", ".class", ".jar",
                     ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico",
                     ".zip", ".tar", ".gz", ".bz2", ".7z",
                     ".bin", ".exe", ".dll", ".whl", ".egg",
                     ".sqlite", ".db", ".sqlite3"}
        for child in sorted(env_dir.iterdir()):
            if child.name.startswith(".") or child.name in skip_names:
                continue
            if child.suffix.lower() in skip_exts:
                continue
            if child.is_file():
                content = _read_text(child, max_chars=50_000)
                if content is not None:
                    env_file_contents.append({
                        "name": child.name,
                        "size": child.stat().st_size,
                        "content": content,
                    })
            elif child.is_dir():
                for sub in sorted(child.rglob("*")):
                    if sub.is_file() and sub.suffix.lower() not in skip_exts:
                        rel = sub.relative_to(env_dir)
                        content = _read_text(sub, max_chars=30_000)
                        if content is not None:
                            env_file_contents.append({
                                "name": str(rel),
                                "size": sub.stat().st_size,
                                "content": content,
                            })
    result["env_file_contents"] = env_file_contents

    # Supplementary files (GUIDANCE.md, maininstructions.md, etc.)
    supplementary = []
    for candidate in ["GUIDANCE.md", "maininstructions.md", "README.md"]:
        supp = base / candidate
        if not supp.exists():
            # Also check under environment/ or src/
            for subdir in ["environment", "src"]:
                alt = base / subdir / candidate
                if alt.exists():
                    supp = alt
                    break
        if supp.exists():
            supplementary.append({"name": candidate, "content": _read_text(supp)})
    result["supplementary_files"] = supplementary

    return result


def task_summary(task: dict) -> str:
    """One-line summary for logging."""
    return (
        f"{task['folder_name']} | "
        f"cat={task['category']} diff={task['difficulty']} | "
        f"instruction={'Y' if task['instruction_md'] else 'N'} "
        f"tests={'Y' if task['test_code'] else 'N'} "
        f"solve={'Y' if task['solve_sh'] else 'N'} "
        f"docker={'Y' if task['dockerfile'] else 'N'}"
    )
