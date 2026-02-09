// ========================================
// Electricity Tracker - Application Logic
// Czechia / Heat Pump split
// ========================================
//
// All data is stored in your browser's localStorage.
// Nothing is sent to any server.

(function () {
  "use strict";

  // ---- State & Config ----

  const STORAGE_KEY = "electricity_readings_v2";
  const SETTINGS_KEY = "electricity_settings_v2";

  let readings = loadReadings();
  let settings = loadSettings();
  let chart = null;

  // ---- DOM Elements ----

  const form = document.getElementById("reading-form");
  const monthInput = document.getElementById("reading-month");
  const totalInput = document.getElementById("reading-total");
  const heatPumpInput = document.getElementById("reading-heatpump");
  const noteInput = document.getElementById("reading-note");
  const rateInput = document.getElementById("rate-input");
  const rateHpInput = document.getElementById("rate-hp-input");
  const saveSettingsBtn = document.getElementById("save-settings");
  const exportBtn = document.getElementById("export-btn");
  const readingsBody = document.getElementById("readings-body");
  const tableEmpty = document.getElementById("table-empty");
  const chartEmpty = document.getElementById("chart-empty");
  const monthlyUsageEl = document.getElementById("monthly-usage");
  const monthlyHpEl = document.getElementById("monthly-hp");
  const monthlyOtherEl = document.getElementById("monthly-other");
  const monthlyCostEl = document.getElementById("monthly-cost");
  const dailyAvgEl = document.getElementById("daily-avg");
  const totalReadingsEl = document.getElementById("total-readings");

  // ---- Initialization ----

  function init() {
    // Set default month to current month
    monthInput.value = currentMonthString();

    // Load saved settings into inputs
    rateInput.value = settings.rate;
    rateHpInput.value = settings.rateHp;

    // Wire up events
    form.addEventListener("submit", handleAddReading);
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
    exportBtn.addEventListener("click", handleExport);

    // Render everything
    render();
  }

  // ---- Data helpers ----

  function loadReadings() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveReadings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  }

  function loadSettings() {
    try {
      var data = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return data && typeof data.rate === "number"
        ? data
        : { rate: 6.0, rateHp: 2.6 };
    } catch (e) {
      return { rate: 6.0, rateHp: 2.6 };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // Sort readings by month ascending
  function sortedReadings() {
    return readings.slice().sort(function (a, b) {
      return a.month.localeCompare(b.month);
    });
  }

  // ---- Event Handlers ----

  function handleAddReading(e) {
    e.preventDefault();

    var month = monthInput.value;
    var totalVal = parseFloat(totalInput.value);
    var hpVal = parseFloat(heatPumpInput.value);
    var note = noteInput.value.trim();

    if (!month || isNaN(totalVal) || totalVal < 0 || isNaN(hpVal) || hpVal < 0) {
      showToast("Please fill in the month and both meter readings.");
      return;
    }

    if (hpVal > totalVal) {
      showToast("Heat pump meter cannot be higher than total meter.");
      return;
    }

    // Check for duplicate month
    var duplicate = readings.some(function (r) {
      return r.month === month;
    });
    if (duplicate) {
      showToast("A reading for this month already exists.");
      return;
    }

    readings.push({
      month: month,
      totalValue: totalVal,
      heatPumpValue: hpVal,
      note: note,
    });
    saveReadings();
    render();

    // Reset form
    totalInput.value = "";
    heatPumpInput.value = "";
    noteInput.value = "";
    monthInput.value = currentMonthString();
    totalInput.focus();

    showToast("Reading added.");
  }

  function handleDeleteReading(month) {
    if (!confirm("Delete reading for " + formatMonth(month) + "?")) return;
    readings = readings.filter(function (r) {
      return r.month !== month;
    });
    saveReadings();
    render();
    showToast("Reading deleted.");
  }

  function handleSaveSettings() {
    var rate = parseFloat(rateInput.value);
    var rateHp = parseFloat(rateHpInput.value);

    if (isNaN(rate) || rate < 0 || isNaN(rateHp) || rateHp < 0) {
      showToast("Please enter valid rates.");
      return;
    }

    settings.rate = rate;
    settings.rateHp = rateHp;
    saveSettings();
    render();
    showToast("Settings saved.");
  }

  function handleExport() {
    var sorted = sortedReadings();
    if (sorted.length === 0) {
      showToast("No data to export.");
      return;
    }

    var rows = [[
      "Month",
      "Total Meter (kWh)",
      "Heat Pump Meter (kWh)",
      "Total Usage (kWh)",
      "Heat Pump Usage (kWh)",
      "Other Usage (kWh)",
      "HP Cost (Kč)",
      "Other Cost (Kč)",
      "Total Cost (Kč)",
      "Note",
    ]];

    for (var i = 0; i < sorted.length; i++) {
      var totalUsage = "";
      var hpUsage = "";
      var otherUsage = "";
      var hpCost = "";
      var otherCost = "";
      var totalCost = "";

      if (i > 0) {
        var tDiff = sorted[i].totalValue - sorted[i - 1].totalValue;
        var hDiff = sorted[i].heatPumpValue - sorted[i - 1].heatPumpValue;
        if (tDiff >= 0 && hDiff >= 0) {
          var other = tDiff - hDiff;
          if (other < 0) other = 0;
          totalUsage = tDiff.toFixed(2);
          hpUsage = hDiff.toFixed(2);
          otherUsage = other.toFixed(2);
          hpCost = (hDiff * settings.rateHp).toFixed(2);
          otherCost = (other * settings.rate).toFixed(2);
          totalCost = (hDiff * settings.rateHp + other * settings.rate).toFixed(2);
        }
      }

      rows.push([
        sorted[i].month,
        sorted[i].totalValue.toFixed(2),
        sorted[i].heatPumpValue.toFixed(2),
        totalUsage,
        hpUsage,
        otherUsage,
        hpCost,
        otherCost,
        totalCost,
        '"' + (sorted[i].note || "") + '"',
      ]);
    }

    var csv = rows.map(function (r) { return r.join(","); }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "electricity-readings.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported.");
  }

  // ---- Rendering ----

  function render() {
    var sorted = sortedReadings();

    renderTable(sorted);
    renderSummary(sorted);
    renderChart(sorted);
  }

  function renderTable(sorted) {
    readingsBody.innerHTML = "";

    if (sorted.length === 0) {
      tableEmpty.style.display = "block";
      document.getElementById("readings-table").style.display = "none";
      return;
    }

    tableEmpty.style.display = "none";
    document.getElementById("readings-table").style.display = "table";

    // Show most recent first in table
    for (var i = sorted.length - 1; i >= 0; i--) {
      var r = sorted[i];
      var totalUsage = "-";
      var hpUsage = "-";
      var otherUsage = "-";
      var cost = "-";

      if (i > 0) {
        var tDiff = r.totalValue - sorted[i - 1].totalValue;
        var hDiff = r.heatPumpValue - sorted[i - 1].heatPumpValue;

        if (tDiff >= 0 && hDiff >= 0) {
          var other = tDiff - hDiff;
          if (other < 0) other = 0;
          totalUsage = tDiff.toFixed(1) + " kWh";
          hpUsage = hDiff.toFixed(1) + " kWh";
          otherUsage = other.toFixed(1) + " kWh";
          var totalCost = hDiff * settings.rateHp + other * settings.rate;
          cost = formatCurrency(totalCost);
        } else {
          totalUsage = "N/A";
          hpUsage = "N/A";
          otherUsage = "N/A";
          cost = "N/A";
        }
      }

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + formatMonth(r.month) + "</td>" +
        "<td>" + r.totalValue.toFixed(1) + "</td>" +
        "<td>" + r.heatPumpValue.toFixed(1) + "</td>" +
        "<td class='usage-total'>" + totalUsage + "</td>" +
        "<td class='usage-hp'>" + hpUsage + "</td>" +
        "<td class='usage-other'>" + otherUsage + "</td>" +
        "<td>" + cost + "</td>" +
        "<td>" + escapeHtml(r.note || "") + "</td>" +
        "<td></td>";

      // Add delete button
      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("data-month", r.month);
      deleteBtn.addEventListener("click", function () {
        handleDeleteReading(this.getAttribute("data-month"));
      });
      tr.lastChild.appendChild(deleteBtn);

      readingsBody.appendChild(tr);
    }
  }

  function renderSummary(sorted) {
    totalReadingsEl.textContent = sorted.length;

    if (sorted.length < 2) {
      monthlyUsageEl.textContent = "0 kWh";
      monthlyHpEl.textContent = "0 kWh";
      monthlyOtherEl.textContent = "0 kWh";
      monthlyCostEl.textContent = "0 Kč";
      dailyAvgEl.textContent = "0 kWh";
      return;
    }

    // Latest period = difference between last two readings
    var last = sorted[sorted.length - 1];
    var prev = sorted[sorted.length - 2];

    var tDiff = Math.max(0, last.totalValue - prev.totalValue);
    var hDiff = Math.max(0, last.heatPumpValue - prev.heatPumpValue);
    var other = Math.max(0, tDiff - hDiff);

    monthlyUsageEl.textContent = tDiff.toFixed(1) + " kWh";
    monthlyHpEl.textContent = hDiff.toFixed(1) + " kWh";
    monthlyOtherEl.textContent = other.toFixed(1) + " kWh";

    var totalCost = hDiff * settings.rateHp + other * settings.rate;
    monthlyCostEl.textContent = formatCurrency(totalCost);

    // Daily average across all data (approximate 30 days per month gap)
    var totalUsage = last.totalValue - sorted[0].totalValue;
    var months = sorted.length - 1;
    var approxDays = months * 30;
    var dailyAvg = approxDays > 0 ? Math.max(0, totalUsage / approxDays) : 0;
    dailyAvgEl.textContent = dailyAvg.toFixed(1) + " kWh";
  }

  function renderChart(sorted) {
    var canvas = document.getElementById("usage-chart");

    if (sorted.length < 2) {
      chartEmpty.style.display = "block";
      canvas.style.display = "none";
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    chartEmpty.style.display = "none";
    canvas.style.display = "block";

    // Build usage data (difference between consecutive readings)
    var labels = [];
    var hpData = [];
    var otherData = [];
    var costData = [];

    for (var i = 1; i < sorted.length; i++) {
      var tDiff = sorted[i].totalValue - sorted[i - 1].totalValue;
      var hDiff = sorted[i].heatPumpValue - sorted[i - 1].heatPumpValue;
      if (tDiff < 0) tDiff = 0;
      if (hDiff < 0) hDiff = 0;
      var other = Math.max(0, tDiff - hDiff);

      labels.push(formatMonth(sorted[i].month));
      hpData.push(parseFloat(hDiff.toFixed(2)));
      otherData.push(parseFloat(other.toFixed(2)));
      costData.push(parseFloat((hDiff * settings.rateHp + other * settings.rate).toFixed(2)));
    }

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Heat Pump (kWh)",
            data: hpData,
            backgroundColor: "rgba(234, 88, 12, 0.7)",
            borderColor: "rgba(234, 88, 12, 1)",
            borderWidth: 1,
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
            stack: "usage",
            yAxisID: "y",
          },
          {
            label: "Other (kWh)",
            data: otherData,
            backgroundColor: "rgba(22, 163, 74, 0.6)",
            borderColor: "rgba(22, 163, 74, 1)",
            borderWidth: 1,
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            stack: "usage",
            yAxisID: "y",
          },
          {
            label: "Cost (Kč)",
            data: costData,
            type: "line",
            borderColor: "rgba(30, 64, 175, 1)",
            backgroundColor: "rgba(30, 64, 175, 0.1)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "rgba(30, 64, 175, 1)",
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: "kWh",
            },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            title: {
              display: true,
              text: "Kč",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              afterBody: function (items) {
                // Show total kWh in tooltip
                var totalKwh = 0;
                items.forEach(function (item) {
                  if (item.dataset.stack === "usage") {
                    totalKwh += item.parsed.y;
                  }
                });
                return "Total: " + totalKwh.toFixed(1) + " kWh";
              },
            },
          },
        },
      },
    });
  }

  // ---- Utility Functions ----

  function currentMonthString() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0")
    );
  }

  function formatMonth(monthStr) {
    var parts = monthStr.split("-");
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function formatCurrency(amount) {
    // Czech convention: number then Kč, use space as thousands separator
    return Math.round(amount).toLocaleString("cs-CZ") + " Kč";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2500);
  }

  // ---- Start ----
  init();
})();
