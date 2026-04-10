# Data Normalization and Processing

<cite>
**Referenced Files in This Document**
- [feature_engineering.py](file://FinAgents/research/data_pipeline/feature_engineering.py)
- [preprocessor.py](file://FinAgents/research/data_pipeline/preprocessor.py)
- [data_sources.py](file://FinAgents/research/data_pipeline/data_sources.py)
- [standard_factor_calculator.py](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py)
- [data_handler.py](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py)
- [data_loader.py](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py)
- [framework.py](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py)
- [cache_service.py](file://backend/cache/cache_service.py)
- [memory_bridge.py](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py)
- [feature_engineering.py](file://FinAgents/agent_pools/data_agent_pool/agents/equity/feature_engineering.py)
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

## Introduction
This document explains the data normalization and processing workflows across the system, focusing on:
- Standardization of data formats from diverse providers into unified schemas
- Feature engineering pipeline including technical indicators, price transformations, and composite metrics
- Memory bridge integration for persistent data storage and retrieval
- Data validation rules, quality checks, and error handling mechanisms
- Examples of transformation workflows, caching strategies, and performance optimization techniques for large datasets

## Project Structure
The data processing stack spans research-grade preprocessing, provider-agnostic feature engineering, Qlib-backed standardization, and backend caching and memory bridging.

```mermaid
graph TB
subgraph "Research Data Pipeline"
DS["DataSources<br/>Historical + News + Reports"]
FE["FeatureEngineering<br/>Technical + Statistical + Cross-Asset + Sentiment"]
PP["Preprocessor<br/>Missing Data + Normalization + Temporal Split + Quality"]
end
subgraph "Qlib Standard Framework"
DL["DataLoader<br/>CSV/Synthetic"]
DH["DataHandler<br/>Normalization + Quality Checks"]
SFC["StandardFactorCalculator<br/>Momentum + Volatility + Indicators"]
FR["Framework<br/>End-to-end Pipeline"]
end
subgraph "Backend Infrastructure"
CS["CacheService<br/>L1/L2 Caching"]
MB["MemoryBridge<br/>Event Logging"]
end
DS --> FE --> PP
FE --> SFC
DL --> DH --> SFC
PP --> CS
SFC --> CS
MB --> CS
```

**Diagram sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [framework.py:28-702](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py#L28-L702)
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

**Section sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [framework.py:28-702](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py#L28-L702)
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

## Core Components
- DataSources: Unified interface for historical market data, simulated news, and synthetic reports. Implements local CSV caching and standardizes column names.
- FeatureEngineering: Computes technical indicators, statistical features, cross-asset features, and sentiment features from OHLCV and news items.
- Preprocessor: Handles missing data, normalization, temporal splitting, and comprehensive data quality validation.
- Qlib Standard Framework: Integrates DataLoader, DataHandler, StandardFactorCalculator, and end-to-end pipeline orchestration.
- CacheService: Two-level caching (L1 in-memory + L2 Redis) with namespace-aware keys and TTL controls.
- MemoryBridge: Event logging for task execution tracking and retrospective analysis.

**Section sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [framework.py:28-702](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py#L28-L702)
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

## Architecture Overview
The system standardizes heterogeneous market data into unified schemas and applies robust feature engineering and normalization. It supports both research-focused preprocessing and Qlib-backed production workflows, with caching and memory bridging for performance and persistence.

```mermaid
sequenceDiagram
participant Provider as "Data Provider"
participant DS as "DataSourceManager"
participant FE as "FeatureEngineer"
participant PP as "DataPreprocessor"
participant SFC as "StandardFactorCalculator"
participant DH as "QlibDataHandler"
participant CS as "CacheService"
participant MB as "MemoryBridge"
Provider->>DS : Historical OHLCV + News
DS-->>FE : Standardized DataFrame
FE-->>PP : Technical + Statistical + Cross-Asset + Sentiment Features
PP-->>CS : Normalized + Split Datasets
DS->>DH : CSV/Synthetic Data
DH-->>SFC : Cleaned + Normalized Multi-Index Data
SFC-->>CS : Factors + Metrics
MB-->>CS : Event Logs (optional)
```

**Diagram sources**
- [data_sources.py:75-132](file://FinAgents/research/data_pipeline/data_sources.py#L75-L132)
- [feature_engineering.py:29-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L29-L354)
- [preprocessor.py:55-392](file://FinAgents/research/data_pipeline/preprocessor.py#L55-L392)
- [data_loader.py:53-106](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L53-L106)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [cache_service.py:108-202](file://backend/cache/cache_service.py#L108-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

## Detailed Component Analysis

### DataSources: Unified Schema and Caching
- Loads historical OHLCV data with local CSV cache fallback and standardizes column names.
- Provides simulated news and synthetic reports for research and backtesting.
- Implements cache directory management and file naming conventions for symbol-date-interval combinations.

```mermaid
flowchart TD
Start(["Load Historical Data"]) --> CheckCache["Check Local Cache"]
CheckCache --> CacheHit{"Cache Exists?"}
CacheHit --> |Yes| ReturnCache["Return Cached DataFrame"]
CacheHit --> |No| FetchProvider["Fetch via yfinance"]
FetchProvider --> ValidateData{"Data Available?"}
ValidateData --> |No| RaiseError["Raise ValueError"]
ValidateData --> |Yes| StandardizeCols["Standardize Columns"]
StandardizeCols --> SaveCache["Save to Cache"]
SaveCache --> ReturnDF["Return DataFrame"]
```

**Diagram sources**
- [data_sources.py:75-132](file://FinAgents/research/data_pipeline/data_sources.py#L75-L132)

**Section sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)

### FeatureEngineering: Technical Indicators and Composite Metrics
- Computes RSI, MACD, Bollinger Bands, ATR, OBV, rolling moments, z-scores, cross-asset correlations, beta, and sentiment features.
- Joins sentiment and cross-asset features with technical indicators and statistical features.
- Ensures required columns and minimum row counts before computation.

```mermaid
flowchart TD
InputDF["OHLCV + News Items"] --> Tech["Compute Technical Indicators"]
Tech --> Stats["Compute Statistical Features"]
Stats --> Sentiment["Compute Sentiment Features"]
Sentiment --> CrossAsset["Compute Cross-Asset Features"]
CrossAsset --> Join["Join All Features"]
Join --> OutputDF["Feature Matrix"]
```

**Diagram sources**
- [feature_engineering.py:29-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L29-L354)

**Section sources**
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)

### Preprocessor: Missing Data, Normalization, Splitting, and Quality
- Handles missing data via forward/backward fill, interpolation, or dropping rows.
- Supports z-score, min-max, and robust normalization with parameter tracking.
- Performs temporal train/validation/test splits respecting chronological order.
- Validates data quality including missing ratios, outliers, date gaps, duplicates, and generates a quality score.

```mermaid
flowchart TD
DF["Input DataFrame"] --> Missing["Handle Missing Data"]
Missing --> Norm["Normalize Features"]
Norm --> Split["Temporal Split"]
Split --> Quality["Validate Data Quality"]
Quality --> Report["DataQualityReport"]
Report --> Output["Processed Dataset"]
```

**Diagram sources**
- [preprocessor.py:55-314](file://FinAgents/research/data_pipeline/preprocessor.py#L55-L314)

**Section sources**
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)

### Qlib Standard Framework: Standardization and Factor Calculation
- DataLoader converts CSV/synthetic data into Qlib’s multi-index format with feature/label column groups.
- DataHandler applies normalization processors, handles infinities, fills NA, and enforces final quality checks.
- StandardFactorCalculator computes momentum, volatility, technical indicators, and cross-sectional factors with winsorization and clipping.
- Framework orchestrates end-to-end pipeline: load → factor → process → train → predict → backtest.

```mermaid
classDiagram
class QlibCSVDataLoader {
+load(instruments, start_time, end_time) DataFrame
-_load_and_prepare_data()
-_organize_columns(data) DataFrame
}
class QlibSyntheticDataLoader {
+load(instruments, start_time, end_time) DataFrame
-_generate_synthetic_data()
}
class QlibDataHandler {
+fetch(selector, level, col_set, data_key, squeeze) DataFrame
-_post_process_data(data, col_set, data_key) DataFrame
-_apply_quality_checks(data) DataFrame
+validate_data_integrity() Dict
}
class StandardFactorCalculator {
+calculate(data, factor_input) Series
-_unified_factor_calculation(...)
-_process_factor(raw_factor, factor_input) DataFrame
-_winsorize_factor(factor, quantile) DataFrame
}
class QlibStandardFramework {
+initialize()
+run_complete_pipeline(save_results, output_dir) Dict
+load_data() DataFrame
+calculate_factors() DataFrame
+process_data() DatasetH
+train_model() Trainer
+generate_predictions() Series
+execute_backtest() Dict
}
QlibStandardFramework --> QlibCSVDataLoader : "uses"
QlibStandardFramework --> QlibSyntheticDataLoader : "uses"
QlibStandardFramework --> QlibDataHandler : "uses"
QlibStandardFramework --> StandardFactorCalculator : "uses"
```

**Diagram sources**
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_loader.py:220-341](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L220-L341)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [framework.py:28-702](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py#L28-L702)

**Section sources**
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_loader.py:220-341](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L220-L341)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [framework.py:28-702](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/framework.py#L28-L702)

### Memory Bridge Integration
- Provides a lightweight event logging mechanism for task execution tracking and retrospective analysis.
- Can be extended to integrate with persistent memory systems, vector databases, or graph-based storage.

```mermaid
sequenceDiagram
participant Agent as "Agent"
participant MB as "MemoryBridge"
Agent->>MB : record_event(agent_name, task, input, summary)
MB-->>Agent : Log entry printed
Note over MB : Future extension to persistent storage
```

**Diagram sources**
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

**Section sources**
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

### Backend Caching Strategies
- Two-level caching: L1 in-memory (LRU with TTL) and L2 Redis (namespaced keys).
- Namespaces: market_data, signals, agent_memory, portfolio.
- TTLs optimized for hot-path data (e.g., market data refreshed frequently).
- Methods: get/set for market data, signals, agent memory, and portfolio summaries.

```mermaid
flowchart TD
Request["Cache Request"] --> L1Check["Check L1 MemoryCache"]
L1Check --> L1Hit{"Hit?"}
L1Hit --> |Yes| ReturnL1["Return from L1"]
L1Hit --> |No| L2Check["Check Redis"]
L2Check --> L2Hit{"Hit?"}
L2Hit --> |Yes| PopulateL1["Populate L1 + Return"]
L2Hit --> |No| Miss["Miss"]
```

**Diagram sources**
- [cache_service.py:108-202](file://backend/cache/cache_service.py#L108-L202)

**Section sources**
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)

## Dependency Analysis
- DataSources depends on pandas/numpy and optional yfinance for provider data.
- FeatureEngineering depends on pandas/numpy for vectorized computations.
- Preprocessor composes FeatureEngineer and provides validation/reporting.
- Qlib components depend on pandas/numpy and Qlib handlers for normalization and processing.
- CacheService depends on Redis client for L2 caching.
- MemoryBridge is a lightweight utility for event logging.

```mermaid
graph TB
DS["DataSources"] --> FE["FeatureEngineering"]
FE --> PP["Preprocessor"]
DS --> SFC["StandardFactorCalculator"]
DL["DataLoader"] --> DH["DataHandler"]
DH --> SFC
PP --> CS["CacheService"]
SFC --> CS
MB["MemoryBridge"] --> CS
```

**Diagram sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

**Section sources**
- [data_sources.py:54-132](file://FinAgents/research/data_pipeline/data_sources.py#L54-L132)
- [feature_engineering.py:17-354](file://FinAgents/research/data_pipeline/feature_engineering.py#L17-L354)
- [preprocessor.py:43-404](file://FinAgents/research/data_pipeline/preprocessor.py#L43-L404)
- [data_loader.py:17-218](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_loader.py#L17-L218)
- [data_handler.py:24-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L24-L494)
- [standard_factor_calculator.py:12-325](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/standard_factor_calculator.py#L12-L325)
- [cache_service.py:58-202](file://backend/cache/cache_service.py#L58-L202)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

## Performance Considerations
- Vectorized computations: FeatureEngineer and StandardFactorCalculator rely on pandas/numpy for efficient rolling and group-wise operations.
- Multi-index alignment: Qlib’s multi-index format ensures cross-sectional and temporal consistency for factor calculations.
- Caching tiers: L1 in-memory cache minimizes latency for hot data; Redis provides distributed caching and persistence.
- Winsorization and clipping: Reduce influence of extreme outliers in factor calculations, improving model stability.
- Temporal splitting: Prevents leakage and aligns training/validation/test sets chronologically.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Data validation failures:
  - Missing required columns or insufficient rows trigger explicit errors in FeatureEngineer and Qlib components.
  - DataHandler validates index structure, missing data ratios, infinite values, and duplicate indices.
- Missing data handling:
  - Preprocessor offers configurable strategies (forward-fill, interpolate, drop).
- Normalization pitfalls:
  - Zero variance features produce division-by-zero warnings; ensure sufficient variability or drop constant features.
- Cache availability:
  - CacheService gracefully degrades if Redis is unavailable; L1 cache remains functional.
- Memory bridge:
  - Current implementation prints entries; extend to persistent storage for production use.

**Section sources**
- [feature_engineering.py:47-53](file://FinAgents/research/data_pipeline/feature_engineering.py#L47-L53)
- [data_handler.py:428-494](file://FinAgents/agent_pools/alpha_agent_pool/qlib_local/qlib_standard/data_handler.py#L428-L494)
- [preprocessor.py:240-314](file://FinAgents/research/data_pipeline/preprocessor.py#L240-L314)
- [cache_service.py:83-103](file://backend/cache/cache_service.py#L83-L103)
- [memory_bridge.py:7-31](file://FinAgents/agent_pools/data_agent_pool/memory_bridge.py#L7-L31)

## Conclusion
The system provides a robust, extensible pipeline for standardizing market data, computing rich features, and applying rigorous normalization and validation. It integrates Qlib’s standardized workflows for production-grade factor calculation and backtesting, while leveraging two-tier caching and a memory bridge for performance and persistence. The modular design enables easy extension for additional providers, features, and storage backends.