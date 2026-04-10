"""
Data Sources Module

Provides unified data source interface for historical market data,
simulated news generation, and synthetic report generation.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import random
import re

import pandas as pd
import numpy as np


@dataclass
class NewsItem:
    """Represents a single news item with sentiment and metadata."""
    headline: str
    timestamp: datetime
    symbol: str
    sentiment_label: float  # -1 to 1
    event_type: str  # earnings|macro|sector|company|market
    source: str


@dataclass
class EarningsReport:
    """Represents an earnings report with key metrics."""
    symbol: str
    quarter: str
    actual_eps: float
    expected_eps: float
    surprise_pct: float
    summary: str
    key_metrics: dict


@dataclass
class MacroReport:
    """Represents a macroeconomic report with indicators."""
    date: datetime
    gdp_growth: float
    inflation: float
    unemployment: float
    fed_rate: float
    summary: str
    outlook: str


class DataSourceManager:
    """
    Manages data sources for historical market data.
    
    Provides unified interface for loading historical OHLCV data
    with local CSV cache fallback.
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize the data source manager.
        
        Args:
            cache_dir: Path to local cache directory. Defaults to project data/cache.
        """
        if cache_dir is None:
            project_root = Path(__file__).resolve().parents[3]
            self.cache_dir = project_root / "data" / "cache"
        else:
            self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def load_historical_data(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: str = '1d'
    ) -> pd.DataFrame:
        """
        Load historical OHLCV data for a symbol.
        
        Checks local cache first, then falls back to yfinance.
        
        Args:
            symbol: Stock/crypto symbol (e.g., 'AAPL', 'BTC-USD')
            start_date: Start date in 'YYYY-MM-DD' format
            end_date: End date in 'YYYY-MM-DD' format
            interval: Data interval ('1d', '1h', etc.)
            
        Returns:
            DataFrame with OHLCV columns (Open, High, Low, Close, Volume)
            
        Raises:
            ValueError: If no data available for the symbol/date range
        """
        # Check cache first
        cached_df = self._load_from_cache(symbol, start_date, end_date, interval)
        if cached_df is not None:
            return cached_df
        
        # Fall back to yfinance
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date, interval=interval)
            
            if df.empty:
                raise ValueError(f"No data available for {symbol} from {start_date} to {end_date}")
            
            # Standardize column names
            df.columns = [col.replace(' ', '_').title() for col in df.columns]
            df = df.rename(columns={
                'Open': 'Open',
                'High': 'High',
                'Low': 'Low',
                'Close': 'Close',
                'Volume': 'Volume'
            })
            
            # Save to cache
            self._save_to_cache(df, symbol, start_date, end_date, interval)
            
            return df
            
        except ImportError:
            raise ImportError("yfinance is required for fetching data. Install with: pip install yfinance")
        except Exception as e:
            raise ValueError(f"Failed to load data for {symbol}: {str(e)}")
    
    def _load_from_cache(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: str
    ) -> Optional[pd.DataFrame]:
        """Attempt to load data from local cache."""
        cache_file = self.cache_dir / f"{symbol}_{start_date}_{end_date}_{interval}.csv"
        
        if cache_file.exists():
            try:
                df = pd.read_csv(cache_file, index_col=0, parse_dates=True)
                return df
            except Exception:
                return None
        return None
    
    def _save_to_cache(
        self,
        df: pd.DataFrame,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: str
    ) -> None:
        """Save data to local cache."""
        cache_file = self.cache_dir / f"{symbol}_{start_date}_{end_date}_{interval}.csv"
        df.to_csv(cache_file)


class SimulatedNewsGenerator:
    """
    Generates simulated news headlines with realistic temporal patterns.
    
    Uses template-based generation with randomized parameters to create
    realistic news items for backtesting and research purposes.
    """
    
    # News templates by sentiment and event type
    TEMPLATES = {
        'earnings': {
            'bullish': [
                "{symbol} beats Q{quarter} earnings estimates by ${beat:.2f}",
                "{symbol} reports strong Q{quarter} revenue growth of {growth_pct}%",
                "{symbol} raises full-year guidance after stellar Q{quarter} results",
                "Analysts upgrade {symbol} following impressive Q{quarter} earnings",
                "{symbol} Q{quarter} EPS of ${eps:.2f} crushes expectations",
            ],
            'bearish': [
                "{symbol} misses Q{quarter} earnings estimates by ${miss:.2f}",
                "{symbol} reports disappointing Q{quarter} revenue decline of {decline_pct}%",
                "{symbol} cuts full-year guidance after weak Q{quarter} results",
                "Analysts downgrade {symbol} following poor Q{quarter} earnings",
                "{symbol} Q{quarter} EPS of ${eps:.2f} falls short of expectations",
            ],
            'neutral': [
                "{symbol} meets Q{quarter} earnings expectations",
                "{symbol} Q{quarter} results in line with analyst estimates",
                "{symbol} maintains guidance after Q{quarter} earnings report",
                "{symbol} Q{quarter} earnings: what investors need to know",
                "{symbol} reports mixed Q{quarter} results",
            ]
        },
        'macro': {
            'bullish': [
                "Fed signals potential rate cuts as inflation cools",
                "Strong jobs report boosts market sentiment",
                "GDP growth exceeds expectations at {gdp_pct}%",
                "Consumer confidence hits {period} high",
                "Manufacturing PMI shows expansion for {months} consecutive months",
            ],
            'bearish': [
                "Fed hints at more aggressive rate hikes ahead",
                "Inflation data comes in hotter than expected at {inflation_pct}%",
                "GDP growth slows to {gdp_pct}%, below forecasts",
                "Unemployment rises to {unemployment_pct}% in latest report",
                "Manufacturing PMI contracts for {months} consecutive months",
            ],
            'neutral': [
                "Fed maintains current policy stance in latest meeting",
                "Economic data mixed as markets await clarity",
                "Inflation holds steady at {inflation_pct}%",
                "GDP growth meets expectations at {gdp_pct}%",
                "Job market shows signs of stabilization",
            ]
        },
        'sector': {
            'bullish': [
                "{sector} sector leads market gains on strong demand",
                "{sector} stocks rally as {driver} drives growth",
                "Analysts bullish on {sector} outlook for {year}",
                "{sector} sector sees record inflows this quarter",
                "New regulations favor {sector} companies",
            ],
            'bearish': [
                "{sector} sector under pressure amid {concern}",
                "{sector} stocks tumble on weak {driver} outlook",
                "Analysts cut {sector} targets citing headwinds",
                "{sector} sector faces regulatory challenges",
                "{sector} demand shows signs of slowing",
            ],
            'neutral': [
                "{sector} sector mixed as investors weigh outlook",
                "{sector} stocks trade sideways ahead of earnings",
                "Analysts maintain neutral stance on {sector}",
                "{sector} valuations appear fair, analysts say",
                "{sector} outlook uncertain amid mixed signals",
            ]
        },
        'company': {
            'bullish': [
                "{symbol} announces new partnership with {partner}",
                "{symbol} expands into {market} market",
                "{symbol} launches innovative {product} to strong demand",
                "Insider buying at {symbol} signals confidence",
                "{symbol} secures major contract worth ${contract_value}M",
            ],
            'bearish': [
                "{symbol} faces lawsuit over {issue}",
                "{symbol} recalls {product} due to {reason}",
                "Key executive departs {symbol} amid restructuring",
                "{symbol} delays {product} launch to {quarter}",
                "{symbol} loses major contract to competitor",
            ],
            'neutral': [
                "{symbol} announces organizational restructuring",
                "{symbol} schedules investor day for {date}",
                "{symbol} maintains dividend at ${dividend:.2f} per share",
                "{symbol} completes acquisition of {target}",
                "{symbol} provides update on strategic initiatives",
            ]
        },
        'market': {
            'bullish': [
                "Markets rally as {driver} boosts sentiment",
                "S&P 500 hits new {period} high",
                "Tech stocks lead broad market advance",
                "VIX drops to {vix_level}, indicating complacency",
                "Global markets surge on {region} optimism",
            ],
            'bearish': [
                "Markets tumble as {driver} sparks selloff",
                "S&P 500 enters correction territory",
                "Tech stocks lead market decline",
                "VIX spikes to {vix_level} on uncertainty",
                "Global markets slide amid {concern}",
            ],
            'neutral': [
                "Markets mixed as investors digest {event}",
                "Trading volume light ahead of {event}",
                "Markets consolidate recent gains",
                "Sector rotation continues as investors reposition",
                "Markets await clarity on {issue}",
            ]
        }
    }
    
    SECTORS = ['Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer', 'Industrial']
    SOURCES = ['Reuters', 'Bloomberg', 'CNBC', 'WSJ', 'MarketWatch', 'Financial Times']
    
    def __init__(self, random_seed: Optional[int] = None):
        """
        Initialize the news generator.
        
        Args:
            random_seed: Optional seed for reproducible generation
        """
        if random_seed is not None:
            random.seed(random_seed)
            np.random.seed(random_seed)
    
    def generate_headlines(
        self,
        symbol: str,
        date_range: pd.DatetimeIndex,
        count_per_day: int = 5
    ) -> list[NewsItem]:
        """
        Generate simulated news headlines for a symbol over a date range.
        
        Creates realistic temporal patterns with more news during market hours
        and around earnings periods.
        
        Args:
            symbol: Stock symbol
            date_range: Date range for news generation
            count_per_day: Average number of headlines per day
            
        Returns:
            List of NewsItem objects sorted by timestamp
        """
        news_items = []
        
        for date in date_range:
            # Determine number of headlines for this day
            # More news on weekdays, especially around market open/close
            if date.weekday() >= 5:  # Weekend
                num_headlines = max(0, count_per_day // 3)
            else:
                num_headlines = count_per_day + random.randint(-2, 2)
            
            for _ in range(num_headlines):
                news_item = self._generate_single_headline(symbol, date)
                news_items.append(news_item)
        
        # Sort by timestamp
        news_items.sort(key=lambda x: x.timestamp)
        return news_items
    
    def _generate_single_headline(self, symbol: str, date: datetime) -> NewsItem:
        """Generate a single news item."""
        # Select event type with weighted probabilities
        event_type = random.choices(
            ['earnings', 'macro', 'sector', 'company', 'market'],
            weights=[0.15, 0.20, 0.15, 0.30, 0.20]
        )[0]
        
        # Select sentiment
        sentiment = random.choices(
            ['bullish', 'bearish', 'neutral'],
            weights=[0.35, 0.30, 0.35]
        )[0]
        
        # Generate headline from template
        template = random.choice(self.TEMPLATES[event_type][sentiment])
        headline = self._fill_template(template, symbol, event_type, sentiment)
        
        # Generate timestamp with realistic patterns
        timestamp = self._generate_timestamp(date)
        
        # Map sentiment to label
        sentiment_label = {'bullish': 1.0, 'bearish': -1.0, 'neutral': 0.0}[sentiment]
        # Add some noise to sentiment
        sentiment_label += random.uniform(-0.2, 0.2)
        sentiment_label = max(-1.0, min(1.0, sentiment_label))
        
        # Select source
        source = random.choice(self.SOURCES)
        
        return NewsItem(
            headline=headline,
            timestamp=timestamp,
            symbol=symbol,
            sentiment_label=sentiment_label,
            event_type=event_type,
            source=source
        )
    
    def _fill_template(
        self,
        template: str,
        symbol: str,
        event_type: str,
        sentiment: str
    ) -> str:
        """Fill in template variables with realistic values."""
        params = {'symbol': symbol}
        
        if event_type == 'earnings':
            params['quarter'] = random.randint(1, 4)
            params['beat'] = random.uniform(0.05, 0.50)
            params['miss'] = random.uniform(0.05, 0.50)
            params['eps'] = random.uniform(0.50, 5.00)
            params['growth_pct'] = random.uniform(5, 30)
            params['decline_pct'] = random.uniform(5, 25)
        
        elif event_type == 'macro':
            params['gdp_pct'] = round(random.uniform(1.5, 4.5), 1)
            params['inflation_pct'] = round(random.uniform(2.0, 6.0), 1)
            params['unemployment_pct'] = round(random.uniform(3.5, 6.0), 1)
            params['months'] = random.randint(2, 12)
            params['period'] = random.choice(['3-month', '6-month', '1-year'])
        
        elif event_type == 'sector':
            params['sector'] = random.choice(self.SECTORS)
            params['driver'] = random.choice(['demand', 'innovation', 'regulation', 'pricing'])
            params['concern'] = random.choice(['supply chain', 'demand', 'competition', 'regulation'])
            params['year'] = datetime.now().year
        
        elif event_type == 'company':
            params['partner'] = random.choice(['TechCorp', 'GlobalInc', 'MegaSoft', 'InnovateCo'])
            params['market'] = random.choice(['Asian', 'European', 'Emerging', 'Cloud'])
            params['product'] = random.choice(['AI Platform', 'Cloud Service', 'Mobile App', 'Hardware'])
            params['contract_value'] = random.randint(50, 500)
            params['issue'] = random.choice(['patent infringement', 'data breach', 'safety concerns'])
            params['dividend'] = random.uniform(0.10, 2.00)
        
        elif event_type == 'market':
            params['driver'] = random.choice(['earnings', 'Fed policy', 'trade data', 'geopolitical news'])
            params['concern'] = random.choice(['inflation', 'recession fears', 'geopolitical tensions'])
            params['vix_level'] = random.randint(12, 35)
            params['region'] = random.choice(['US-China', 'European', 'Asian'])
            params['period'] = random.choice(['all-time', '52-week', '3-month'])
        
        return template.format(**params)
    
    def _generate_timestamp(self, date: datetime) -> datetime:
        """Generate a realistic timestamp for a news item."""
        # More news during market hours (9:30 AM - 4:00 PM ET)
        hour_weights = []
        for h in range(24):
            if 9 <= h <= 16:  # Market hours
                hour_weights.append(3.0)
            elif 7 <= h <= 8 or 17 <= h <= 19:  # Pre/post market
                hour_weights.append(1.5)
            else:
                hour_weights.append(0.5)
        
        hour = random.choices(range(24), weights=hour_weights)[0]
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        
        return datetime.combine(date.date(), datetime.min.time().replace(hour=hour, minute=minute, second=second))


class SyntheticReportGenerator:
    """
    Generates synthetic earnings and macroeconomic reports.
    
    Creates realistic financial reports for research and backtesting purposes.
    """
    
    def __init__(self, random_seed: Optional[int] = None):
        """
        Initialize the report generator.
        
        Args:
            random_seed: Optional seed for reproducible generation
        """
        if random_seed is not None:
            random.seed(random_seed)
            np.random.seed(random_seed)
    
    def generate_earnings_report(
        self,
        symbol: str,
        quarter: str,
        actual_eps: float,
        expected_eps: float
    ) -> EarningsReport:
        """
        Generate a synthetic earnings report.
        
        Args:
            symbol: Stock symbol
            quarter: Quarter identifier (e.g., 'Q1 2024')
            actual_eps: Actual earnings per share
            expected_eps: Expected/estimated earnings per share
            
        Returns:
            EarningsReport with computed surprise and summary
        """
        surprise_pct = ((actual_eps - expected_eps) / abs(expected_eps)) * 100 if expected_eps != 0 else 0
        
        # Generate key metrics
        revenue = random.uniform(1, 100)  # in billions
        revenue_growth = random.uniform(-10, 30)
        gross_margin = random.uniform(30, 80)
        operating_margin = random.uniform(10, 40)
        
        key_metrics = {
            'revenue_billions': round(revenue, 2),
            'revenue_growth_pct': round(revenue_growth, 1),
            'gross_margin_pct': round(gross_margin, 1),
            'operating_margin_pct': round(operating_margin, 1),
            'shares_outstanding_millions': random.randint(100, 5000),
        }
        
        # Generate summary based on surprise
        if surprise_pct > 5:
            summary = (
                f"{symbol} delivered a strong {quarter} performance, beating EPS estimates by {surprise_pct:.1f}%. "
                f"Revenue of ${revenue:.1f}B represents {revenue_growth:.1f}% growth year-over-year. "
                f"Margins expanded with gross margin at {gross_margin:.1f}% and operating margin at {operating_margin:.1f}%. "
                f"Management expressed confidence in continued execution heading into next quarter."
            )
        elif surprise_pct < -5:
            summary = (
                f"{symbol} missed {quarter} EPS expectations by {abs(surprise_pct):.1f}%. "
                f"Revenue of ${revenue:.1f}B reflects {revenue_growth:.1f}% growth, below consensus. "
                f"Margins contracted with gross margin at {gross_margin:.1f}% and operating margin at {operating_margin:.1f}%. "
                f"Management cited headwinds and provided cautious guidance for the upcoming quarter."
            )
        else:
            summary = (
                f"{symbol} reported {quarter} EPS in line with expectations at ${actual_eps:.2f}. "
                f"Revenue of ${revenue:.1f}B grew {revenue_growth:.1f}% year-over-year. "
                f"Margins remained stable with gross margin at {gross_margin:.1f}% and operating margin at {operating_margin:.1f}%. "
                f"Management maintained guidance and highlighted steady execution across business segments."
            )
        
        return EarningsReport(
            symbol=symbol,
            quarter=quarter,
            actual_eps=actual_eps,
            expected_eps=expected_eps,
            surprise_pct=round(surprise_pct, 2),
            summary=summary,
            key_metrics=key_metrics
        )
    
    def generate_macro_report(self, indicators_dict: Optional[dict] = None) -> MacroReport:
        """
        Generate a synthetic macroeconomic report.
        
        Args:
            indicators_dict: Optional dict with gdp_growth, inflation, unemployment, fed_rate.
                           If not provided, realistic values will be generated.
            
        Returns:
            MacroReport with indicators and analysis
        """
        # Generate or use provided indicators
        if indicators_dict is None:
            indicators_dict = {}
        
        gdp_growth = indicators_dict.get('gdp_growth', round(random.uniform(1.0, 4.0), 1))
        inflation = indicators_dict.get('inflation', round(random.uniform(1.5, 5.0), 1))
        unemployment = indicators_dict.get('unemployment', round(random.uniform(3.5, 6.5), 1))
        fed_rate = indicators_dict.get('fed_rate', round(random.uniform(0.0, 5.5), 2))
        
        # Generate summary based on indicators
        conditions = []
        if gdp_growth > 3:
            conditions.append("strong economic growth")
        elif gdp_growth < 2:
            conditions.append("moderate growth")
        
        if inflation > 3:
            conditions.append("elevated inflation")
        elif inflation < 2:
            conditions.append("low inflation")
        
        if unemployment < 4:
            conditions.append("tight labor market")
        elif unemployment > 5:
            conditions.append("softening labor market")
        
        condition_str = ", ".join(conditions) if conditions else "mixed economic conditions"
        
        summary = (
            f"The latest economic data shows {condition_str}. "
            f"GDP grew at {gdp_growth}% annualized, while inflation stands at {inflation}%. "
            f"The unemployment rate is {unemployment}%, and the Fed funds rate is {fed_rate}%. "
            f"Overall economic conditions suggest a {self._assess_economic_health(gdp_growth, inflation, unemployment)} environment."
        )
        
        # Generate outlook
        if gdp_growth > 2.5 and inflation < 3:
            outlook = "Positive. Growth remains robust with manageable inflation, supporting risk assets."
        elif inflation > 4:
            outlook = "Cautious. Elevated inflation may prompt tighter monetary policy, creating headwinds."
        elif gdp_growth < 1.5:
            outlook = "Defensive. Slowing growth warrants caution; recession risks are elevated."
        else:
            outlook = "Neutral. Mixed signals suggest maintaining balanced portfolio positioning."
        
        return MacroReport(
            date=datetime.now(),
            gdp_growth=gdp_growth,
            inflation=inflation,
            unemployment=unemployment,
            fed_rate=fed_rate,
            summary=summary,
            outlook=outlook
        )
    
    def _assess_economic_health(self, gdp: float, inflation: float, unemployment: float) -> str:
        """Assess overall economic health based on indicators."""
        score = 0
        if gdp > 2.5:
            score += 1
        if 1.5 <= inflation <= 2.5:
            score += 1
        if 3.5 <= unemployment <= 4.5:
            score += 1
        
        if score >= 2:
            return "healthy"
        elif score == 1:
            return "transitioning"
        else:
            return "challenging"
