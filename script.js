const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let rawData = [];
let charts = {};
let globalFilter = {}; // para interacción entre gráficos

Papa.parse(CSV_URL, {
  download: true,
  header: true,
  complete: function(results) {
    rawData = results.data;
    initFilters();
    updateDashboard();
  }
});

function initFilters() {
  fillFilter("empresaFilter", [...new Set(rawData.map(d => d.Empresa))]);
  fillFilter("nivelFilter", [...new Set(rawData.map(d => d.Nivel))]);
  fillFilter("materialFilter", [...new Set(rawData.map(d => d.Material))]);

  document.querySelectorAll("select").forEach(el =>
    el.addEventListener("change", () => {
      globalFilter = {}; // reset interacción
      updateDashboard();
    })
  );
}

function fillFilter(id, values) {
  const el = document.getElementById(id);
  values.forEach(v => {
    if (v) el.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

function getFilteredData() {
  const empresa = document.getElementById("empresaFilter").value;
  const nivel = document.getElementById("nivelFilter").value;
  const material = document.getElementById("materialFilter").value;

  return rawData.filter(r => {
    return (empresa === "all" || r.Empresa === empresa) &&
           (nivel === "all" || r.Nivel === nivel) &&
           (material === "all" || r.Material === material) &&
           (!globalFilter.Tecnologia || r.Tecnologia === globalFilter.Tecnologia) &&
           (!globalFilter.Nivel || r.Nivel === globalFilter.Nivel) &&
           (!globalFilter.Material || r.Material === globalFilter.Material);
  });
}

function groupBy(data, key) {
  const obj = {};
  data.forEach(r => {
    const k = r[key] || "Otros";
    const val = parseFloat(r.Cantidad_m) || 0;
    if (!obj[k]) obj[k] = 0;
    obj[k] += val;
  });
  return obj;
}

function updateDashboard() {
  const data = getFilteredData();

  updateKPIs(data);
  renderCharts(data);
}

function updateKPIs(data) {
  let total = 0;
  const empresas = new Set();
  const tech = {};
  const nivel = {};

  data.forEach(r => {
    const val = parseFloat(r.Cantidad_m) || 0;
    total += val;
    empresas.add(r.Empresa);

    tech[r.Tecnologia] = (tech[r.Tecnologia] || 0) + val;
    nivel[r.Nivel] = (nivel[r.Nivel] || 0) + val;
  });

  const topTec = getTop(tech);
  const topNivel = getTop(nivel);

  document.getElementById("totalKPI").innerText = formatNumber(total);
  document.getElementById("topTecKPI").innerText = topTec;
  document.getElementById("empresasKPI").innerText = empresas.size;
  document.getElementById("topNivelKPI").innerText = topNivel;
}

function getTop(obj) {
  return Object.keys(obj).reduce((a, b) =>
    obj[a] > obj[b] ? a : b, "-");
}

function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

function renderCharts(data) {
  destroyCharts();

  charts.tech = createChart("techChart", "bar", groupBy(data, "Tecnologia"), "Tecnología", "Tecnologia");
  charts.material = createChart("materialChart", "pie", groupBy(data, "Material"), "Material", "Material");
  charts.nivel = createChart("nivelChart", "bar", groupBy(data, "Nivel"), "Nivel", "Nivel");
}

function createChart(id, type, dataset, label, keyName) {
  const chart = new Chart(document.getElementById(id), {
    type: type,
    data: {
      labels: Object.keys(dataset),
      datasets: [{
        label: label,
        data: Object.values(dataset),
        backgroundColor: generateColors(Object.keys(dataset).length)
      }]
    },
    options: {
      responsive: true,
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          const i = elements[0].index;
          const labelClicked = chart.data.labels[i];

          globalFilter[keyName] = labelClicked;
          updateDashboard();
        }
      }
    }
  });

  return chart;
}

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
}

function generateColors(n) {
  return Array.from({ length: n }, (_, i) =>
    `hsl(${(i * 40) % 360}, 70%, 50%)`
  );
}
