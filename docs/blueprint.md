# **App Name**: TrafficVision

## Core Features:

- Real-time Data Ingestion: Collect real-time traffic data from stdin or file, simulating ESP32 output.
- Data Labeling: Automatically assign congestion severity (Low, Moderate, High) to incoming data based on headway_ms and gas values.
- Model Training: Train a RandomForest model on historical, labeled data from a CSV file. Clean and balance data before training.
- Congestion Forecasting: Predict congestion severity for the next 7 days based on the trained model, including LLM reasoning tool to enhance data interpretation
- Interactive UI: Provide a user interface to upload or choose data, display live summary statistics, and show model accuracy metrics.
- Forecast Visualization: Visually display the congestion forecast data.
- Visual Report Generation: Generate confusion matrices, accuracy charts, and time series plots for reports.

## Style Guidelines:

- Primary color: Dark slate blue (#37474F) for a professional and serious feel.
- Background color: Light gray (#ECEFF1) to ensure content readability.
- Accent color: Soft orange (#FFAB40) for call to actions and highlights.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern and neutral look.
- Use consistent and clear icons to represent data types and congestion levels.
- Implement a responsive layout to accommodate different screen sizes.
- Incorporate subtle transitions to enhance user experience.