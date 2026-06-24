const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let rawData = [];
let charts = {};
let globalFilter = {};

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
  fillFilter("empresaFilter", getUnique("Empresa"));
  fillFilter("nivelFilter", getUnique("Nivel"));
  fillFilter("materialFilter", getUnique("Material"));

  document.querySelectorAll("select").forEach(el =>
    el.addEventListener("change", updateDashboard)
  );
}

function getUnique(field) {
  return [...new Set(rawData.map(d => d[field]).filter(v => v))];
}

function fillFilter(id, values) {
  const el = document.getElementById(id);
  values.forEach(v => {
    el.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

function getSelectedValues(id) {
  return [...document.getElementById(id).selectedOptions].map(o => o.value);
}

function getFilteredData() {
  const emp = getSelectedValues("empresaFilter");
  const niv = getSelectedValues("nivelFilter");
  const mat = getSelectedValues("materialFilter");

  return rawData.filter(r => {
    return (!emp.length || emp.includes(r.Empresa)) &&
           (!niv.length || niv.includes(r.Nivel)) &&
           (!mat.length || mat.includes(r.Material));
  });
}

function groupBy(data, key) {
  const map = {};
  data.forEach(r => {
    const k = r[key] || "Otros";
    map[k] = (map[k] || 0) + (parseFloat(r.Cantidad_m) || 0);
  });
  return map;
}

function updateDashboard() {
  const data = getFilteredData();
  updateKPIs(data);
  drawCharts(data);
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

  document.getElementById("totalKPI").innerText = total.toLocaleString();
  document.getElementById("empresasKPI").innerText = empresas.size;
  document.getElementById("topTecKPI").innerText = getTop(tech);
  document.getElementById("topNivelKPI").innerText = getTop(nivel);
}

function getTop(obj) {
  return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b, "-");
}

function drawCharts(data) {
  destroyCharts();

  charts.tech = createChart("techChart", "bar", groupBy(data, "Tecnologia"), "Tecnología");
  charts.material = createChart("materialChart", "pie", groupBy(data, "Material"), "Material");
  charts.nivel = createChart("nivelChart", "bar", groupBy(data, "Nivel"), "Nivel");
}

function createChart(id, type, dataset, label) {
  return new Chart(document.getElementById(id), {
    type,
    data: {
      labels: Object.keys(dataset),
      datasets: [{
        label,
        data: Object.values(dataset),
        backgroundColor: generateColors(Object.keys(dataset).length)
      }]
    },
    options: {
      responsive: true,
      scales: type !== "pie" ? {
        x: {
          title: {
            display: true,
            text: label
          }
        },
        y: {
          title: {
            display: true,
            text: "Cantidad (m)"
          },
          ticks: {
            callback: value => value.toLocaleString()
          }
        }
      } : {}
    }
  });
}

function destroyCharts() {
  Object.values(charts).forEach(c => c?.destroy());
}

function generateColors(n) {
  return Array.from({ length: n }, (_, i) =>
    `hsl(${i * 40},70%,50%)`
  );
}
