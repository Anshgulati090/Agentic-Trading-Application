# Agentic Trading Application

A **production-grade multi-agent trading platform** that extends the research framework introduced in the Open Finance Lab project **AgenticTrading** into a deployable system with real-time APIs, streaming infrastructure, analytics, and a web dashboard.

This project builds on the concept of **Agentic Trading (AGT)** — where financial trading workflows are executed by collaborating intelligent agents rather than static pipelines.

---

# Attribution

This project is **inspired by and based on research from the Open Finance Lab AgenticTrading framework**.

Original research project:
AgenticTrading — Open Finance Lab

The original system introduces the concept of **Agentic Trading**, where trading pipelines are modeled as coordinated multi-agent systems.

This repository **extends that research implementation** by adding:

* production-ready backend services
* REST APIs
* real-time WebSocket streaming
* portfolio management
* analytics engine
* backtesting infrastructure
* Dockerized deployment
* React trading dashboard

The goal is to evolve the research prototype into a **practical engineering system for experimentation and deployment**.

---

# Overview

Traditional **Algorithmic Trading (AT)** pipelines operate as fixed sequential modules:

Data → Signal Generation → Portfolio Optimization → Execution

While effective, these pipelines lack adaptability and cross-module learning.

**Agentic Trading (AGT)** introduces a new paradigm where:

* each trading component is implemented as an **intelligent agent**
* agents communicate and collaborate
* orchestration manages workflow execution
* memory and analytics allow continual learning

This repository implements that concept using modern backend and frontend technologies.

---

# System Architecture

The platform consists of three major layers.

## Agent Layer

Autonomous agents responsible for trading intelligence.

Examples:

* Signal generation agents
* Risk management agents
* Execution agents
* Portfolio agents

Each agent performs a specialized role in the trading pipeline.

---

## Orchestration Layer

This layer coordinates agents and trading workflows.

Core components include:

* Agent Manager
* Risk Engine
* Execution Engine
* Market Data Provider

Responsibilities include:

* agent registration
* strategy orchestration
* signal validation
* risk enforcement
* trade execution

---

## API & Infrastructure Layer

The trading system is exposed through REST APIs and WebSocket streams.

Technologies used:

* FastAPI
* PostgreSQL
* Redis
* SQLAlchemy
* WebSockets
* Docker

---

# Backend Stack

FastAPI — high-performance API framework
PostgreSQL — trade and portfolio database
Redis — caching and signal streaming
SQLAlchemy — ORM
WebSockets — real-time signal feeds
Docker — containerized deployment

---

# Frontend Stack

React — trading dashboard
Vite — frontend tooling
TailwindCSS — UI framework

---

# Core Features

## Multi-Agent Signal Generation

Different agents generate trading signals using various strategies.

Examples:

* momentum agents
* mean-reversion agents
* factor-based models
* LLM-assisted strategy agents

---

## Risk-Managed Execution

Before executing trades the system validates risk constraints:

signal → risk engine → execution engine

Risk checks include:

* position limits
* exposure constraints
* portfolio risk thresholds

---

## Portfolio Management

Tracks and evaluates portfolio state.

Metrics include:

* portfolio value
* positions
* exposure
* performance statistics

Endpoint:

GET /portfolio/metrics

---

## Real-Time Signal Streaming

Signals can be streamed live via WebSockets.

Example:

ws://localhost:8000/ws/signals/AAPL

This powers the real-time trading dashboard.

---

## Market Data Integration

Market prices are provided through a market data service.

Endpoint:

GET /market/price/{symbol}

---

## Analytics Engine

Portfolio analytics include:

* Sharpe ratio
* volatility
* max drawdown
* alpha / beta

---

## Backtesting Engine

Strategies can be evaluated against historical data.

Endpoints:

POST /backtest
GET /backtest/{id}

---

# API Endpoints

Signals

GET /signals/{symbol}

Portfolio

GET /portfolio/metrics

Market Data

GET /market/price/{symbol}

Agent Execution

POST /agents/execute

Health Check

GET /health

---

# WebSocket Streams

Live signal stream

/ws/signals/{symbol}

Example

ws://localhost:8000/ws/signals/AAPL

---

# Project Structure

AgenticTrading

backend
│
├── api
├── routes
├── services
├── db
├── risk
├── market
├── schemas
└── config

core
└── agents

frontend
├── src
│   ├── components
│   ├── pages
│   └── services

docker-compose.yml
Dockerfile

---

# Running the System

Clone the repository

git clone https://github.com/YOUR_USERNAME/Agentic-Trading-Application.git

cd Agentic-Trading-Application

Start services

docker-compose up --build

Backend API

http://localhost:8000/docs

Frontend dashboard

http://localhost:3000

---

# Roadmap

Planned improvements:

* Redis-based agent memory
* advanced analytics engine
* reinforcement learning agents
* distributed agent execution
* live broker integration
* CI/CD pipelines

---

# License

This repository follows the license terms of the original AgenticTrading project unless otherwise specified.

---

# Acknowledgment

Original concept and research inspiration from the Open Finance Lab AgenticTrading project.

This repository expands the research framework into a **production-oriented multi-agent trading infrastructure**.

---

# Author

Ansh Gulati

AI / Quant Systems Research
