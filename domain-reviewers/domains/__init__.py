"""Domain-specific reviewer modules."""

from domains.algorithm_design import AlgorithmDesignReviewer
from domains.application_development import ApplicationDevelopmentReviewer
from domains.build_deployment import BuildDeploymentReviewer
from domains.data_analysis import DataAnalysisReviewer
from domains.data_preprocessing import DataPreprocessingReviewer
from domains.data_querying import DataQueryingReviewer
from domains.data_science import DataScienceReviewer
from domains.debugging import DebuggingReviewer
from domains.file_operations import FileOperationsReviewer
from domains.file_system import FileSystemReviewer
from domains.machine_learning import MachineLearningReviewer
from domains.mathematics import MathematicsReviewer
from domains.model_training import ModelTrainingReviewer
from domains.personal_assistant import PersonalAssistantReviewer
from domains.protocol_analysis import ProtocolAnalysisReviewer
from domains.scientific_computing import ScientificComputingReviewer
from domains.security import SecurityReviewer
from domains.software_engineering import SoftwareEngineeringReviewer
from domains.system_administration import SystemAdministrationReviewer

try:
    from domains.frontend_development import FrontendDevelopmentReviewer
except ImportError:
    FrontendDevelopmentReviewer = None

try:
    from domains.games_development import GamesDevelopmentReviewer
except ImportError:
    GamesDevelopmentReviewer = None

try:
    from domains.ui_ux_optimization import UIUXOptimizationReviewer
except ImportError:
    UIUXOptimizationReviewer = None

DOMAIN_REGISTRY: dict[str, type] = {
    "algorithm-design": AlgorithmDesignReviewer,
    "application-development": ApplicationDevelopmentReviewer,
    "build-deployment": BuildDeploymentReviewer,
    "build-and-deployment": BuildDeploymentReviewer,
    "data-analysis": DataAnalysisReviewer,
    "data-preprocessing": DataPreprocessingReviewer,
    "data-querying": DataQueryingReviewer,
    "data-science": DataScienceReviewer,
    "debugging": DebuggingReviewer,
    "file-operations": FileOperationsReviewer,
    "file-system": FileSystemReviewer,
    "machine-learning": MachineLearningReviewer,
    "mathematics": MathematicsReviewer,
    "model-training": ModelTrainingReviewer,
    "personal-assistant": PersonalAssistantReviewer,
    "personal-assistant-development": PersonalAssistantReviewer,
    "protocol-analysis": ProtocolAnalysisReviewer,
    "scientific-computing": ScientificComputingReviewer,
    "security": SecurityReviewer,
    "software-engineering": SoftwareEngineeringReviewer,
    "system-administration": SystemAdministrationReviewer,
}

if FrontendDevelopmentReviewer:
    DOMAIN_REGISTRY["frontend-development"] = FrontendDevelopmentReviewer
if GamesDevelopmentReviewer:
    DOMAIN_REGISTRY["games-development"] = GamesDevelopmentReviewer
if UIUXOptimizationReviewer:
    DOMAIN_REGISTRY["ui-ux-optimization"] = UIUXOptimizationReviewer


def get_reviewer_for_domain(domain: str):
    """Return the reviewer class for a given domain slug."""
    normalized = domain.lower().strip().replace("_", "-").replace(" ", "-")
    cls = DOMAIN_REGISTRY.get(normalized)
    if cls is None:
        raise ValueError(
            f"No reviewer registered for domain '{domain}'. "
            f"Available: {sorted(DOMAIN_REGISTRY.keys())}"
        )
    return cls
