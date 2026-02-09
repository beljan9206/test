// ========================================
// Sledování spotřeby elektřiny
// ========================================
//
// Veškerá data jsou uložena v localStorage prohlížeče.
// Nic se nikam neodesílá.

(function () {
  "use strict";

  // ---- State & Config ----

  var STORAGE_KEY = "electricity_readings_v3";
  var SETTINGS_KEY = "electricity_settings_v3";

  var readings = loadReadings();
  var settings = loadSettings();
  var chart = null;

  // Czech month names
  var MONTHS_CS = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  // ---- DOM Elements ----

  var form = document.getElementById("reading-form");
  var monthSelect = document.getElementById("reading-month-select");
  var yearSelect = document.getElementById("reading-year-select");
  var totalInput = document.getElementById("reading-total");
  var heatPumpInput = document.getElementById("reading-heatpump");
  var noteInput = document.getElementById("reading-note");
  var rateInput = document.getElementById("rate-input");
  var saveSettingsBtn = document.getElementById("save-settings");
  var exportBtn = document.getElementById("export-btn");
  var readingsBody = document.getElementById("readings-body");
  var tableEmpty = document.getElementById("table-empty");
  var chartEmpty = document.getElementById("chart-empty");
  var monthlyUsageEl = document.getElementById("monthly-usage");
  var monthlyUsageSubEl = document.getElementById("monthly-usage-sub");
  var monthlyHpEl = document.getElementById("monthly-hp");
  var monthlyHpPctEl = document.getElementById("monthly-hp-pct");
  var monthlyOtherEl = document.getElementById("monthly-other");
  var monthlyOtherPctEl = document.getElementById("monthly-other-pct");
  var monthlyCostEl = document.getElementById("monthly-cost");
  var dailyAvgEl = document.getElementById("daily-avg");
  var totalReadingsEl = document.getElementById("total-readings");

  // ---- Initialization ----

  function init() {
    // Populate year dropdown (current year -5 to +1)
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1;
    for (var y = currentYear - 5; y <= currentYear + 1; y++) {
      var opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
    // Pre-select current month
    monthSelect.value = String(currentMonth).padStart(2, "0");

    rateInput.value = settings.rate;

    form.addEventListener("submit", handleAddReading);
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
    exportBtn.addEventListener("click", handleExport);

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
        : { rate: 6.0 };
    } catch (e) {
      return { rate: 6.0 };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function sortedReadings() {
    return readings.slice().sort(function (a, b) {
      return a.month.localeCompare(b.month);
    });
  }

  // ---- Event Handlers ----

  function handleAddReading(e) {
    e.preventDefault();

    var month = yearSelect.value + "-" + monthSelect.value;
    var totalVal = parseFloat(totalInput.value);
    var hpVal = parseFloat(heatPumpInput.value);
    var note = noteInput.value.trim();

    if (!yearSelect.value || !monthSelect.value || isNaN(totalVal) || totalVal < 0 || isNaN(hpVal) || hpVal < 0) {
      showToast("Vyplňte měsíc a oba odečty elektroměru.");
      return;
    }

    if (hpVal > totalVal) {
      showToast("Odečet TČ nemůže být vyšší než celkový elektroměr.");
      return;
    }

    var duplicate = readings.some(function (r) {
      return r.month === month;
    });
    if (duplicate) {
      showToast("Odečet pro tento měsíc již existuje.");
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

    totalInput.value = "";
    heatPumpInput.value = "";
    noteInput.value = "";
    // Reset to current month
    var now = new Date();
    yearSelect.value = now.getFullYear();
    monthSelect.value = String(now.getMonth() + 1).padStart(2, "0");
    totalInput.focus();

    showToast("Odečet přidán.");
  }

  function handleDeleteReading(month) {
    if (!confirm("Smazat odečet za " + formatMonth(month) + "?")) return;
    readings = readings.filter(function (r) {
      return r.month !== month;
    });
    saveReadings();
    render();
    showToast("Odečet smazán.");
  }

  function handleSaveSettings() {
    var rate = parseFloat(rateInput.value);

    if (isNaN(rate) || rate < 0) {
      showToast("Zadejte platnou cenu za kWh.");
      return;
    }

    settings.rate = rate;
    saveSettings();
    render();
    showToast("Nastavení uloženo.");
  }

  function handleExport() {
    var sorted = sortedReadings();
    if (sorted.length === 0) {
      showToast("Žádná data k exportu.");
      return;
    }

    var rows = [[
      "Měsíc",
      "Celkový elektroměr (kWh)",
      "Elektroměr TČ (kWh)",
      "Spotřeba celkem (kWh)",
      "Tepelné čerpadlo (kWh)",
      "Ostatní (kWh)",
      "Náklady (Kč)",
      "Poznámka",
    ]];

    for (var i = 0; i < sorted.length; i++) {
      var totalUsage = "";
      var hpUsage = "";
      var otherUsage = "";
      var cost = "";

      if (i > 0) {
        var tDiff = sorted[i].totalValue - sorted[i - 1].totalValue;
        var hDiff = sorted[i].heatPumpValue - sorted[i - 1].heatPumpValue;
        if (tDiff >= 0 && hDiff >= 0) {
          var other = Math.max(0, tDiff - hDiff);
          totalUsage = tDiff.toFixed(2);
          hpUsage = hDiff.toFixed(2);
          otherUsage = other.toFixed(2);
          cost = (tDiff * settings.rate).toFixed(2);
        }
      }

      rows.push([
        sorted[i].month,
        sorted[i].totalValue.toFixed(2),
        sorted[i].heatPumpValue.toFixed(2),
        totalUsage,
        hpUsage,
        otherUsage,
        cost,
        '"' + (sorted[i].note || "") + '"',
      ]);
    }

    var csv = rows.map(function (r) { return r.join(";"); }).join("\n");
    var bom = "\uFEFF";
    var blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "spotreba-elektriny.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportováno.");
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
          var other = Math.max(0, tDiff - hDiff);
          totalUsage = tDiff.toFixed(1) + " kWh";
          hpUsage = hDiff.toFixed(1) + " kWh";
          otherUsage = other.toFixed(1) + " kWh";
          cost = formatCurrency(tDiff * settings.rate);
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

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Smazat";
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
      monthlyUsageSubEl.textContent = "poslední období";
      monthlyHpEl.textContent = "0 kWh";
      monthlyHpPctEl.textContent = "0 % z celku";
      monthlyOtherEl.textContent = "0 kWh";
      monthlyOtherPctEl.textContent = "0 % z celku";
      monthlyCostEl.textContent = "0 Kč";
      dailyAvgEl.textContent = "0 kWh";
      return;
    }

    var last = sorted[sorted.length - 1];
    var prev = sorted[sorted.length - 2];

    var tDiff = Math.max(0, last.totalValue - prev.totalValue);
    var hDiff = Math.max(0, last.heatPumpValue - prev.heatPumpValue);
    var other = Math.max(0, tDiff - hDiff);

    monthlyUsageEl.textContent = tDiff.toFixed(1) + " kWh";
    monthlyUsageSubEl.textContent = formatMonth(prev.month) + " → " + formatMonth(last.month);

    monthlyHpEl.textContent = hDiff.toFixed(1) + " kWh";
    monthlyOtherEl.textContent = other.toFixed(1) + " kWh";

    if (tDiff > 0) {
      monthlyHpPctEl.textContent = Math.round((hDiff / tDiff) * 100) + " % z celku";
      monthlyOtherPctEl.textContent = Math.round((other / tDiff) * 100) + " % z celku";
    } else {
      monthlyHpPctEl.textContent = "0 % z celku";
      monthlyOtherPctEl.textContent = "0 % z celku";
    }

    // Cost = total consumption × rate
    monthlyCostEl.textContent = formatCurrency(tDiff * settings.rate);

    // Daily average
    var totalUsage = last.totalValue - sorted[0].totalValue;
    var numMonths = sorted.length - 1;
    var approxDays = numMonths * 30;
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
      hpData.push(parseFloat(hDiff.toFixed(1)));
      otherData.push(parseFloat(other.toFixed(1)));
      costData.push(parseFloat((tDiff * settings.rate).toFixed(0)));
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
            label: "Tepelné čerpadlo (kWh)",
            data: hpData,
            backgroundColor: "rgba(234, 88, 12, 0.75)",
            borderColor: "rgba(234, 88, 12, 1)",
            borderWidth: 1,
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
            stack: "usage",
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Ostatní spotřeba (kWh)",
            data: otherData,
            backgroundColor: "rgba(22, 163, 74, 0.65)",
            borderColor: "rgba(22, 163, 74, 1)",
            borderWidth: 1,
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            stack: "usage",
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Náklady (Kč)",
            data: costData,
            type: "line",
            borderColor: "rgba(124, 58, 237, 1)",
            backgroundColor: "rgba(124, 58, 237, 0.08)",
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: "#fff",
            pointBorderColor: "rgba(124, 58, 237, 1)",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.3,
            yAxisID: "y1",
            order: 1,
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
            grid: { display: false },
            ticks: {
              font: { size: 11, weight: "600" },
              color: "#64748b",
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: "kWh",
              font: { size: 12, weight: "600" },
              color: "#64748b",
            },
            grid: { color: "rgba(0,0,0,0.04)" },
            ticks: {
              font: { size: 11 },
              color: "#94a3b8",
            },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            title: {
              display: true,
              text: "Kč",
              font: { size: 12, weight: "600" },
              color: "#64748b",
            },
            grid: { drawOnChartArea: false },
            ticks: {
              font: { size: 11 },
              color: "#94a3b8",
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyleWidth: 12,
              font: { size: 12, weight: "500" },
              color: "#334155",
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            titleFont: { size: 13, weight: "700" },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              afterBody: function (items) {
                var totalKwh = 0;
                items.forEach(function (item) {
                  if (item.dataset.stack === "usage") {
                    totalKwh += item.parsed.y;
                  }
                });
                return "Celkem: " + totalKwh.toFixed(1) + " kWh";
              },
            },
          },
        },
      },
    });
  }

  // ---- Utility Functions ----

  function formatMonth(monthStr) {
    var parts = monthStr.split("-");
    var idx = parseInt(parts[1], 10) - 1;
    return MONTHS_CS[idx] + " " + parts[0];
  }

  function formatCurrency(amount) {
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
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  // ---- Start ----
  init();
})();
