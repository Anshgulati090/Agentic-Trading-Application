# Operational Risk Controls

<cite>
**Referenced Files in This Document**
- [operational_risk.py](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py)
- [registry.py](file://FinAgents/agent_pools/risk_agent_pool/registry.py)
- [README.md](file://FinAgents/agent_pools/risk_agent_pool/README.md)
- [example_demo.py](file://FinAgents/agent_pools/risk_agent_pool/example_demo.py)
- [test_integration.py](file://FinAgents/agent_pools/risk_agent_pool/test_integration.py)
- [risk_engine.py](file://backend/risk/risk_engine.py)
- [circuit_breaker.py](file://backend/risk/circuit_breaker.py)
- [constraints.py](file://FinAgents/research/risk_compliance/constraints.py)
- [compliance_engine.py](file://FinAgents/research/risk_compliance/compliance_engine.py)
- [regulatory_checks.py](file://FinAgents/research/risk_compliance/regulatory_checks.py)
- [risk_dashboard.py](file://FinAgents/research/risk_compliance/risk_dashboard.py)
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
This document describes the Operational Risk Controls agent and related systems within the Agentic Trading Application. It explains how operational risk assessments are performed, how fraud detection and key risk indicators (KRIs) are monitored, and how operational VaR and scenario testing are supported. It also covers integration points with the broader risk control framework, including pre/post-trade compliance, constraint enforcement, circuit breakers, and dashboards for risk reporting.

## Project Structure
The Operational Risk Controls capability is implemented as part of the Risk Agent Pool, with specialized agents for operational risk, alongside market, credit, and other risk types. Supporting backend risk controls and compliance engines provide pre-trade validation, constraint management, and circuit breaker safeguards.

```mermaid
graph TB
subgraph "Risk Agent Pool"
ORA["OperationalRiskAnalyzer<br/>agents/operational_risk.py"]
ORA_REG["OperationalRiskAgent<br/>registry.py"]
end
subgraph "Backend Risk Controls"
RE["RiskEngine<br/>backend/risk/risk_engine.py"]
CB["TradingCircuitBreaker<br/>backend/risk/circuit_breaker.py"]
end
subgraph "Compliance & Constraints"
CE["ComplianceEngine<br/>FinAgents/research/risk_compliance/compliance_engine.py"]
CONS["ConstraintManager<br/>FinAgents/research/risk_compliance/constraints.py"]
REG["RegulatoryChecker<br/>FinAgents/research/risk_compliance/regulatory_checks.py"]
DASH["RiskDashboard<br/>FinAgents/research/risk_compliance/risk_dashboard.py"]
end
ORA_REG --> ORA
ORA_REG --> RE
RE --> CB
CE --> CONS
DASH --> CE
DASH --> CONS
```

**Diagram sources**
- [operational_risk.py:53-529](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L53-L529)
- [registry.py:473-500](file://FinAgents/agent_pools/risk_agent_pool/registry.py#L473-L500)
- [risk_engine.py:22-226](file://backend/risk/risk_engine.py#L22-L226)
- [circuit_breaker.py:59-360](file://backend/risk/circuit_breaker.py#L59-L360)
- [constraints.py:648-742](file://FinAgents/research/risk_compliance/constraints.py#L648-L742)
- [compliance_engine.py:82-530](file://FinAgents/research/risk_compliance/compliance_engine.py#L82-L530)
- [regulatory_checks.py:155-547](file://FinAgents/research/risk_compliance/regulatory_checks.py#L155-L547)
- [risk_dashboard.py:108-616](file://FinAgents/research/risk_compliance/risk_dashboard.py#L108-L616)

**Section sources**
- [README.md:1-490](file://FinAgents/agent_pools/risk_agent_pool/README.md#L1-L490)

## Core Components
- OperationalRiskAnalyzer: Implements operational risk event recording, metrics computation, fraud risk scoring, KRI monitoring, operational VaR calculation, and scenario analysis.
- OperationalRiskAgent: Orchestrates operational risk analysis tasks and delegates to OperationalRiskAnalyzer.
- RiskEngine: Enforces pre-trade risk controls, stop-loss calculation, and position sizing with optional circuit breaker integration.
- TradingCircuitBreaker: Enforces emergency trading halts and position reductions based on drawdown, daily/weekly losses, and volatility.
- ComplianceEngine and ConstraintManager: Provide pre- and post-trade constraint checks, breach handling, and risk summaries.
- RegulatoryChecker: Applies regulatory-style validations (e.g., wash sale, PDT, short sale, reporting thresholds).
- RiskDashboard: Aggregates risk metrics, limit utilization, breach history, and risk budgets for reporting.

**Section sources**
- [operational_risk.py:53-529](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L53-L529)
- [registry.py:473-500](file://FinAgents/agent_pools/risk_agent_pool/registry.py#L473-L500)
- [risk_engine.py:22-226](file://backend/risk/risk_engine.py#L22-L226)
- [circuit_breaker.py:59-360](file://backend/risk/circuit_breaker.py#L59-L360)
- [constraints.py:648-742](file://FinAgents/research/risk_compliance/constraints.py#L648-L742)
- [compliance_engine.py:82-530](file://FinAgents/research/risk_compliance/compliance_engine.py#L82-L530)
- [regulatory_checks.py:155-547](file://FinAgents/research/risk_compliance/regulatory_checks.py#L155-L547)
- [risk_dashboard.py:108-616](file://FinAgents/research/risk_compliance/risk_dashboard.py#L108-L616)

## Architecture Overview
The Operational Risk Controls architecture integrates:
- Operational risk analysis via OperationalRiskAnalyzer and OperationalRiskAgent
- Pre-trade risk gating via RiskEngine and ComplianceEngine
- Real-time safety via TradingCircuitBreaker
- Regulatory checks via RegulatoryChecker
- Reporting via RiskDashboard

```mermaid
sequenceDiagram
participant Client as "Client"
participant ORA as "OperationalRiskAgent"
participant Analyzer as "OperationalRiskAnalyzer"
participant RE as "RiskEngine"
participant CB as "TradingCircuitBreaker"
participant CE as "ComplianceEngine"
Client->>ORA : "fraud_assessment" or "kri_monitoring" or "metrics"
ORA->>Analyzer : "assess_fraud_risk()" or "monitor_key_risk_indicators()" or "calculate_operational_metrics()"
Analyzer-->>ORA : "results"
ORA-->>Client : "analysis results"
Client->>RE : "validate_trade()/calculate_position_size()"
RE->>CB : "should_allow_trade()/record_trade()"
CB-->>RE : "allowance/status"
RE-->>Client : "trade approval/size"
Client->>CE : "pre_trade_check()"
CE-->>Client : "approval/modifications"
```

**Diagram sources**
- [registry.py:473-500](file://FinAgents/agent_pools/risk_agent_pool/registry.py#L473-L500)
- [operational_risk.py:191-315](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L191-L315)
- [risk_engine.py:72-221](file://backend/risk/risk_engine.py#L72-L221)
- [circuit_breaker.py:235-302](file://backend/risk/circuit_breaker.py#L235-L302)
- [compliance_engine.py:118-184](file://FinAgents/research/risk_compliance/compliance_engine.py#L118-L184)

## Detailed Component Analysis

### Operational Risk Analyzer
The OperationalRiskAnalyzer provides:
- Event recording with attributes such as event type, severity, impact amount, business line, and timestamps.
- Operational metrics computation including counts, totals, averages, frequency by type, losses by business line, severity distribution, average resolution time, and trend analysis.
- Fraud risk scoring based on transaction amount, frequency, geography, time-of-day, and deviations from historical patterns, returning a risk level and recommendation.
- KRI monitoring against configurable thresholds for system downtime, failed transaction percentage, staff turnover, compliance violations, and monthly fraud incidents.
- Operational VaR calculation using a loss distribution approach with log-normal fitting and time horizon scaling.
- Scenario analysis by applying severity and frequency multipliers to historical event subsets and aggregating additional losses.

```mermaid
classDiagram
class OperationalRiskEvent {
+string event_id
+string event_type
+string severity
+float impact_amount
+string business_line
+datetime event_date
+datetime resolution_date
+string description
+string root_cause
+string[] mitigation_actions
}
class OpRiskMetrics {
+int total_events
+float total_losses
+float avg_loss_per_event
+Dict~string,int~ frequency_by_type
+Dict~string,float~ losses_by_business_line
+Dict~string,int~ severity_distribution
+float resolution_time_avg
+Dict~string,float~ trend_analysis
}
class OperationalRiskAnalyzer {
+OperationalRiskEvent[] events_history
+Dict~string,float~ kri_thresholds
+record_operational_event(event_data) OperationalRiskEvent
+calculate_operational_metrics(start_date,end_date) OpRiskMetrics
+assess_fraud_risk(transaction_data) Dict
+monitor_key_risk_indicators(current_metrics) Dict
+calculate_operational_var(confidence_level,time_horizon_days) Dict
+scenario_analysis(scenarios) Dict
}
OperationalRiskAnalyzer --> OperationalRiskEvent : "records"
OperationalRiskAnalyzer --> OpRiskMetrics : "computes"
```

**Diagram sources**
- [operational_risk.py:21-529](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L21-L529)

**Section sources**
- [operational_risk.py:53-529](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L53-L529)

### Fraud Detection Integration
The fraud detection module evaluates transaction risk by combining multiple signals:
- Amount thresholding
- Frequency analysis
- Geographic risk scoring
- Time-of-day anomaly detection
- Deviation from user-specific behavioral patterns

It returns a normalized risk score, a risk level, identified risk factors, a recommendation, and a flag indicating whether manual review is required.

```mermaid
flowchart TD
Start(["Transaction Data"]) --> A["Amount > threshold?"]
A --> |Yes| R1["+weight"]
A --> |No| A2["Next Factor"]
R1 --> A2["Frequency > threshold?"]
A2 --> |Yes| R2["+weight"]
A2 --> |No| A3["Geography high-risk?"]
R2 --> A3["Time off-hours?"]
A3 --> |Yes| R3["+weight"]
A3 --> |No| A4["Deviates from user pattern?"]
A4 --> |Yes| R4["+weight"]
A4 --> |No| Lvl["Compute Risk Level"]
R3 --> Lvl["Compute Risk Level"]
R4 --> Lvl["Compute Risk Level"]
Lvl --> Rec["Recommendation & Review Flag"]
Rec --> End(["Return Fraud Risk"])
```

**Diagram sources**
- [operational_risk.py:191-257](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L191-L257)

**Section sources**
- [operational_risk.py:191-257](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L191-L257)

### Key Risk Indicator (KRI) Monitoring
The KRI monitoring compares current metric values against predefined thresholds and emits alerts when breaches occur. It computes breach percentages and overall status, enabling rapid escalation.

```mermaid
flowchart TD
KStart(["Current Metrics"]) --> Loop["For each KRI"]
Loop --> Check["Threshold exists?"]
Check --> |No| NoThresh["Mark NO_THRESHOLD"]
Check --> |Yes| Breach["Value > Threshold?"]
Breach --> |Yes| Alert["Create Alert<br/>Severity by Overrun"]
Breach --> |No| Normal["Mark NORMAL"]
Alert --> Next["Next KRI"]
Normal --> Next
NoThresh --> Next
Next --> Done{"More KRIs?"}
Done --> |Yes| Loop
Done --> |No| KEnd["Return Status & Alerts"]
```

**Diagram sources**
- [operational_risk.py:259-315](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L259-L315)

**Section sources**
- [operational_risk.py:259-315](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L259-L315)

### Operational VaR and Scenario Testing
Operational VaR is computed from historical loss distributions:
- Extracts positive losses, fits a log-normal distribution, and scales for the time horizon.
- Returns expected loss, unexpected loss, and distribution parameters.

Scenario testing multiplies baseline losses and frequencies by scenario-specific severity and frequency multipliers, aggregating additional losses and identifying the most severe scenario.

```mermaid
flowchart TD
SVStart(["Events History"]) --> Losses["Filter positive losses"]
Losses --> Dist["Fit log-normal (mu,sigma)"]
Dist --> Scale["Scale by sqrt(T/365)"]
Scale --> SVOut["Operational VaR + EL + UL + Params"]
STStart(["Scenarios"]) --> Baseline["Select relevant events by type"]
Baseline --> Stress["Apply severity & frequency multipliers"]
Stress --> Aggregate["Sum additional losses"]
Aggregate --> STOut["Results + Most Severe Scenario"]
```

**Diagram sources**
- [operational_risk.py:317-457](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L317-L457)

**Section sources**
- [operational_risk.py:317-457](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L317-L457)

### Pre-Trade Risk Controls and Circuit Breakers
Pre-trade validation ensures:
- Position size within per-position and portfolio exposure limits
- Stop-loss price calculation
- Optional circuit breaker gating

Circuit breakers enforce emergency halts and position reductions based on:
- Daily and weekly loss limits
- Maximum drawdown
- Consecutive losses
- Extreme volatility

```mermaid
sequenceDiagram
participant Trader as "Trader"
participant RE as "RiskEngine"
participant CB as "CircuitBreaker"
Trader->>RE : "validate_trade(portfolio_value, exposure, size)"
RE->>CB : "should_allow_trade()"
CB-->>RE : "allow/deny + reason"
RE-->>Trader : "approved/denied"
RE->>RE : "calculate_stop_loss(entry, dir)"
RE->>RE : "calculate_position_size(value, vol, adj)"
RE->>CB : "record_trade(pnl)"
CB-->>RE : "status updates"
```

**Diagram sources**
- [risk_engine.py:72-221](file://backend/risk/risk_engine.py#L72-L221)
- [circuit_breaker.py:116-302](file://backend/risk/circuit_breaker.py#L116-L302)

**Section sources**
- [risk_engine.py:22-226](file://backend/risk/risk_engine.py#L22-L226)
- [circuit_breaker.py:59-360](file://backend/risk/circuit_breaker.py#L59-L360)

### Compliance and Regulatory Checks
ComplianceEngine performs pre- and post-trade constraint checks, generates corrective actions, and maintains breach history. ConstraintManager enforces:
- MaxDrawdown
- PositionSize
- Concentration
- Turnover
- Correlation

RegulatoryChecker evaluates:
- Wash sale rules
- Pattern Day Trading
- Short selling restrictions
- Position reporting thresholds

RiskDashboard aggregates risk metrics, limit utilization, breach history, and risk budgets for reporting.

```mermaid
classDiagram
class ConstraintManager {
+add_constraint(constraint)
+remove_constraint(name)
+check_all(state, trade) ConstraintReport
}
class ComplianceEngine {
+pre_trade_check(state, trade) ComplianceDecision
+post_trade_check(state) ComplianceReport
+breach_handler(breach, state) BreachResponse
+generate_compliance_report(state, period) Dict
}
class RegulatoryChecker {
+check_wash_sale(history, trade, window) WashSaleResult
+check_pattern_day_trading(history, window) PDTResult
+check_short_selling(trade, state) ShortSellResult
+check_position_reporting(state, threshold) ReportingResult
+run_all_regulatory_checks(history, trade, state) RegulatoryReport
}
class RiskDashboard {
+get_real_time_risk_metrics(state) RiskMetrics
+get_limit_utilization(state) LimitUtilization[]
+get_breach_history(start,end) BreachRecord[]
+log_breach(name,severity,details,resolution)
+get_risk_budget(state,total_budget) RiskBudget
+get_dashboard_summary(state) Dict
}
ComplianceEngine --> ConstraintManager : "uses"
RiskDashboard --> ComplianceEngine : "consumes"
RiskDashboard --> ConstraintManager : "consumes"
```

**Diagram sources**
- [constraints.py:648-742](file://FinAgents/research/risk_compliance/constraints.py#L648-L742)
- [compliance_engine.py:82-530](file://FinAgents/research/risk_compliance/compliance_engine.py#L82-L530)
- [regulatory_checks.py:155-547](file://FinAgents/research/risk_compliance/regulatory_checks.py#L155-L547)
- [risk_dashboard.py:108-616](file://FinAgents/research/risk_compliance/risk_dashboard.py#L108-L616)

**Section sources**
- [constraints.py:147-742](file://FinAgents/research/risk_compliance/constraints.py#L147-L742)
- [compliance_engine.py:82-530](file://FinAgents/research/risk_compliance/compliance_engine.py#L82-L530)
- [regulatory_checks.py:155-547](file://FinAgents/research/risk_compliance/regulatory_checks.py#L155-L547)
- [risk_dashboard.py:108-616](file://FinAgents/research/risk_compliance/risk_dashboard.py#L108-L616)

## Dependency Analysis
Operational risk controls depend on:
- OperationalRiskAnalyzer for event processing, metrics, fraud scoring, KRI monitoring, VaR, and scenario analysis
- RiskEngine and TradingCircuitBreaker for pre-trade gating and emergency controls
- ComplianceEngine and ConstraintManager for constraint enforcement and breach handling
- RegulatoryChecker for regulatory-style validations
- RiskDashboard for consolidated reporting

```mermaid
graph LR
ORA["OperationalRiskAnalyzer"] --> RE["RiskEngine"]
ORA --> CE["ComplianceEngine"]
RE --> CB["TradingCircuitBreaker"]
CE --> CONS["ConstraintManager"]
DASH["RiskDashboard"] --> CE
DASH --> CONS
DASH --> REG["RegulatoryChecker"]
```

**Diagram sources**
- [operational_risk.py:53-529](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L53-L529)
- [risk_engine.py:22-226](file://backend/risk/risk_engine.py#L22-L226)
- [circuit_breaker.py:59-360](file://backend/risk/circuit_breaker.py#L59-L360)
- [compliance_engine.py:82-530](file://FinAgents/research/risk_compliance/compliance_engine.py#L82-L530)
- [constraints.py:648-742](file://FinAgents/research/risk_compliance/constraints.py#L648-L742)
- [regulatory_checks.py:155-547](file://FinAgents/research/risk_compliance/regulatory_checks.py#L155-L547)
- [risk_dashboard.py:108-616](file://FinAgents/research/risk_compliance/risk_dashboard.py#L108-L616)

**Section sources**
- [registry.py:473-500](file://FinAgents/agent_pools/risk_agent_pool/registry.py#L473-L500)
- [README.md:175-194](file://FinAgents/agent_pools/risk_agent_pool/README.md#L175-L194)

## Performance Considerations
- Asynchronous processing enables non-blocking operations for risk computations.
- KPI aggregation and VaR calculations rely on vectorized operations for efficiency.
- Circuit breaker and constraint checks are lightweight and designed for real-time gating.
- Recommendation: cache frequently accessed thresholds and leverage batch processing for large-scale event histories.

## Troubleshooting Guide
Common issues and resolutions:
- Operational risk analysis errors: Inspect logs for exceptions during metrics computation, fraud assessment, or KRI monitoring.
- Trade validation failures: Review max position, exposure, and circuit breaker status.
- Constraint breaches: Use ComplianceEngine’s breach handler to generate corrective actions and update risk parameters.
- Regulatory check warnings: Address wash sale, PDT, short sale, or reporting threshold concerns promptly.

**Section sources**
- [operational_risk.py:187-189](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L187-L189)
- [operational_risk.py:255-257](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L255-L257)
- [operational_risk.py:313-315](file://FinAgents/agent_pools/risk_agent_pool/agents/operational_risk.py#L313-L315)
- [risk_engine.py:124-126](file://backend/risk/risk_engine.py#L124-L126)
- [compliance_engine.py:358-436](file://FinAgents/research/risk_compliance/compliance_engine.py#L358-L436)

## Conclusion
The Operational Risk Controls agent provides a comprehensive foundation for operational risk management, integrating fraud detection, KRI monitoring, operational VaR, and scenario testing. It is tightly coupled with pre-trade risk controls, constraint enforcement, regulatory checks, and risk reporting, ensuring robust oversight and timely intervention.

## Appendices

### Operational Risk Controls API Usage
- Fraud assessment: Provide transaction data to receive risk score, level, factors, recommendation, and review flag.
- KRI monitoring: Supply current KRI values to receive status, alerts, and overall status.
- Metrics computation: Provide optional date range to compute operational risk metrics.
- Operational VaR: Configure confidence level and time horizon for VaR estimates.
- Scenario analysis: Define scenarios with event types and multipliers to estimate additional losses.

**Section sources**
- [README.md:175-194](file://FinAgents/agent_pools/risk_agent_pool/README.md#L175-L194)
- [example_demo.py:299-329](file://FinAgents/agent_pools/risk_agent_pool/example_demo.py#L299-L329)
- [test_integration.py:267-307](file://FinAgents/agent_pools/risk_agent_pool/test_integration.py#L267-L307)