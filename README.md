# Electricity Tracker

A simple web app to track your home electricity consumption and costs. Runs entirely in your browser — no accounts, no servers, no installation required.

## How to Use

### Step 1: Open the App

Open the `index.html` file in any web browser (Chrome, Firefox, Safari, Edge):

- **Windows**: Double-click `index.html`, or right-click > Open with > your browser
- **Mac**: Double-click `index.html`, or right-click > Open With > your browser
- **Linux**: Double-click `index.html` or run `xdg-open index.html` in a terminal

### Step 2: Set Your Electricity Rate

1. Scroll to the **Settings** section
2. Enter your electricity rate (found on your electricity bill — usually shown as "price per kWh")
3. Change the currency symbol if needed (default is `$`)
4. Click **Save Settings**

### Step 3: Add Meter Readings

Your electricity meter shows a cumulative number (total kWh used since the meter was installed). To track usage:

1. Go to your electricity meter and write down the number displayed
2. In the app, pick the **Date** you took the reading
3. Enter the **Meter Reading** number (e.g., `12345.67`)
4. Optionally add a **Note** (e.g., "monthly bill reading")
5. Click **Add Reading**
6. Repeat this regularly (daily, weekly, or monthly)

**Tip**: The more often you add readings, the more detailed your tracking will be.

### Step 4: View Your Data

Once you have **2 or more readings**, the app will automatically:

- Calculate **usage** (kWh consumed between readings)
- Estimate **cost** for each period
- Show a **bar chart** of usage over time
- Display **summary cards** with monthly usage, cost, and daily average

### Step 5: Export Your Data

Click the **Export CSV** button to download all your readings as a spreadsheet file. You can open this in Excel, Google Sheets, or any spreadsheet app.

## Where Is My Data Stored?

All data is stored in your browser's **localStorage** — it stays on your computer and is never sent anywhere. If you clear your browser data, the readings will be deleted, so use the **Export CSV** feature to back up your data periodically.

## Files Overview

| File         | Purpose                                      |
| ------------ | -------------------------------------------- |
| `index.html` | The main page — open this in your browser    |
| `style.css`  | Controls how the app looks (colors, layout)  |
| `app.js`     | Contains all the logic (calculations, chart) |

## Troubleshooting

- **Chart not showing?** You need at least 2 readings on different dates.
- **Usage shows "N/A"?** The meter reading is lower than the previous one — double-check your numbers.
- **Data disappeared?** You may have cleared your browser data. Use Export CSV regularly to back up.
