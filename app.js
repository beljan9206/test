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
  var inFve        = document.getElementById("in-fve");
  var inH2         = document.getElementById("in-h2");
  var inHp         = document.getElementById("in-hp");
  var inNote       = document.getElementById("in-note");
  var rateInput    = document.getElementById("rate-input");
  var saveBtn      = document.getElementById("save-settings");
  var exportBtn    = document.getElementById("export-btn");
  var importToggle = document.getElementById("import-toggle");
  var importBody   = document.getElementById("import-body");
  var importArea   = document.getElementById("import-textarea");
  var importBtn    = document.getElementById("import-btn");
  var importOver   = document.getElementById("import-overwrite");
  var importResult = document.getElementById("import-result");
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
    importToggle.addEventListener("click", onToggleImport);
    importBtn.addEventListener("click", onImport);
    render();
  }

  // ---- Data ----
  function loadReadings() {
    try { var d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }
    catch(e) { return []; }
  }
  function saveReadings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(readings)); }
  function loadSettings() {
    try { var d = JSON.parse(localStorage.getItem(SETTINGS_KEY)); return d && typeof d.rate === "number" ? d : {rate:5}; }
    catch(e) { return {rate:5}; }
  }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

  function sorted() {
    return readings.slice().sort(function(a,b){ return a.month.localeCompare(b.month); });
  }

  // Helper: get h1 value (computed for new records, stored for old)
  function getH1(r) {
    // If h1 is already stored (old records or computed), use it
    if (typeof r.h1 === "number") return r.h1;
    return Math.max(0, r.grid + r.fve - r.h2);
  }

  // cost split: each house pays proportional share of grid import cost
  function calcCosts(r) {
    var h1 = getH1(r);
    var total = h1 + r.h2;
    var gridCost = r.grid * settings.rate;
    if (total <= 0) return { h1: 0, h2: 0, total: gridCost };
    return {
      h1: (h1 / total) * gridCost,
      h2: (r.h2 / total) * gridCost,
      total: gridCost
    };
  }

  // ---- Handlers ----
  function onAdd(e) {
    e.preventDefault();
    var month = yearSel.value + "-" + monthSel.value;
    var grid = parseFloat(inGrid.value);
    var fve  = parseFloat(inFve.value);
    var h2   = parseFloat(inH2.value);
    var hp   = parseFloat(inHp.value);
    var note = inNote.value.trim();

    if ([grid,fve,h2,hp].some(function(v){ return isNaN(v) || v < 0; })) {
      showToast("Vyplňte všechny hodnoty (min. 0)."); return;
    }
    if (hp > h2) {
      showToast("TČ nemůže být vyšší než spotřeba Domu 2."); return;
    }
    if (h2 > grid + fve) {
      showToast("Spotřeba Domu 2 nemůže být vyšší než celková dostupná energie (síť + FVE)."); return;
    }
    if (readings.some(function(r){ return r.month === month; })) {
      showToast("Odečet pro " + fmtMonth(month) + " již existuje."); return;
    }

    var h1 = Math.max(0, grid + fve - h2);
    readings.push({ month:month, grid:grid, fve:fve, h1:h1, h2:h2, hp:hp, note:note });
    saveReadings();
    render();

    inGrid.value = ""; inFve.value = "";
    inH2.value = ""; inHp.value = ""; inNote.value = "";
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

  function onToggleImport() {
    var open = importBody.style.display !== "none";
    importBody.style.display = open ? "none" : "block";
    importToggle.textContent = open ? "Zobrazit" : "Skrýt";
  }

  function onImport() {
    var raw = importArea.value.trim();
    if (!raw) { showImportResult("err", "Vložte data pro import."); return; }
    var overwrite = importOver.checked;

    var lines = raw.split(/\r?\n/);
    var added = 0, skipped = 0, overwritten = 0, errors = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // detect delimiter: tab or semicolon or comma
      var sep = line.indexOf("\t") >= 0 ? "\t" : line.indexOf(";") >= 0 ? ";" : ",";
      var parts = line.split(sep);

      // skip header row
      if (i === 0 && parts[0] && /[a-zA-ZěščřžýáíéůúĚŠČŘŽÝÁÍÉŮÚ]/.test(parts[0]) && isNaN(parseFloat(parts[1]))) continue;

      if (parts.length < 5) {
        errors.push("Řádek " + (i+1) + ": málo sloupců (potřeba 5: měsíc, síť, FVE, dům 2, TČ).");
        continue;
      }

      var monthRaw = parts[0].trim();
      // validate month format YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(monthRaw)) {
        errors.push("Řádek " + (i+1) + ": neplatný formát měsíce '" + monthRaw + "' (potřeba RRRR-MM).");
        continue;
      }
      var mm = parseInt(monthRaw.split("-")[1], 10);
      if (mm < 1 || mm > 12) {
        errors.push("Řádek " + (i+1) + ": neplatný měsíc '" + monthRaw + "'.");
        continue;
      }

      var grid = parseNum(parts[1]);
      var fve  = parseNum(parts[2]);
      var h2   = parseNum(parts[3]);
      var hp   = parseNum(parts[4]);

      if ([grid,fve,h2,hp].some(function(v){ return isNaN(v) || v < 0; })) {
        errors.push("Řádek " + (i+1) + ": neplatné číselné hodnoty.");
        continue;
      }
      if (hp > h2) {
        errors.push("Řádek " + (i+1) + ": TČ (" + hp + ") větší než Dům 2 (" + h2 + ").");
        continue;
      }

      var existing = -1;
      for (var j = 0; j < readings.length; j++) {
        if (readings[j].month === monthRaw) { existing = j; break; }
      }

      if (existing >= 0 && !overwrite) {
        skipped++;
        continue;
      }

      var h1 = Math.max(0, grid + fve - h2);
      var rec = { month:monthRaw, grid:grid, fve:fve, h1:h1, h2:h2, hp:hp, note:"" };

      if (existing >= 0) {
        readings[existing] = rec;
        overwritten++;
      } else {
        readings.push(rec);
        added++;
      }
    }

    saveReadings();
    render();

    // build result message
    var msgs = [];
    if (added > 0) msgs.push("Přidáno: " + added);
    if (overwritten > 0) msgs.push("Přepsáno: " + overwritten);
    if (skipped > 0) msgs.push("Přeskočeno (duplicity): " + skipped);
    if (errors.length > 0) msgs.push("Chyby: " + errors.length);

    var cls = errors.length > 0 ? (added + overwritten > 0 ? "warn" : "err") : "ok";
    var msg = msgs.join(" &bull; ");
    if (errors.length > 0) {
      msg += "<br><br><strong>Detail chyb:</strong><br>" + errors.slice(0, 10).join("<br>");
      if (errors.length > 10) msg += "<br>… a dalších " + (errors.length - 10);
    }
    showImportResult(cls, msg);

    if (added + overwritten > 0) {
      importArea.value = "";
      showToast("Importováno " + (added + overwritten) + " odečtů.");
    }
  }

  // parse number, accepting both . and , as decimal separator
  function parseNum(s) {
    if (!s) return NaN;
    return parseFloat(s.trim().replace(",", "."));
  }

  function showImportResult(cls, html) {
    importResult.style.display = "block";
    importResult.className = "import-result import-result-" + cls;
    importResult.innerHTML = html;
  }

  function onExport() {
    var s = sorted();
    if (!s.length) { showToast("Žádná data."); return; }
    var rows = [["Měsíc","Odběr sítě (kWh)","Výroba FVE (kWh)",
      "Dům 1 (kWh)","Dům 2 (kWh)","TČ (kWh)","Náklady D1 (Kč)","Náklady D2 (Kč)","Celk. náklady (Kč)","Poznámka"]];
    for (var i = 0; i < s.length; i++) {
      var h1 = getH1(s[i]);
      var c = calcCosts(s[i]);
      rows.push([s[i].month, s[i].grid, s[i].fve,
        h1, s[i].h2, s[i].hp,
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
      var h1 = getH1(r);
      var c = calcCosts(r);
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + fmtMonth(r.month) + "</td>" +
        "<td class='c-blue'>" + r.grid.toFixed(1) + "</td>" +
        "<td class='c-amber'>" + r.fve.toFixed(1) + "</td>" +
        "<td class='c-green'>" + h1.toFixed(1) + "</td>" +
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
      return;
    }
    var last = s[s.length - 1];
    var h1 = getH1(last);
    var c = calcCosts(last);
    var totalConsumption = h1 + last.h2;

    elSumGrid.textContent = last.grid.toFixed(1) + " kWh";
    elSumGridC.textContent = fmtCZK(c.total);
    elSumFve.textContent = last.fve.toFixed(1) + " kWh";
    elSumFvePct.textContent = totalConsumption > 0
      ? Math.round((last.fve / totalConsumption) * 100) + " % spotřeby" : "0 % spotřeby";
    elSumH1.textContent = h1.toFixed(1) + " kWh";
    elSumH1C.textContent = "náklady: " + fmtCZK(c.h1);
    elSumH2.textContent = last.h2.toFixed(1) + " kWh";
    elSumH2C.textContent = "náklady: " + fmtCZK(c.h2);
    elSumHp.textContent = last.hp.toFixed(1) + " kWh";
    elSumHpPct.textContent = last.h2 > 0
      ? Math.round((last.hp / last.h2) * 100) + " % Domu 2" : "0 % Domu 2";
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
      var h1 = getH1(s[i]);
      labels.push(fmtMonth(s[i].month));
      dH1.push(h1);
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
