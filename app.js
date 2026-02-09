// ========================================
// Rozúčtování elektřiny – dva domy
// ========================================
// Veškerá data v localStorage. Nic se nikam neodesílá.

(function () {
  "use strict";

  var STORAGE_KEY = "electricity_readings_v4";
  var SETTINGS_KEY = "electricity_settings_v4";

  var readings = loadReadings();
  var settings = loadSettings();
  var chart = null;

  var MONTHS_CS = [
    "Leden","Únor","Březen","Duben","Květen","Červen",
    "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
  ];

  // ---- DOM ----
  var form         = document.getElementById("reading-form");
  var monthSel     = document.getElementById("reading-month-select");
  var yearSel      = document.getElementById("reading-year-select");
  var inGrid       = document.getElementById("in-grid");
  var inExport     = document.getElementById("in-export");
  var inFve        = document.getElementById("in-fve");
  var inH1         = document.getElementById("in-h1");
  var inH2         = document.getElementById("in-h2");
  var inHp         = document.getElementById("in-hp");
  var inNote       = document.getElementById("in-note");
  var rateInput    = document.getElementById("rate-input");
  var saveBtn      = document.getElementById("save-settings");
  var exportBtn    = document.getElementById("export-btn");
  var tbody        = document.getElementById("readings-body");
  var tableEmpty   = document.getElementById("table-empty");
  var chartEmpty   = document.getElementById("chart-empty");

  // summary
  var elSumGrid    = document.getElementById("sum-grid");
  var elSumGridC   = document.getElementById("sum-grid-cost");
  var elSumFve     = document.getElementById("sum-fve");
  var elSumFvePct  = document.getElementById("sum-fve-pct");
  var elSumH1      = document.getElementById("sum-h1");
  var elSumH1C     = document.getElementById("sum-h1-cost");
  var elSumH2      = document.getElementById("sum-h2");
  var elSumH2C     = document.getElementById("sum-h2-cost");
  var elSumHp      = document.getElementById("sum-hp");
  var elSumHpPct   = document.getElementById("sum-hp-pct");
  var elSumExport  = document.getElementById("sum-export");

  // ---- Init ----
  function init() {
    var now = new Date();
    for (var y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
      var o = document.createElement("option");
      o.value = y; o.textContent = y;
      if (y === now.getFullYear()) o.selected = true;
      yearSel.appendChild(o);
    }
    monthSel.value = String(now.getMonth() + 1).padStart(2, "0");
    rateInput.value = settings.rate;

    form.addEventListener("submit", onAdd);
    saveBtn.addEventListener("click", onSaveSettings);
    exportBtn.addEventListener("click", onExport);
    render();
  }

  // ---- Data ----
  function loadReadings() {
    try { var d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }
    catch(e) { return []; }
  }
  function saveReadings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(readings)); }
  function loadSettings() {
    try { var d = JSON.parse(localStorage.getItem(SETTINGS_KEY)); return d && typeof d.rate === "number" ? d : {rate:6}; }
    catch(e) { return {rate:6}; }
  }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

  function sorted() {
    return readings.slice().sort(function(a,b){ return a.month.localeCompare(b.month); });
  }

  // cost split: each house pays proportional share of grid import cost
  function calcCosts(r) {
    var total = r.h1 + r.h2;
    var gridCost = r.grid * settings.rate;
    if (total <= 0) return { h1: 0, h2: 0, total: gridCost };
    return {
      h1: (r.h1 / total) * gridCost,
      h2: (r.h2 / total) * gridCost,
      total: gridCost
    };
  }

  // ---- Handlers ----
  function onAdd(e) {
    e.preventDefault();
    var month = yearSel.value + "-" + monthSel.value;
    var grid = parseFloat(inGrid.value);
    var exp  = parseFloat(inExport.value);
    var fve  = parseFloat(inFve.value);
    var h1   = parseFloat(inH1.value);
    var h2   = parseFloat(inH2.value);
    var hp   = parseFloat(inHp.value);
    var note = inNote.value.trim();

    if ([grid,exp,fve,h1,h2,hp].some(function(v){ return isNaN(v) || v < 0; })) {
      showToast("Vyplňte všechny hodnoty (min. 0)."); return;
    }
    if (hp > h2) {
      showToast("TČ nemůže být vyšší než spotřeba Domu 2."); return;
    }
    if (readings.some(function(r){ return r.month === month; })) {
      showToast("Odečet pro " + fmtMonth(month) + " již existuje."); return;
    }

    readings.push({ month:month, grid:grid, export:exp, fve:fve, h1:h1, h2:h2, hp:hp, note:note });
    saveReadings();
    render();

    inGrid.value = ""; inExport.value = ""; inFve.value = "";
    inH1.value = ""; inH2.value = ""; inHp.value = ""; inNote.value = "";
    var now = new Date();
    yearSel.value = now.getFullYear();
    monthSel.value = String(now.getMonth()+1).padStart(2,"0");
    inGrid.focus();
    showToast("Odečet přidán.");
  }

  function onDelete(month) {
    if (!confirm("Smazat odečet za " + fmtMonth(month) + "?")) return;
    readings = readings.filter(function(r){ return r.month !== month; });
    saveReadings(); render();
    showToast("Odečet smazán.");
  }

  function onSaveSettings() {
    var r = parseFloat(rateInput.value);
    if (isNaN(r) || r < 0) { showToast("Zadejte platnou cenu."); return; }
    settings.rate = r; saveSettings(); render();
    showToast("Nastavení uloženo.");
  }

  function onExport() {
    var s = sorted();
    if (!s.length) { showToast("Žádná data."); return; }
    var rows = [["Měsíc","Odběr sítě (kWh)","Dodávka sítě (kWh)","Výroba FVE (kWh)",
      "Dům 1 (kWh)","Dům 2 (kWh)","TČ (kWh)","Náklady D1 (Kč)","Náklady D2 (Kč)","Celk. náklady (Kč)","Poznámka"]];
    for (var i = 0; i < s.length; i++) {
      var c = calcCosts(s[i]);
      rows.push([s[i].month, s[i].grid, s[i].export, s[i].fve,
        s[i].h1, s[i].h2, s[i].hp,
        c.h1.toFixed(2), c.h2.toFixed(2), c.total.toFixed(2),
        '"'+(s[i].note||"")+'"']);
    }
    var csv = rows.map(function(r){return r.join(";");}).join("\n");
    var blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url;
    a.download = "rozuctovani-elektriny.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportováno.");
  }

  // ---- Render ----
  function render() {
    var s = sorted();
    renderTable(s);
    renderSummary(s);
    renderChart(s);
  }

  function renderTable(s) {
    tbody.innerHTML = "";
    if (!s.length) {
      tableEmpty.style.display = "block";
      document.getElementById("readings-table").style.display = "none";
      return;
    }
    tableEmpty.style.display = "none";
    document.getElementById("readings-table").style.display = "table";

    for (var i = s.length - 1; i >= 0; i--) {
      var r = s[i];
      var c = calcCosts(r);
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + fmtMonth(r.month) + "</td>" +
        "<td class='c-blue'>" + r.grid.toFixed(1) + "</td>" +
        "<td class='c-teal'>" + r.export.toFixed(1) + "</td>" +
        "<td class='c-amber'>" + r.fve.toFixed(1) + "</td>" +
        "<td class='c-green'>" + r.h1.toFixed(1) + "</td>" +
        "<td class='c-orange'>" + r.h2.toFixed(1) + "</td>" +
        "<td class='c-red'>" + r.hp.toFixed(1) + "</td>" +
        "<td class='c-green'>" + fmtCZK(c.h1) + "</td>" +
        "<td class='c-orange'>" + fmtCZK(c.h2) + "</td>" +
        "<td>" + escHtml(r.note || "") + "</td>" +
        "<td></td>";
      var btn = document.createElement("button");
      btn.className = "btn-delete"; btn.textContent = "Smazat";
      btn.setAttribute("data-m", r.month);
      btn.addEventListener("click", function(){ onDelete(this.getAttribute("data-m")); });
      tr.lastChild.appendChild(btn);
      tbody.appendChild(tr);
    }
  }

  function renderSummary(s) {
    if (!s.length) {
      elSumGrid.textContent = "0 kWh"; elSumGridC.textContent = "0 Kč";
      elSumFve.textContent = "0 kWh"; elSumFvePct.textContent = "0 % spotřeby";
      elSumH1.textContent = "0 kWh"; elSumH1C.textContent = "náklady: 0 Kč";
      elSumH2.textContent = "0 kWh"; elSumH2C.textContent = "náklady: 0 Kč";
      elSumHp.textContent = "0 kWh"; elSumHpPct.textContent = "0 % Domu 2";
      elSumExport.textContent = "0 kWh";
      return;
    }
    var last = s[s.length - 1];
    var c = calcCosts(last);
    var totalConsumption = last.h1 + last.h2;

    elSumGrid.textContent = last.grid.toFixed(1) + " kWh";
    elSumGridC.textContent = fmtCZK(c.total);
    elSumFve.textContent = last.fve.toFixed(1) + " kWh";
    elSumFvePct.textContent = totalConsumption > 0
      ? Math.round((last.fve / totalConsumption) * 100) + " % spotřeby" : "0 % spotřeby";
    elSumH1.textContent = last.h1.toFixed(1) + " kWh";
    elSumH1C.textContent = "náklady: " + fmtCZK(c.h1);
    elSumH2.textContent = last.h2.toFixed(1) + " kWh";
    elSumH2C.textContent = "náklady: " + fmtCZK(c.h2);
    elSumHp.textContent = last.hp.toFixed(1) + " kWh";
    elSumHpPct.textContent = last.h2 > 0
      ? Math.round((last.hp / last.h2) * 100) + " % Domu 2" : "0 % Domu 2";
    elSumExport.textContent = last.export.toFixed(1) + " kWh";
  }

  function renderChart(s) {
    var canvas = document.getElementById("usage-chart");
    if (!s.length) {
      chartEmpty.style.display = "block"; canvas.style.display = "none";
      if (chart) { chart.destroy(); chart = null; }
      return;
    }
    chartEmpty.style.display = "none"; canvas.style.display = "block";

    var labels=[], dH1=[], dHp=[], dH2other=[], dFve=[], dGrid=[];
    for (var i = 0; i < s.length; i++) {
      labels.push(fmtMonth(s[i].month));
      dH1.push(s[i].h1);
      dHp.push(s[i].hp);
      dH2other.push(Math.max(0, s[i].h2 - s[i].hp));
      dFve.push(s[i].fve);
      dGrid.push(s[i].grid);
    }

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Dům 1 (kWh)",
            data: dH1,
            backgroundColor: "rgba(22,163,74,0.65)",
            borderColor: "rgba(22,163,74,1)",
            borderWidth: 1,
            borderRadius: {topLeft:0,topRight:0,bottomLeft:6,bottomRight:6},
            stack: "consumption",
            yAxisID: "y", order: 3
          },
          {
            label: "TČ – Dům 2 (kWh)",
            data: dHp,
            backgroundColor: "rgba(220,38,38,0.7)",
            borderColor: "rgba(220,38,38,1)",
            borderWidth: 1,
            stack: "consumption",
            yAxisID: "y", order: 3
          },
          {
            label: "Dům 2 ostatní (kWh)",
            data: dH2other,
            backgroundColor: "rgba(234,88,12,0.6)",
            borderColor: "rgba(234,88,12,1)",
            borderWidth: 1,
            borderRadius: {topLeft:6,topRight:6,bottomLeft:0,bottomRight:0},
            stack: "consumption",
            yAxisID: "y", order: 3
          },
          {
            label: "Výroba FVE (kWh)",
            data: dFve,
            type: "line",
            borderColor: "rgba(217,119,6,1)",
            backgroundColor: "rgba(217,119,6,0.08)",
            borderWidth: 2.5,
            pointRadius: 4, pointBackgroundColor: "#fff",
            pointBorderColor: "rgba(217,119,6,1)", pointBorderWidth: 2,
            fill: true, tension: 0.3,
            yAxisID: "y", order: 1
          },
          {
            label: "Odběr ze sítě (kWh)",
            data: dGrid,
            type: "line",
            borderColor: "rgba(37,99,235,1)",
            backgroundColor: "rgba(37,99,235,0.06)",
            borderWidth: 2.5, borderDash: [6,3],
            pointRadius: 4, pointBackgroundColor: "#fff",
            pointBorderColor: "rgba(37,99,235,1)", pointBorderWidth: 2,
            fill: true, tension: 0.3,
            yAxisID: "y", order: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:"index", intersect:false },
        scales: {
          x: { stacked:true, grid:{display:false},
            ticks:{ font:{size:11,weight:"600"}, color:"#64748b" }
          },
          y: { stacked:true, beginAtZero:true,
            title:{ display:true, text:"kWh", font:{size:12,weight:"600"}, color:"#64748b" },
            grid:{ color:"rgba(0,0,0,0.04)" },
            ticks:{ font:{size:11}, color:"#94a3b8" }
          }
        },
        plugins: {
          legend: { position:"bottom",
            labels:{ padding:16, usePointStyle:true, pointStyleWidth:12,
              font:{size:11,weight:"500"}, color:"#334155" }
          },
          tooltip: {
            backgroundColor:"rgba(15,23,42,0.92)",
            titleFont:{size:13,weight:"700"}, bodyFont:{size:12},
            padding:12, cornerRadius:8,
            callbacks: {
              afterBody: function(items) {
                var tot = 0;
                items.forEach(function(it) {
                  if (it.dataset.stack === "consumption") tot += it.parsed.y;
                });
                return "Celk. spotřeba: " + tot.toFixed(1) + " kWh";
              }
            }
          }
        }
      }
    });
  }

  // ---- Helpers ----
  function fmtMonth(m) {
    var p = m.split("-");
    return MONTHS_CS[parseInt(p[1],10)-1] + " " + p[0];
  }
  function fmtCZK(v) { return Math.round(v).toLocaleString("cs-CZ") + " Kč"; }
  function escHtml(s) { var d=document.createElement("div"); d.textContent=s; return d.innerHTML; }

  function showToast(msg) {
    var ex = document.querySelector(".toast"); if (ex) ex.remove();
    var t = document.createElement("div"); t.className="toast"; t.textContent=msg;
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add("show"); });
    setTimeout(function(){ t.classList.remove("show"); setTimeout(function(){t.remove();},300); },2500);
  }

  init();
})();
