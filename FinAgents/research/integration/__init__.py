"""Integration layer for the FinAgents research modules."""

from FinAgents.research.integration.system_integrator import (
    ResearchSystem,
    ResearchSystemConfig,
    ResearchSystemIntegrator,
)
from FinAgents.research.integration.demo_runner import run_demo
from FinAgents.research.integration.research_report import (
    ResearchReport,
    ResearchReportGenerator,
)
from FinAgents.research.integration.future_work_suite import (
    BroaderSignalContextProvider,
    FutureWorkScenario,
    FutureWorkVariant,
    ReplicationArtifactWriter,
    run_future_work_suite,
)

__all__ = [
    "ResearchSystem",
    "ResearchSystemConfig",
    "ResearchSystemIntegrator",
    "run_demo",
    "ResearchReport",
    "ResearchReportGenerator",
    "BroaderSignalContextProvider",
    "FutureWorkScenario",
    "FutureWorkVariant",
    "ReplicationArtifactWriter",
    "run_future_work_suite",
]
