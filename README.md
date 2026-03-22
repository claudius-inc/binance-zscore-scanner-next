# Binance Perp Z-Score Scanner (Next.js)

A Next.js 15 dashboard that scans all Binance perpetual futures and visualizes statistical anomalies using z-scores.

![Dashboard Preview](./docs/preview.png)

## Features

- **4 Analysis Views**
  - 2D vs 5D VWAP: Quick market context
  - 2D VWAP vs Prior Week: Independent window validation
  - 2D VWAP vs Current Week: Weekly trend analysis
  - VWAP vs Funding Rate: Leverage risk detection

- **Interactive Scatter Plot**
  - Sector-based coloring (L1, DeFi, Meme, AI, etc.)
  - σ grid lines (±1σ, ±2σ, ±3σ)
  - Dynamic dot sizing by volume or open interest
  - Hover tooltips with full details

- **Filtering & Search**
  - Filter by σ threshold
  - Filter by sector
  - Symbol search
  - Dot size customization

- **Data Table**
  - Sortable columns
  - CSV export
  - Extreme value highlighting

- **Auto-refresh** every 60 seconds

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Charts:** Recharts
- **Data:** Binance Futures Public API (no auth required)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Z-Score Interpretation

| Z-Score | Meaning | Probability |
|---------|---------|-------------|
| ±1σ | Normal | 68% |
| ±2σ | Unusual | 5% |
| ±3σ | Rare | 0.3% |

Values beyond ±2σ are highlighted as statistical outliers worth investigating.

## API Routes

- `GET /api/data` - Fetches and analyzes all Binance perp symbols

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main dashboard
│   ├── layout.tsx         # Root layout
│   └── api/data/route.ts  # Data API endpoint
├── components/
│   ├── scatter-plot.tsx   # Z-score scatter plot
│   ├── filters.tsx        # Sidebar filters
│   └── data-table.tsx     # Results table
└── lib/
    ├── binance.ts         # Binance API client
    ├── vwap.ts            # VWAP calculation
    ├── zscore.ts          # Z-score calculation
    ├── sectors.ts         # Sector mappings
    └── types.ts           # TypeScript types
```

## Environment Variables

No environment variables required - uses Binance public API.

## License

MIT

## Credits

Converted from Python/Streamlit version to Next.js by Claudius Inc.
