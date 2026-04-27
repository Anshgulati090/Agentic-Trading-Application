// Global Market Catalog — 200+ symbols across US, India, Crypto, ETFs, Indices
const CATALOG = [
  // ── US Tech (NASDAQ) ──────────────────────────────────────────────────────
  { symbol: 'AAPL',   name: 'Apple Inc.',              type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['apple','apple stock','apple inc','iphone'] },
  { symbol: 'MSFT',   name: 'Microsoft Corp.',          type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['microsoft','microsoft stock','azure'] },
  { symbol: 'GOOGL',  name: 'Alphabet Inc.',            type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['google','alphabet','google stock','search'] },
  { symbol: 'AMZN',   name: 'Amazon.com Inc.',          type: 'Equity', sector: 'Consumer',         exchange: 'NASDAQ', aliases: ['amazon','amazon stock','aws','ecommerce'] },
  { symbol: 'TSLA',   name: 'Tesla Inc.',               type: 'Equity', sector: 'Auto',             exchange: 'NASDAQ', aliases: ['tesla','tesla stock','ev','elon'] },
  { symbol: 'META',   name: 'Meta Platforms Inc.',      type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['meta','facebook','instagram','whatsapp'] },
  { symbol: 'NVDA',   name: 'NVIDIA Corp.',             type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['nvidia','nvidia stock','gpu','chips','nvidea'] },
  { symbol: 'NFLX',   name: 'Netflix Inc.',             type: 'Equity', sector: 'Media',            exchange: 'NASDAQ', aliases: ['netflix','streaming'] },
  { symbol: 'AMD',    name: 'Advanced Micro Devices',   type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['amd','advanced micro','chips'] },
  { symbol: 'INTC',   name: 'Intel Corp.',              type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['intel','chips','semiconductor'] },
  { symbol: 'PLTR',   name: 'Palantir Technologies',    type: 'Equity', sector: 'Technology',       exchange: 'NYSE',   aliases: ['palantir','data','ai software'] },
  { symbol: 'CRM',    name: 'Salesforce Inc.',          type: 'Equity', sector: 'Technology',       exchange: 'NYSE',   aliases: ['salesforce','crm','saas'] },
  { symbol: 'ORCL',   name: 'Oracle Corp.',             type: 'Equity', sector: 'Technology',       exchange: 'NYSE',   aliases: ['oracle','database','cloud'] },
  { symbol: 'ADBE',   name: 'Adobe Inc.',               type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['adobe','creative cloud','photoshop'] },
  { symbol: 'PYPL',   name: 'PayPal Holdings',          type: 'Equity', sector: 'Fintech',          exchange: 'NASDAQ', aliases: ['paypal','payments','fintech'] },
  { symbol: 'UBER',   name: 'Uber Technologies',        type: 'Equity', sector: 'Technology',       exchange: 'NYSE',   aliases: ['uber','ride','rideshare'] },
  { symbol: 'LYFT',   name: 'Lyft Inc.',                type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['lyft','rideshare'] },
  { symbol: 'SNAP',   name: 'Snap Inc.',                type: 'Equity', sector: 'Social Media',     exchange: 'NYSE',   aliases: ['snap','snapchat','social'] },
  { symbol: 'TWTR',   name: 'Twitter/X',                type: 'Equity', sector: 'Social Media',     exchange: 'NYSE',   aliases: ['twitter','x','social media'] },
  { symbol: 'SPOT',   name: 'Spotify Technology',       type: 'Equity', sector: 'Media',            exchange: 'NYSE',   aliases: ['spotify','music','streaming'] },
  { symbol: 'SHOP',   name: 'Shopify Inc.',             type: 'Equity', sector: 'Technology',       exchange: 'NYSE',   aliases: ['shopify','ecommerce','saas'] },
  { symbol: 'SQ',     name: 'Block Inc.',               type: 'Equity', sector: 'Fintech',          exchange: 'NYSE',   aliases: ['square','block','payments','jack dorsey'] },
  { symbol: 'COIN',   name: 'Coinbase Global',          type: 'Equity', sector: 'Fintech',          exchange: 'NASDAQ', aliases: ['coinbase','crypto exchange'] },
  { symbol: 'RBLX',   name: 'Roblox Corp.',             type: 'Equity', sector: 'Gaming',           exchange: 'NYSE',   aliases: ['roblox','gaming','metaverse'] },
  { symbol: 'HOOD',   name: 'Robinhood Markets',        type: 'Equity', sector: 'Fintech',          exchange: 'NASDAQ', aliases: ['robinhood','trading','brokerage'] },
  { symbol: 'ARM',    name: 'Arm Holdings',             type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['arm','chips','semiconductor','cpu'] },
  { symbol: 'SMCI',   name: 'Super Micro Computer',     type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['supermicro','super micro','server','ai'] },
  { symbol: 'AVGO',   name: 'Broadcom Inc.',            type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['broadcom','chips'] },
  { symbol: 'QCOM',   name: 'Qualcomm Inc.',            type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['qualcomm','chips','5g'] },
  { symbol: 'MU',     name: 'Micron Technology',        type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['micron','memory','dram','nand'] },
  { symbol: 'AMAT',   name: 'Applied Materials',        type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['applied materials','semiconductor','equipment'] },
  { symbol: 'LRCX',   name: 'Lam Research',             type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['lam research','semiconductor'] },
  { symbol: 'KLAC',   name: 'KLA Corp.',                type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['kla','semiconductor'] },
  { symbol: 'ASML',   name: 'ASML Holding',             type: 'Equity', sector: 'Technology',       exchange: 'NASDAQ', aliases: ['asml','lithography','semiconductor'] },

  // ── US Financials ─────────────────────────────────────────────────────────
  { symbol: 'JPM',    name: 'JPMorgan Chase',           type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['jpmorgan','jp morgan','bank'] },
  { symbol: 'GS',     name: 'Goldman Sachs',            type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['goldman','goldman sachs','investment bank'] },
  { symbol: 'BAC',    name: 'Bank of America',          type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['bank of america','bofa','bank'] },
  { symbol: 'WFC',    name: 'Wells Fargo',              type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['wells fargo','bank'] },
  { symbol: 'MS',     name: 'Morgan Stanley',           type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['morgan stanley','investment bank'] },
  { symbol: 'V',      name: 'Visa Inc.',                type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['visa','payments','card'] },
  { symbol: 'MA',     name: 'Mastercard Inc.',          type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['mastercard','payments','card'] },
  { symbol: 'AXP',    name: 'American Express',         type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['amex','american express','credit card'] },
  { symbol: 'BRK-B',  name: 'Berkshire Hathaway B',    type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['berkshire','warren buffett','brk'] },
  { symbol: 'C',      name: 'Citigroup Inc.',           type: 'Equity', sector: 'Financials',       exchange: 'NYSE',   aliases: ['citigroup','citi','bank'] },

  // ── US Healthcare ─────────────────────────────────────────────────────────
  { symbol: 'JNJ',    name: 'Johnson & Johnson',        type: 'Equity', sector: 'Healthcare',       exchange: 'NYSE',   aliases: ['johnson','jnj','pharma'] },
  { symbol: 'PFE',    name: 'Pfizer Inc.',              type: 'Equity', sector: 'Healthcare',       exchange: 'NYSE',   aliases: ['pfizer','pharma','vaccine'] },
  { symbol: 'MRNA',   name: 'Moderna Inc.',             type: 'Equity', sector: 'Healthcare',       exchange: 'NASDAQ', aliases: ['moderna','mrna','vaccine','biotech'] },
  { symbol: 'ABBV',   name: 'AbbVie Inc.',              type: 'Equity', sector: 'Healthcare',       exchange: 'NYSE',   aliases: ['abbvie','pharma'] },
  { symbol: 'LLY',    name: 'Eli Lilly & Co.',          type: 'Equity', sector: 'Healthcare',       exchange: 'NYSE',   aliases: ['eli lilly','lilly','pharma','ozempic'] },
  { symbol: 'UNH',    name: 'UnitedHealth Group',       type: 'Equity', sector: 'Healthcare',       exchange: 'NYSE',   aliases: ['unitedhealth','health insurance'] },

  // ── US Consumer / Retail ──────────────────────────────────────────────────
  { symbol: 'WMT',    name: 'Walmart Inc.',             type: 'Equity', sector: 'Consumer Staples', exchange: 'NYSE',   aliases: ['walmart','retail'] },
  { symbol: 'COST',   name: 'Costco Wholesale',         type: 'Equity', sector: 'Consumer Staples', exchange: 'NASDAQ', aliases: ['costco','wholesale','membership'] },
  { symbol: 'TGT',    name: 'Target Corp.',             type: 'Equity', sector: 'Consumer Staples', exchange: 'NYSE',   aliases: ['target','retail'] },
  { symbol: 'HD',     name: 'Home Depot',               type: 'Equity', sector: 'Consumer',         exchange: 'NYSE',   aliases: ['home depot','hardware','retail'] },
  { symbol: 'MCD',    name: "McDonald's Corp.",         type: 'Equity', sector: 'Consumer',         exchange: 'NYSE',   aliases: ['mcdonalds','fast food','restaurant'] },
  { symbol: 'SBUX',   name: 'Starbucks Corp.',          type: 'Equity', sector: 'Consumer',         exchange: 'NASDAQ', aliases: ['starbucks','coffee'] },
  { symbol: 'NKE',    name: 'Nike Inc.',                type: 'Equity', sector: 'Consumer',         exchange: 'NYSE',   aliases: ['nike','sports','shoes'] },
  { symbol: 'DIS',    name: 'Walt Disney Co.',          type: 'Equity', sector: 'Media',            exchange: 'NYSE',   aliases: ['disney','entertainment','streaming'] },

  // ── US Energy ─────────────────────────────────────────────────────────────
  { symbol: 'XOM',    name: 'Exxon Mobil Corp.',        type: 'Equity', sector: 'Energy',           exchange: 'NYSE',   aliases: ['exxon','oil','energy'] },
  { symbol: 'CVX',    name: 'Chevron Corp.',            type: 'Equity', sector: 'Energy',           exchange: 'NYSE',   aliases: ['chevron','oil','energy'] },
  { symbol: 'COP',    name: 'ConocoPhillips',           type: 'Equity', sector: 'Energy',           exchange: 'NYSE',   aliases: ['conocophillips','oil'] },

  // ── India — NSE (National Stock Exchange) ─────────────────────────────────
  { symbol: 'RELIANCE.NS',  name: 'Reliance Industries',    type: 'Equity', sector: 'Conglomerate', exchange: 'NSE', aliases: ['reliance','ril','jio','mukesh ambani','reliance industries'] },
  { symbol: 'TCS.NS',       name: 'Tata Consultancy Services', type: 'Equity', sector: 'IT', exchange: 'NSE', aliases: ['tcs','tata consultancy','it','tata'] },
  { symbol: 'INFY.NS',      name: 'Infosys Ltd.',           type: 'Equity', sector: 'IT',           exchange: 'NSE', aliases: ['infosys','it','tech'] },
  { symbol: 'HDFCBANK.NS',  name: 'HDFC Bank Ltd.',         type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['hdfc bank','hdfc','bank','india bank'] },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.',        type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['icici','icici bank','bank'] },
  { symbol: 'SBIN.NS',      name: 'State Bank of India',    type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['sbi','state bank','india bank'] },
  { symbol: 'WIPRO.NS',     name: 'Wipro Ltd.',             type: 'Equity', sector: 'IT',           exchange: 'NSE', aliases: ['wipro','it','tech'] },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.',        type: 'Equity', sector: 'Steel',        exchange: 'NSE', aliases: ['tata steel','tatasteel','steel','tata'] },
  { symbol: 'TATAMOTORS.NS',name: 'Tata Motors Ltd.',       type: 'Equity', sector: 'Auto',         exchange: 'NSE', aliases: ['tata motors','tatamotors','auto','car','jaguar'] },
  { symbol: 'HCLTECH.NS',   name: 'HCL Technologies',       type: 'Equity', sector: 'IT',           exchange: 'NSE', aliases: ['hcl','hcl tech','it'] },
  { symbol: 'BAJFINANCE.NS',name: 'Bajaj Finance Ltd.',      type: 'Equity', sector: 'NBFC',         exchange: 'NSE', aliases: ['bajaj finance','bajaj','nbfc','lending'] },
  { symbol: 'KOTAK.NS',     name: 'Kotak Mahindra Bank',    type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['kotak','kotak bank','bank'] },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank',    type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['kotak mahindra','kotak bank'] },
  { symbol: 'AXISBANK.NS',  name: 'Axis Bank Ltd.',         type: 'Equity', sector: 'Banking',      exchange: 'NSE', aliases: ['axis bank','axis','bank'] },
  { symbol: 'ADANIENT.NS',  name: 'Adani Enterprises',      type: 'Equity', sector: 'Conglomerate', exchange: 'NSE', aliases: ['adani','adani enterprises','gautam adani'] },
  { symbol: 'ADANIPORTS.NS',name: 'Adani Ports & SEZ',      type: 'Equity', sector: 'Infrastructure',exchange: 'NSE', aliases: ['adani ports','adani','ports'] },
  { symbol: 'ONGC.NS',      name: 'Oil & Natural Gas Corp.',type: 'Equity', sector: 'Energy',       exchange: 'NSE', aliases: ['ongc','oil gas','energy','india'] },
  { symbol: 'NTPC.NS',      name: 'NTPC Ltd.',              type: 'Equity', sector: 'Energy',       exchange: 'NSE', aliases: ['ntpc','power','electricity'] },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp.',       type: 'Equity', sector: 'Energy',       exchange: 'NSE', aliases: ['power grid','powergrid','electricity'] },
  { symbol: 'ITC.NS',       name: 'ITC Ltd.',               type: 'Equity', sector: 'Consumer',     exchange: 'NSE', aliases: ['itc','cigarettes','fmcg'] },
  { symbol: 'MARUTI.NS',    name: 'Maruti Suzuki India',    type: 'Equity', sector: 'Auto',         exchange: 'NSE', aliases: ['maruti','maruti suzuki','car','auto'] },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical',      type: 'Equity', sector: 'Healthcare',  exchange: 'NSE', aliases: ['sun pharma','sunpharma','pharma'] },
  { symbol: 'ULTRACEMCO.NS',name: 'UltraTech Cement',        type: 'Equity', sector: 'Materials',   exchange: 'NSE', aliases: ['ultratech','cement','construction'] },
  { symbol: 'HINDALCO.NS',  name: 'Hindalco Industries',     type: 'Equity', sector: 'Materials',   exchange: 'NSE', aliases: ['hindalco','aluminium','metals'] },
  { symbol: 'BHARTIARTL.NS',name: 'Bharti Airtel Ltd.',      type: 'Equity', sector: 'Telecom',     exchange: 'NSE', aliases: ['airtel','bharti airtel','telecom','mobile'] },
  { symbol: 'JSWSTEEL.NS',  name: 'JSW Steel Ltd.',          type: 'Equity', sector: 'Steel',       exchange: 'NSE', aliases: ['jsw steel','jsw','steel'] },
  { symbol: 'TITAN.NS',     name: 'Titan Company Ltd.',      type: 'Equity', sector: 'Consumer',    exchange: 'NSE', aliases: ['titan','jewellery','tata','watches'] },
  { symbol: 'ASIANPAINT.NS',name: 'Asian Paints Ltd.',       type: 'Equity', sector: 'Consumer',    exchange: 'NSE', aliases: ['asian paints','paints'] },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India Ltd.',        type: 'Equity', sector: 'FMCG',       exchange: 'NSE', aliases: ['nestle','fmcg','food'] },
  { symbol: 'DMART.NS',     name: 'Avenue Supermarts (DMart)',type: 'Equity', sector: 'Retail',      exchange: 'NSE', aliases: ['dmart','avenue supermarts','retail','grocery'] },
  { symbol: 'BAJAJFINSV.NS',name: 'Bajaj Finserv Ltd.',      type: 'Equity', sector: 'Finance',     exchange: 'NSE', aliases: ['bajaj finserv','bajaj','finance'] },
  { symbol: 'CIPLA.NS',     name: 'Cipla Ltd.',              type: 'Equity', sector: 'Healthcare',  exchange: 'NSE', aliases: ['cipla','pharma','medicine'] },
  { symbol: 'DRREDDY.NS',   name: "Dr. Reddy's Laboratories",type: 'Equity', sector: 'Healthcare',  exchange: 'NSE', aliases: ['dr reddy','drreddy','pharma'] },
  { symbol: 'ZOMATO.NS',    name: 'Zomato Ltd.',             type: 'Equity', sector: 'Consumer',    exchange: 'NSE', aliases: ['zomato','food delivery','startup'] },
  { symbol: 'PAYTM.NS',     name: 'One97 Communications (Paytm)', type: 'Equity', sector: 'Fintech', exchange: 'NSE', aliases: ['paytm','one97','fintech','payments'] },
  { symbol: 'NYKAA.NS',     name: 'FSN E-Commerce (Nykaa)',  type: 'Equity', sector: 'Consumer',    exchange: 'NSE', aliases: ['nykaa','beauty','ecommerce'] },
  { symbol: 'LT.NS',        name: 'Larsen & Toubro Ltd.',    type: 'Equity', sector: 'Engineering', exchange: 'NSE', aliases: ['l&t','larsen toubro','engineering','infrastructure'] },
  { symbol: 'HAL.NS',       name: 'Hindustan Aeronautics',   type: 'Equity', sector: 'Defense',     exchange: 'NSE', aliases: ['hal','hindustan aeronautics','defence','aerospace'] },
  { symbol: 'IRFC.NS',      name: 'Indian Railway Finance',  type: 'Equity', sector: 'Finance',     exchange: 'NSE', aliases: ['irfc','railway','india'] },
  { symbol: 'PNB.NS',       name: 'Punjab National Bank',    type: 'Equity', sector: 'Banking',     exchange: 'NSE', aliases: ['pnb','punjab national bank','bank'] },
  { symbol: 'BANKBARODA.NS',name: 'Bank of Baroda',          type: 'Equity', sector: 'Banking',     exchange: 'NSE', aliases: ['bank of baroda','bob','baroda'] },
  { symbol: 'TATAPOWER.NS', name: 'Tata Power Company',      type: 'Equity', sector: 'Energy',      exchange: 'NSE', aliases: ['tata power','tata','energy','solar'] },
  { symbol: 'SUZLON.NS',    name: 'Suzlon Energy Ltd.',      type: 'Equity', sector: 'Energy',      exchange: 'NSE', aliases: ['suzlon','wind energy','renewable'] },

  // ── Indian Index ETFs ─────────────────────────────────────────────────────
  { symbol: '^NSEI',      name: 'Nifty 50 Index',          type: 'Index',  sector: 'India Market', exchange: 'NSE', aliases: ['nifty','nifty 50','nifty50','india index'] },
  { symbol: '^BSESN',     name: 'BSE Sensex Index',        type: 'Index',  sector: 'India Market', exchange: 'BSE', aliases: ['sensex','bse sensex','bse','bombay stock'] },

  // ── Global ETFs & Indices ─────────────────────────────────────────────────
  { symbol: 'SPY',    name: 'SPDR S&P 500 ETF',        type: 'ETF',    sector: 'Broad Market',    exchange: 'NYSE Arca', aliases: ['spy','s&p 500','sp500','us market'] },
  { symbol: 'QQQ',    name: 'Invesco QQQ Trust',        type: 'ETF',    sector: 'Tech',            exchange: 'NASDAQ',    aliases: ['qqq','nasdaq 100','nasdaq etf'] },
  { symbol: 'IWM',    name: 'iShares Russell 2000',     type: 'ETF',    sector: 'Small Cap',       exchange: 'NYSE Arca', aliases: ['iwm','russell 2000','small cap'] },
  { symbol: 'DIA',    name: 'SPDR Dow Jones ETF',       type: 'ETF',    sector: 'Dow Jones',       exchange: 'NYSE Arca', aliases: ['dia','dow jones','djia','dow'] },
  { symbol: 'GLD',    name: 'SPDR Gold Shares',         type: 'ETF',    sector: 'Commodities',     exchange: 'NYSE Arca', aliases: ['gold','gld','precious metals'] },
  { symbol: 'SLV',    name: 'iShares Silver Trust',     type: 'ETF',    sector: 'Commodities',     exchange: 'NYSE Arca', aliases: ['silver','slv','precious metals'] },
  { symbol: 'USO',    name: 'United States Oil Fund',   type: 'ETF',    sector: 'Commodities',     exchange: 'NYSE Arca', aliases: ['oil','crude oil','uso','petroleum'] },
  { symbol: 'VTI',    name: 'Vanguard Total Market ETF',type: 'ETF',    sector: 'Broad Market',    exchange: 'NYSE Arca', aliases: ['vti','vanguard','total market'] },
  { symbol: 'ARKK',   name: 'ARK Innovation ETF',       type: 'ETF',    sector: 'Innovation',      exchange: 'NYSE Arca', aliases: ['ark','arkk','innovation','cathie wood'] },

  // ── Market Indices ────────────────────────────────────────────────────────
  { symbol: 'VIX',     name: 'CBOE Volatility Index',   type: 'Index',  sector: 'Volatility',      exchange: 'CBOE',      aliases: ['vix','volatility','fear index','fear gauge'] },
  { symbol: '^DJI',    name: 'Dow Jones Industrial Avg',type: 'Index',  sector: 'Industrials',     exchange: 'NYSE',      aliases: ['dow','dow jones','djia'] },
  { symbol: '^GSPC',   name: 'S&P 500 Index',           type: 'Index',  sector: 'Broad Market',    exchange: 'NYSE',      aliases: ['s&p 500','sp500','spx','s&p'] },
  { symbol: '^IXIC',   name: 'NASDAQ Composite',        type: 'Index',  sector: 'Tech',            exchange: 'NASDAQ',    aliases: ['nasdaq','nasdaq composite','tech index'] },
  { symbol: '^RUT',    name: 'Russell 2000 Index',      type: 'Index',  sector: 'Small Cap',       exchange: 'NYSE',      aliases: ['russell','russell 2000','small cap'] },
  { symbol: '^FTSE',   name: 'FTSE 100 Index (UK)',     type: 'Index',  sector: 'UK Market',       exchange: 'LSE',       aliases: ['ftse','ftse 100','uk market','london'] },
  { symbol: '^N225',   name: 'Nikkei 225 (Japan)',      type: 'Index',  sector: 'Japan Market',    exchange: 'TSE',       aliases: ['nikkei','n225','japan','tokyo'] },
  { symbol: '^HSI',    name: 'Hang Seng Index (HK)',    type: 'Index',  sector: 'HK Market',       exchange: 'HKEX',      aliases: ['hang seng','hsi','hong kong'] },
  { symbol: '^STOXX50E',name: 'Euro Stoxx 50',          type: 'Index',  sector: 'Europe Market',   exchange: 'EUREX',     aliases: ['euro stoxx','stoxx','europe index'] },

  // ── Cryptocurrency ────────────────────────────────────────────────────────
  { symbol: 'BTC-USD',  name: 'Bitcoin',                type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['bitcoin','btc','crypto','digital gold','satoshi'] },
  { symbol: 'ETH-USD',  name: 'Ethereum',               type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['ethereum','eth','ether','smart contracts'] },
  { symbol: 'BNB-USD',  name: 'Binance Coin',           type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['bnb','binance','binance coin'] },
  { symbol: 'SOL-USD',  name: 'Solana',                 type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['solana','sol','fast blockchain'] },
  { symbol: 'XRP-USD',  name: 'XRP (Ripple)',           type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['ripple','xrp','payments crypto'] },
  { symbol: 'ADA-USD',  name: 'Cardano',                type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['cardano','ada','blockchain'] },
  { symbol: 'DOGE-USD', name: 'Dogecoin',               type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['dogecoin','doge','meme coin','elon'] },
  { symbol: 'DOT-USD',  name: 'Polkadot',               type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['polkadot','dot','web3'] },
  { symbol: 'AVAX-USD', name: 'Avalanche',              type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['avalanche','avax','defi'] },
  { symbol: 'MATIC-USD',name: 'Polygon',                type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['polygon','matic','layer 2','ethereum scaling'] },
  { symbol: 'LINK-USD', name: 'Chainlink',              type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['chainlink','link','oracle','defi'] },
  { symbol: 'UNI-USD',  name: 'Uniswap',                type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['uniswap','uni','dex','defi'] },
  { symbol: 'SHIB-USD', name: 'Shiba Inu',              type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['shiba','shib','meme coin'] },
  { symbol: 'LTC-USD',  name: 'Litecoin',               type: 'Crypto', sector: 'Digital Assets',  exchange: 'Crypto', aliases: ['litecoin','ltc','silver crypto'] },

  // ── Forex ─────────────────────────────────────────────────────────────────
  { symbol: 'EURUSD=X', name: 'EUR/USD',                type: 'Forex',  sector: 'Currency',        exchange: 'FX', aliases: ['euro dollar','eurusd','eur usd','forex'] },
  { symbol: 'GBPUSD=X', name: 'GBP/USD',                type: 'Forex',  sector: 'Currency',        exchange: 'FX', aliases: ['pound dollar','gbpusd','gbp usd','pound sterling'] },
  { symbol: 'USDINR=X', name: 'USD/INR',                type: 'Forex',  sector: 'Currency',        exchange: 'FX', aliases: ['dollar rupee','usdinr','usd inr','rupee'] },
  { symbol: 'USDJPY=X', name: 'USD/JPY',                type: 'Forex',  sector: 'Currency',        exchange: 'FX', aliases: ['yen dollar','usdjpy','usd jpy','yen'] },
  { symbol: 'USDCAD=X', name: 'USD/CAD',                type: 'Forex',  sector: 'Currency',        exchange: 'FX', aliases: ['canadian dollar','usdcad','cad'] },

  // ── Commodities ───────────────────────────────────────────────────────────
  { symbol: 'GC=F',    name: 'Gold Futures',            type: 'Commodity',sector:'Commodities',    exchange: 'COMEX', aliases: ['gold','gold futures','precious metal'] },
  { symbol: 'SI=F',    name: 'Silver Futures',          type: 'Commodity',sector:'Commodities',    exchange: 'COMEX', aliases: ['silver','silver futures'] },
  { symbol: 'CL=F',    name: 'Crude Oil Futures (WTI)', type: 'Commodity',sector:'Commodities',    exchange: 'NYMEX', aliases: ['crude oil','oil','wti','petroleum'] },
  { symbol: 'NG=F',    name: 'Natural Gas Futures',     type: 'Commodity',sector:'Commodities',    exchange: 'NYMEX', aliases: ['natural gas','gas futures','energy'] },
  { symbol: 'ZC=F',    name: 'Corn Futures',            type: 'Commodity',sector:'Commodities',    exchange: 'CBOT',  aliases: ['corn','grain','agriculture'] },
  { symbol: 'ZW=F',    name: 'Wheat Futures',           type: 'Commodity',sector:'Commodities',    exchange: 'CBOT',  aliases: ['wheat','grain','agriculture'] },
];

export const MARKET_CATALOG = CATALOG;
export const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'BTC-USD', 'ETH-USD', 'TATASTEEL.NS'];

export function getMarketProfile(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  return (
    CATALOG.find((item) => item.symbol.toUpperCase() === normalized) || {
      symbol: normalized || 'AAPL',
      name: normalized || 'Unknown Market',
      type: 'Market',
      sector: 'General',
      exchange: 'Global',
      description: 'Explore the price structure, signals, and practice-trading workflow for this market.',
      tags: ['Custom'],
      aliases: [],
    }
  );
}

export function searchMarkets(query = '', limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG.slice(0, limit);

  const scored = CATALOG.map((item) => {
    const sym = item.symbol.toLowerCase();
    const name = item.name.toLowerCase();
    const aliases = (item.aliases || []).join(' ').toLowerCase();
    const sector = (item.sector || '').toLowerCase();
    const exchange = (item.exchange || '').toLowerCase();

    let score = 0;
    // Exact symbol match = highest priority
    if (sym === q) score += 100;
    // Symbol starts with query
    else if (sym.startsWith(q)) score += 80;
    // Symbol contains query
    else if (sym.includes(q)) score += 60;
    // Name starts with
    else if (name.startsWith(q)) score += 50;
    // Name contains
    else if (name.includes(q)) score += 40;
    // Alias match
    else if (aliases.includes(q)) score += 35;
    // Sector match
    else if (sector.includes(q)) score += 20;
    // Exchange match
    else if (exchange.includes(q)) score += 10;

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}

export function getFeaturedMarkets() {
  return ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'SPY', 'BTC-USD', 'RELIANCE.NS', 'TCS.NS']
    .map((symbol) => getMarketProfile(symbol))
    .filter(Boolean);
}
