# TeleSol Dashboard

Real-time Network Operations Center (NOC) dashboard for TeleSol - Predictive Telecom Intelligence.

## Features

### Core Dashboard
- 🟢 **Live Stats** - Real-time tower count, device connections, utilization
- 🗺️ **Interactive Leaflet Map** - Delhi NCR map with tower markers and CRS status
- 📊 **Zone Comparison** - Side-by-side CRS scores by region
- 🍩 **Risk Distribution** - Donut chart showing risk levels
- 🚨 **Active Alerts** - Real-time alerts with severity levels

### Developer Telemetry Panels
- **Sensor Health** - Status of radar, camera, mic, WiFi scanner, ToF sensor
- **Live Sensor Data** - Real-time counts with auto-refresh
- **Prediction Confidence** - AI model confidence score and agreement
- **AI Model Status** - Model version, latency, accuracy metrics
- **Data Pipeline Monitor** - Packets/sec, queue size, server latency
- **Tower Load Forecast** - +10 minute load prediction chart
- **Device Detection** - WiFi/Bluetooth device counts and signal strength
- **Event Timeline** - Scrollable log of system events
- **System Resources** - CPU, RAM, API latency, DB write rate

### Debug Mode
Toggle debug mode to reveal:
- Raw sensor JSON values
- Model hashes and training dates
- Kafka lag and Redis connections
- Event buffer stats

## Tech Stack

- **React 18** + **Vite** - Fast development
- **Tailwind CSS** - Dark NOC theme styling
- **Recharts** - Charts and visualizations
- **Leaflet + React-Leaflet** - Interactive mapping
- **Lucide React** - Icons

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
telesol-dashboard/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Top bar with debug toggle
│   │   ├── StatsCard.jsx           # Metric display cards
│   │   ├── ZoneChart.jsx           # Zone comparison bars
│   │   ├── RiskDonut.jsx           # Risk distribution chart
│   │   ├── AlertCard.jsx           # Alert display
│   │   ├── NetworkMap.jsx          # Leaflet map with towers
│   │   ├── SensorHealthPanel.jsx   # Sensor status indicators
│   │   ├── LiveSensorDataPanel.jsx # Real-time sensor readings
│   │   ├── PredictionConfidencePanel.jsx
│   │   ├── AIModelStatusPanel.jsx
│   │   ├── DataPipelineMonitor.jsx
│   │   ├── TowerLoadForecast.jsx
│   │   ├── DeviceDetectionMetrics.jsx
│   │   ├── EventTimeline.jsx
│   │   └── SystemResourceMonitor.jsx
│   ├── data/
│   │   └── mockData.js             # All mock data
│   ├── App.jsx                     # Main layout
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Tailwind + Leaflet styles
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Map Features

The Leaflet map shows:
- Tower markers sized by CRS severity
- Color-coded status (green/orange/red)
- Click markers for tower details popup
- Pan/zoom updates the header location name
- Dark CartoDB basemap tiles

## License

MIT © TeleSol Team
