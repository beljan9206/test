# Electricity Tracker (Czechia)

A simple web app to track your home electricity consumption with separate tracking for your heat pump. Costs are calculated in Czech crowns (Kč). Runs entirely in your browser — no accounts, no servers, no installation required.

## How to Use

### Step 1: Open the App

Open the `index.html` file in any web browser (Chrome, Firefox, Safari, Edge):

- **Windows**: Double-click `index.html`, or right-click > Open with > your browser
- **Mac**: Double-click `index.html`, or right-click > Open With > your browser
- **Linux**: Double-click `index.html` or run `xdg-open index.html` in a terminal

### Step 2: Set Your Electricity Rates

1. Scroll to the **Settings** section
2. Enter your **Electricity Rate** — the standard per-kWh price from your bill (default: 6.00 Kč/kWh)
3. Enter your **Heat Pump Rate** — if your heat pump runs on a cheaper tariff like D57d (default: 2.60 Kč/kWh)
4. Click **Save Settings**

**Where to find your rates**: Look at your electricity bill from your distributor (e.g. CEZ, E.ON, PRE). The rate per kWh is listed under your tariff.

### Step 3: Add Monthly Readings

Your electricity meter shows cumulative numbers. You likely have two meters (or one meter with two registers):

1. **Total Meter** — overall household electricity consumption
2. **Heat Pump Meter** — electricity consumed by the heat pump only

Each month (or whenever you get a bill):

1. Select the **Month** in the form
2. Enter the **Total Meter** reading (e.g. `12345`)
3. Enter the **Heat Pump Meter** reading (e.g. `5678`)
4. Optionally add a **Note** (e.g. "January bill")
5. Click **Add Reading**

The app automatically calculates:
- **Heat pump usage** = difference between heat pump meter readings
- **Other usage** = total usage minus heat pump usage
- **Cost** = heat pump kWh × HP rate + other kWh × standard rate

### Step 4: View Your Data

Once you have **2 or more readings**, the app will automatically show:

- **Summary cards** — latest month's total, heat pump, other usage, cost, and daily average
- **Stacked bar chart** — orange bars for heat pump, green bars for other usage, with a cost line
- **Detailed table** — every reading with calculated usage and cost breakdowns

### Step 5: Export Your Data

Click **Export CSV** to download all readings as a spreadsheet. Open it in Excel, Google Sheets, or LibreOffice Calc. The export includes separate columns for heat pump and other usage/costs.

## Where Is My Data Stored?

All data is stored in your browser's **localStorage** — it stays on your computer and is never sent anywhere. If you clear your browser data, the readings will be deleted, so use **Export CSV** to back up periodically.

## Files Overview

| File         | Purpose                                      |
| ------------ | -------------------------------------------- |
| `index.html` | The main page — open this in your browser    |
| `style.css`  | Controls how the app looks (colors, layout)  |
| `app.js`     | Contains all the logic (calculations, chart) |

## Troubleshooting

- **Chart not showing?** You need at least 2 monthly readings.
- **Usage shows "N/A"?** A meter reading is lower than the previous one — double-check your numbers.
- **Heat pump meter higher than total?** The total meter should always be the larger number (it includes the heat pump).
- **Data disappeared?** You may have cleared your browser data. Use Export CSV regularly to back up.
