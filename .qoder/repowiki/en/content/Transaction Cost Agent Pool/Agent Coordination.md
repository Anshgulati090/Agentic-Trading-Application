# Agent Coordination

<cite>
**Referenced Files in This Document**
- [core.py](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py)
- [memory_bridge.py](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py)
- [registry.py](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py)
- [config_loader.py](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py)
- [cost_models.py](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py)
- [mcp_config.yaml](file://FinAgents/agent_pools/alpha_agent_pool/mcp_config.yaml)
- [gateway_config.yaml](file://FinAgents/agent_pools/alpha_agent_pool/gateway_config.yaml)
- [orchestrator.py](file://FinAgents/agent_pools/alpha_agent_pool/core/services/orchestrator.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the agent coordination and orchestration system for transaction cost agents. It explains how the central orchestrator manages lifecycle, communication, and resource allocation across transaction cost agents, integrates the MCP protocol for inter-agent and external system communication, and coordinates persistent state via the memory bridge. It also documents registry patterns for dynamic agent discovery and load balancing, and provides configuration examples and fault tolerance strategies for multi-agent deployments.

## Project Structure
The transaction cost agent pool centers around a cohesive orchestration engine that exposes MCP tools, maintains agent registries, and integrates with a memory bridge for persistent state and cross-agent data sharing. Supporting modules define configuration schemas and data models for cost analysis.

```mermaid
graph TB
subgraph "Transaction Cost Agent Pool"
A["core.py<br/>Central Orchestrator"]
B["registry.py<br/>Agent Registry"]
C["memory_bridge.py<br/>Memory Bridge"]
D["config_loader.py<br/>Configuration Loader"]
E["schema/cost_models.py<br/>Data Models"]
end
subgraph "External Systems"
F["MCP Clients/Servers"]
G["Memory Agent (External)"]
end
A --> B
A --> C
A --> D
A --> E
A -. "MCP Tools" .-> F
C --> G
```

**Diagram sources**
- [core.py:64-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L64-L120)
- [registry.py:96-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L96-L120)
- [memory_bridge.py:94-145](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L94-L145)
- [config_loader.py:112-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L112-L187)
- [cost_models.py:227-267](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L227-L267)

**Section sources**
- [core.py:18-50](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L18-L50)
- [registry.py:18-29](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L18-L29)
- [memory_bridge.py:21-30](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L21-L30)
- [config_loader.py:19-28](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L19-L28)

## Core Components
- Central Orchestrator: Manages agent lifecycle, exposes MCP tools for external orchestration, tracks performance, and integrates memory logging.
- Agent Registry: Provides dynamic registration, capability-based discovery, and status tracking for agents.
- Memory Bridge: Integrates with an external memory agent for persistent state, event logging, and cross-agent data sharing.
- Configuration Loader: Loads and validates pool-wide configuration from files and environment variables.
- Data Models: Defines transaction cost, cost breakdown, market impact, execution metrics, and performance benchmarks.

**Section sources**
- [core.py:64-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L64-L120)
- [registry.py:96-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L96-L120)
- [memory_bridge.py:94-145](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L94-L145)
- [config_loader.py:112-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L112-L187)
- [cost_models.py:66-267](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L66-L267)

## Architecture Overview
The orchestrator runs an MCP server and registers tools for cost estimation, execution analysis, portfolio optimization, and risk-adjusted cost calculations. It maintains agent status and performance metrics, and logs events to an external memory agent when available. The registry enables dynamic discovery and selection of agents by capability. The memory bridge persists and retrieves cost models, execution results, and optimization events, and supports querying historical data.

```mermaid
sequenceDiagram
participant Ext as "External Orchestrator"
participant MCP as "FastMCP Server"
participant Pool as "TransactionCostAgentPool"
participant Reg as "Agent Registry"
participant Mem as "Memory Bridge"
Ext->>MCP : "estimate_transaction_cost(...)"
MCP->>Pool : "Dispatch tool"
Pool->>Reg : "Select best agent by capability"
Reg-->>Pool : "AgentConfiguration"
Pool->>Pool : "Invoke agent method"
Pool->>Mem : "Log event (optional)"
Mem-->>Pool : "Event logged"
Pool-->>MCP : "Result"
MCP-->>Ext : "Response"
```

**Diagram sources**
- [core.py:151-414](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L151-L414)
- [registry.py:276-316](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L276-L316)
- [memory_bridge.py:146-184](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L146-L184)

## Detailed Component Analysis

### Central Orchestrator
The orchestrator initializes MCP endpoints, manages agent threads and adapters, tracks status and performance, and integrates memory logging. It exposes tools for cost estimation, execution analysis, portfolio optimization, and risk-adjusted cost calculations. It calculates average response time and error rates for monitoring.

```mermaid
classDiagram
class TransactionCostAgentPool {
+string pool_id
+dict config
+dict agents
+dict agent_threads
+dict agent_adapters
+dict agent_status
+dict performance_metrics
+FastMCP mcp
+ExternalMemoryAgent memory_agent
+string session_id
+__init__(pool_id, config)
+start_mcp_server(host, port)
+initialize_agent(agent_id, agent_config) bool
+shutdown() void
-_register_mcp_endpoints() void
-_initialize_memory_agent() void
-_log_memory_event(event_type, description, metadata) void
-_update_performance_metrics(operation, result) void
-_calculate_average_response_time() float
-_calculate_error_rate() float
}
```

**Diagram sources**
- [core.py:64-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L64-L120)
- [core.py:151-414](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L151-L414)
- [core.py:470-536](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L470-L536)

**Section sources**
- [core.py:82-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L82-L120)
- [core.py:537-554](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L537-L554)
- [core.py:584-605](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L584-L605)

### MCP Protocol Integration
The orchestrator registers MCP tools that external clients can invoke. Tools include cost estimation, execution quality analysis, portfolio optimization, and risk-adjusted cost calculations. The orchestrator sets request context, selects agents by capability, invokes methods, updates performance metrics, and returns structured results. It also starts an MCP server for SSE transport.

```mermaid
sequenceDiagram
participant Client as "MCP Client"
participant Server as "FastMCP Server"
participant Tool as "Registered Tool"
participant Agent as "Selected Agent"
Client->>Server : "Tool Invocation"
Server->>Tool : "Dispatch with parameters"
Tool->>Tool : "Set request context"
Tool->>Agent : "Invoke method"
Tool->>Tool : "Update performance metrics"
Tool-->>Server : "Structured result"
Server-->>Client : "Response"
```

**Diagram sources**
- [core.py:159-414](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L159-L414)
- [core.py:537-554](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L537-L554)

**Section sources**
- [core.py:151-414](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L151-L414)
- [mcp_config.yaml:1-6](file://FinAgents/agent_pools/alpha_agent_pool/mcp_config.yaml#L1-L6)

### Memory Bridge Functionality
The memory bridge integrates with an external memory agent to store and retrieve cost models, log execution results and optimization events, and query historical data. It supports unified logging with event types and log levels, and provides convenience functions for common operations. It maintains a session ID and namespace for scoping.

```mermaid
flowchart TD
Start(["Operation Entry"]) --> Choose["Choose Operation<br/>store/retrieve/log/query"]
Choose --> Store["Store Cost Model"]
Choose --> Retrieve["Retrieve Cost Model"]
Choose --> LogExec["Log Execution Result"]
Choose --> LogOpt["Log Optimization Event"]
Choose --> QueryHist["Query Historical Executions"]
Store --> EM["External Memory Agent"]
Retrieve --> EM
LogExec --> Batch["Batch Log Events"]
LogOpt --> Batch
QueryHist --> Filter["Build Query Filter"]
Filter --> EM
EM --> Done(["Return Result"])
```

**Diagram sources**
- [memory_bridge.py:185-594](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L185-L594)

**Section sources**
- [memory_bridge.py:94-145](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L94-L145)
- [memory_bridge.py:146-184](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L146-L184)
- [memory_bridge.py:320-438](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L320-L438)
- [memory_bridge.py:439-543](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L439-L543)

### Registry Patterns for Dynamic Discovery and Load Balancing
The registry maintains agent configurations, capability indices, and type indices. It supports registering/deregistering agents, discovering agents by type or capability, selecting the best agent based on performance criteria, updating statuses, exporting/importing configurations, and validating consistency.

```mermaid
classDiagram
class AgentRegistry {
+dict _agents
+dict _agent_instances
+dict _capability_index
+dict _type_index
+register_agent(...) bool
+deregister_agent(agent_id) bool
+get_agent(agent_id) AgentConfiguration
+get_agents_by_type(agent_type) AgentConfiguration[]
+get_agents_by_capability(capability_name) AgentConfiguration[]
+find_best_agent(capability_name, criteria) AgentConfiguration
+update_agent_status(agent_id, status) bool
+get_registry_stats() dict
+export_configuration(path) bool
+load_configuration(path) bool
}
class AgentConfiguration {
+string agent_id
+AgentType agent_type
+string class_name
+string module_path
+string description
+AgentCapability[] capabilities
+dict config_params
+string[] dependencies
+dict resource_requirements
+AgentStatus status
+string created_at
+string last_updated
}
AgentRegistry --> AgentConfiguration : "manages"
```

**Diagram sources**
- [registry.py:96-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L96-L120)
- [registry.py:130-196](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L130-L196)
- [registry.py:238-275](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L238-L275)
- [registry.py:276-316](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L276-L316)
- [registry.py:358-382](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L358-L382)
- [registry.py:383-414](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L383-L414)
- [registry.py:416-523](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L416-L523)

**Section sources**
- [registry.py:30-95](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L30-L95)
- [registry.py:525-544](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L525-L544)

### Configuration Management
The configuration loader aggregates pool-level settings, agent configurations, venue configurations, cost model configurations, optimization configurations, and risk management settings. It loads from YAML/JSON files, applies environment variable overrides, validates configuration, and supports dynamic reloads.

```mermaid
flowchart TD
Load["Load Base Config"] --> Agents["Load Agent Configs"]
Load --> Venues["Load Venue Configs"]
Load --> Models["Load Cost Model Configs"]
Load --> Opt["Load Optimization Configs"]
Load --> Risk["Load Risk Config"]
Agents --> Merge["Merge All Configs"]
Venues --> Merge
Models --> Merge
Opt --> Merge
Risk --> Merge
Merge --> Env["Apply Env Overrides"]
Env --> Validate["Validate Config"]
Validate --> Cache["Cache & Return"]
```

**Diagram sources**
- [config_loader.py:131-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L131-L187)
- [config_loader.py:188-509](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L188-L509)
- [config_loader.py:510-554](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L510-L554)
- [config_loader.py:570-597](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L570-L597)
- [config_loader.py:598-638](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L598-L638)

**Section sources**
- [config_loader.py:112-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L112-L187)
- [config_loader.py:598-638](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L598-L638)

### Data Models for Transaction Cost Analysis
The schema defines foundational models for transaction cost analysis, including cost components, cost breakdowns, market impact models, execution metrics, performance benchmarks, and cost attribution. These models support validation and consistent serialization.

```mermaid
classDiagram
class TransactionCost {
+string trade_id
+string symbol
+AssetClass asset_class
+OrderSide order_side
+OrderType order_type
+float quantity
+CurrencyCode currency
+string venue
+VenueType venue_type
+CostBreakdown cost_breakdown
+MarketImpactModel market_impact_model
+ExecutionMetrics execution_metrics
+PerformanceBenchmark[] benchmarks
+CostAttribute[] cost_attribution
+datetime analysis_timestamp
+string analyst_id
+string analysis_version
+float data_quality_score
+string validation_status
+string validation_notes
}
class CostBreakdown {
+Decimal total_cost
+float total_cost_bps
+CurrencyCode currency
+CostComponent commission
+CostComponent spread
+CostComponent market_impact
+CostComponent taxes
+CostComponent fees
+CostComponent borrowing_cost
+CostComponent opportunity_cost
+CostComponent[] other_components
+datetime calculation_timestamp
+string model_version
}
class MarketImpactModel {
+string model_name
+string model_type
+MarketImpactParameters parameters
+float temporary_impact
+float permanent_impact
+float total_impact
+dict confidence_interval
+float model_accuracy
+datetime last_calibration
}
TransactionCost --> CostBreakdown
TransactionCost --> MarketImpactModel
```

**Diagram sources**
- [cost_models.py:66-115](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L66-L115)
- [cost_models.py:132-152](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L132-L152)
- [cost_models.py:227-267](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L227-L267)

**Section sources**
- [cost_models.py:24-66](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L24-L66)
- [cost_models.py:66-115](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L66-L115)
- [cost_models.py:132-152](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L132-L152)
- [cost_models.py:227-267](file://FinAgents/agent_pools/transaction_cost_agent_pool/schema/cost_models.py#L227-L267)

### Conceptual Overview
The orchestrator coordinates transaction cost agents through MCP tools, maintains a registry for dynamic discovery, and persists state via the memory bridge. External systems integrate via MCP endpoints configured in YAML files. The system supports multi-agent deployments with configuration-driven scaling and fault tolerance.

```mermaid
graph TB
subgraph "Orchestrator Layer"
O["Orchestrator"]
R["Registry"]
M["Memory Bridge"]
end
subgraph "Agent Layer"
A1["Pre-Trade Agents"]
A2["Post-Trade Agents"]
A3["Optimization Agents"]
A4["Risk-Adjusted Agents"]
end
subgraph "External Layer"
X["MCP Clients"]
Y["External Memory Agent"]
end
O --> R
O --> M
R --> A1
R --> A2
R --> A3
R --> A4
O -. "MCP Tools" .-> X
M --> Y
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

## Dependency Analysis
The orchestrator depends on the registry for agent discovery and the memory bridge for persistent state. The configuration loader supplies runtime settings. The MCP configuration files define client/server endpoints for inter-agent communication.

```mermaid
graph LR
Core["core.py"] --> Reg["registry.py"]
Core --> MB["memory_bridge.py"]
Core --> CL["config_loader.py"]
Core --> CM["schema/cost_models.py"]
MCPCfg["mcp_config.yaml"] -. "client/server URLs" .-> Core
GW["gateway_config.yaml"] -. "orchestration settings" .-> Core
```

**Diagram sources**
- [core.py:64-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L64-L120)
- [registry.py:96-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L96-L120)
- [memory_bridge.py:94-145](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L94-L145)
- [config_loader.py:112-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L112-L187)
- [mcp_config.yaml:1-6](file://FinAgents/agent_pools/alpha_agent_pool/mcp_config.yaml#L1-L6)
- [gateway_config.yaml:1-146](file://FinAgents/agent_pools/alpha_agent_pool/gateway_config.yaml#L1-L146)

**Section sources**
- [core.py:64-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L64-L120)
- [registry.py:96-120](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L96-L120)
- [memory_bridge.py:94-145](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L94-L145)
- [config_loader.py:112-187](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L112-L187)
- [mcp_config.yaml:1-6](file://FinAgents/agent_pools/alpha_agent_pool/mcp_config.yaml#L1-L6)
- [gateway_config.yaml:1-146](file://FinAgents/agent_pools/alpha_agent_pool/gateway_config.yaml#L1-L146)

## Performance Considerations
- Use the registry’s capability-based selection to route requests to the most suitable agent, reducing latency and improving accuracy.
- Monitor performance metrics exposed by the orchestrator to identify bottlenecks and adjust concurrency limits.
- Enable memory logging to external memory agent for observability and historical trend analysis.
- Tune MCP server settings (host/port/transport) for optimal throughput and low latency.
- Validate configuration to ensure resource requirements align with deployment capacity.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- MCP server startup failures: Verify host/port availability and transport settings; check orchestrator logs for exceptions.
- Memory agent unavailability: Confirm external memory agent connectivity and session initialization; fallback behavior is handled gracefully.
- Agent registration errors: Validate agent configurations and capabilities; ensure unique agent IDs and correct types.
- Configuration loading/validation failures: Check YAML/JSON syntax and environment overrides; use validation results to identify missing or invalid fields.
- Performance degradation: Review error rates and response times; scale agents horizontally and adjust timeouts.

**Section sources**
- [core.py:537-554](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L537-L554)
- [core.py:121-134](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L121-L134)
- [registry.py:197-237](file://FinAgents/agent_pools/transaction_cost_agent_pool/registry.py#L197-L237)
- [config_loader.py:598-638](file://FinAgents/agent_pools/transaction_cost_agent_pool/config_loader.py#L598-L638)

## Conclusion
The transaction cost agent pool orchestrator provides a robust foundation for coordinating specialized agents across pre-trade, post-trade, optimization, and risk-adjusted domains. Through MCP integration, dynamic registry patterns, and a memory bridge for persistent state, it enables scalable, observable, and fault-tolerant multi-agent deployments. Configuration-driven settings and validation ensure reliable operation across environments.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Configuration Examples
- MCP client/server configuration: See MCP configuration for server endpoints and transport settings.
- Gateway orchestration: See gateway configuration for internal agent endpoints, memory coordination, orchestration defaults, and monitoring settings.

**Section sources**
- [mcp_config.yaml:1-6](file://FinAgents/agent_pools/alpha_agent_pool/mcp_config.yaml#L1-L6)
- [gateway_config.yaml:1-146](file://FinAgents/agent_pools/alpha_agent_pool/gateway_config.yaml#L1-L146)

### Fault Tolerance Strategies
- Graceful shutdown: The orchestrator updates agent status and stops threads on shutdown.
- Health checks and retries: Use gateway configuration to set ping timeouts, retry attempts, and monitoring intervals.
- External memory resilience: The memory bridge logs events and falls back when external memory is unavailable.

**Section sources**
- [core.py:584-605](file://FinAgents/agent_pools/transaction_cost_agent_pool/core.py#L584-L605)
- [gateway_config.yaml:88-106](file://FinAgents/agent_pools/alpha_agent_pool/gateway_config.yaml#L88-L106)
- [memory_bridge.py:146-184](file://FinAgents/agent_pools/transaction_cost_agent_pool/memory_bridge.py#L146-L184)