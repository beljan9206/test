// ========================================
// Electricity Tracker - Application Logic
// ========================================
//
// All data is stored in your browser's localStorage.
// Nothing is sent to any server.

(function () {
  "use strict";

  // ---- State & Config ----

  const STORAGE_KEY = "electricity_readings";
  const SETTINGS_KEY = "electricity_settings";

  let readings = loadReadings();
  let settings = loadSettings();
  let chart = null;

  // ---- DOM Elements ----

  const form = document.getElementById("reading-form");
  const dateInput = document.getElementById("reading-date");
  const valueInput = document.getElementById("reading-value");
  const noteInput = document.getElementById("reading-note");
  const rateInput = document.getElementById("rate-input");
  const currencyInput = document.getElementById("currency-input");
  const saveSettingsBtn = document.getElementById("save-settings");
  const exportBtn = document.getElementById("export-btn");
  const readingsBody = document.getElementById("readings-body");
  const tableEmpty = document.getElementById("table-empty");
  const chartEmpty = document.getElementById("chart-empty");
  const monthlyUsageEl = document.getElementById("monthly-usage");
  const monthlyCostEl = document.getElementById("monthly-cost");
  const dailyAvgEl = document.getElementById("daily-avg");
  const totalReadingsEl = document.getElementById("total-readings");

  // ---- Initialization ----

  function init() {
    // Set default date to today
    dateInput.value = todayString();

    // Load saved settings into inputs
    rateInput.value = settings.rate;
    currencyInput.value = settings.currency;

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
        : { rate: 0.12, currency: "$" };
    } catch (e) {
      return { rate: 0.12, currency: "$" };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // Sort readings by date ascending
  function sortedReadings() {
    return readings.slice().sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
  }

  // ---- Event Handlers ----

  function handleAddReading(e) {
    e.preventDefault();

    var date = dateInput.value;
    var value = parseFloat(valueInput.value);
    var note = noteInput.value.trim();

    if (!date || isNaN(value) || value < 0) {
      showToast("Please enter a valid date and meter reading.");
      return;
    }

    // Check for duplicate date
    var duplicate = readings.some(function (r) {
      return r.date === date;
    });
    if (duplicate) {
      showToast("A reading for this date already exists.");
      return;
    }

    readings.push({ date: date, value: value, note: note });
    saveReadings();
    render();

    // Reset form
    valueInput.value = "";
    noteInput.value = "";
    dateInput.value = todayString();
    valueInput.focus();

    showToast("Reading added.");
  }

  function handleDeleteReading(date) {
    if (!confirm("Delete reading for " + date + "?")) return;
    readings = readings.filter(function (r) {
      return r.date !== date;
    });
    saveReadings();
    render();
    showToast("Reading deleted.");
  }

  function handleSaveSettings() {
    var rate = parseFloat(rateInput.value);
    var currency = currencyInput.value.trim() || "$";

    if (isNaN(rate) || rate < 0) {
      showToast("Please enter a valid rate.");
      return;
    }

    settings.rate = rate;
    settings.currency = currency;
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

    var rows = [["Date", "Meter (kWh)", "Usage (kWh)", "Cost", "Note"]];

    for (var i = 0; i < sorted.length; i++) {
      var usage = "";
      var cost = "";
      if (i > 0) {
        var diff = sorted[i].value - sorted[i - 1].value;
        if (diff >= 0) {
          usage = diff.toFixed(2);
          cost = (diff * settings.rate).toFixed(2);
        }
      }
      rows.push([
        sorted[i].date,
        sorted[i].value.toFixed(2),
        usage,
        cost,
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
      var usage = "-";
      var cost = "-";

      if (i > 0) {
        var diff = r.value - sorted[i - 1].value;
        if (diff >= 0) {
          usage = diff.toFixed(2) + " kWh";
          cost = settings.currency + (diff * settings.rate).toFixed(2);
        } else {
          usage = "N/A";
          cost = "N/A";
        }
      }

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + formatDate(r.date) + "</td>" +
        "<td>" + r.value.toFixed(2) + "</td>" +
        "<td class='usage-positive'>" + usage + "</td>" +
        "<td>" + cost + "</td>" +
        "<td>" + escapeHtml(r.note || "") + "</td>" +
        "<td></td>";

      // Add delete button
      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("data-date", r.date);
      deleteBtn.addEventListener("click", function () {
        handleDeleteReading(this.getAttribute("data-date"));
      });
      tr.lastChild.appendChild(deleteBtn);

      readingsBody.appendChild(tr);
    }
  }

  function renderSummary(sorted) {
    totalReadingsEl.textContent = sorted.length;

    if (sorted.length < 2) {
      monthlyUsageEl.textContent = "0 kWh";
      monthlyCostEl.textContent = settings.currency + "0.00";
      dailyAvgEl.textContent = "0 kWh";
      return;
    }

    // Calculate this month's usage
    var now = new Date();
    var yearMonth =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    var monthReadings = sorted.filter(function (r) {
      return r.date.substring(0, 7) === yearMonth;
    });

    var monthUsage = 0;
    if (monthReadings.length >= 2) {
      monthUsage =
        monthReadings[monthReadings.length - 1].value -
        monthReadings[0].value;
    } else if (monthReadings.length === 1) {
      // Compare with last reading of previous month
      var prevReadings = sorted.filter(function (r) {
        return r.date.substring(0, 7) < yearMonth;
      });
      if (prevReadings.length > 0) {
        monthUsage =
          monthReadings[0].value -
          prevReadings[prevReadings.length - 1].value;
      }
    }

    monthUsage = Math.max(0, monthUsage);
    monthlyUsageEl.textContent = monthUsage.toFixed(1) + " kWh";
    monthlyCostEl.textContent =
      settings.currency + (monthUsage * settings.rate).toFixed(2);

    // Daily average across all data
    var totalUsage = sorted[sorted.length - 1].value - sorted[0].value;
    var firstDate = new Date(sorted[0].date);
    var lastDate = new Date(sorted[sorted.length - 1].date);
    var daysDiff = Math.max(
      1,
      Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24))
    );
    var dailyAvg = Math.max(0, totalUsage / daysDiff);
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
    var usageData = [];
    var costData = [];

    for (var i = 1; i < sorted.length; i++) {
      var diff = sorted[i].value - sorted[i - 1].value;
      if (diff < 0) diff = 0;
      labels.push(formatDate(sorted[i].date));
      usageData.push(parseFloat(diff.toFixed(2)));
      costData.push(parseFloat((diff * settings.rate).toFixed(2)));
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
            label: "Usage (kWh)",
            data: usageData,
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Cost (" + settings.currency + ")",
            data: costData,
            type: "line",
            borderColor: "rgba(234, 88, 12, 1)",
            backgroundColor: "rgba(234, 88, 12, 0.1)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "rgba(234, 88, 12, 1)",
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
          y: {
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
              text: settings.currency,
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
        },
      },
    });
  }

  // ---- Utility Functions ----

  function todayString() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function formatDate(dateStr) {
    var parts = dateStr.split("-");
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message) {
    // Remove existing toast
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger show
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    // Auto-hide after 2.5 seconds
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
