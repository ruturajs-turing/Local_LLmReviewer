"""Configuration for the Domain-Specific LLM Reviewer."""

import os

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai")  # "openai" or "anthropic"

# Anthropic settings
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get(
    "ANTHROPIC_MODEL",
    os.environ.get("REVIEWER_MODEL", "claude-sonnet-4-6"),
)

# OpenAI settings
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get(
    "OPENAI_MODEL",
    os.environ.get("REVIEWER_MODEL", "gpt-5.2"),
)
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

MAX_RETRIES = 3
REQUEST_TIMEOUT = 120

# Scoring thresholds aligned with client expectations
SCORE_PASS_THRESHOLD = 7
SCORE_WARN_THRESHOLD = 5

# GDrive settings (reused from download_zips.py pattern)
SERVICE_ACCOUNT_FILE = os.environ.get(
    "GDRIVE_SA_FILE",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "terminal-bench-1.0-validator",
        "company-sa.json",
    ),
)
GDRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def apply_cli_overrides(
    *,
    api_key: str | None = None,
    model: str | None = None,
    custom_url: str | None = None,
    provider: str | None = None,
) -> None:
    """Override config globals at runtime from CLI flags.

    Called once from main() before any reviews start. Both base_reviewer and
    fp_scanner read these module-level names via ``import config``, so mutating
    them here propagates everywhere.
    """
    import config as _self

    if provider:
        _self.LLM_PROVIDER = provider

    if api_key:
        if _self.LLM_PROVIDER == "anthropic":
            _self.ANTHROPIC_API_KEY = api_key
        else:
            _self.OPENAI_API_KEY = api_key

    if model:
        if _self.LLM_PROVIDER == "anthropic":
            _self.ANTHROPIC_MODEL = model
        else:
            _self.OPENAI_MODEL = model

    if custom_url:
        _self.OPENAI_BASE_URL = custom_url
