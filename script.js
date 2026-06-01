const form = document.querySelector("#cgpaForm");
const currentCgpaEl = document.querySelector("#currentCgpa");
const completedCreditsEl = document.querySelector("#completedCredits");
const completedSemestersEl = document.querySelector("#completedSemesters");
const targetCgpaInput = document.querySelector("#targetCgpa");
const totalCreditsInput = document.querySelector("#totalCredits");
const predictionResult = document.querySelector("#predictionResult");
const targetPlanList = document.querySelector("#targetPlanList");
const resetButton = document.querySelector("#resetButton");
const downloadReportButton = document.querySelector("#downloadReportButton");
const courseTypeSelect = document.querySelector("#courseType");
const semesterCountInput = document.querySelector("#semesterCountInput");
const reportNameInput = document.querySelector("#reportName");
const semesterHelp = document.querySelector("#semesterHelp");
const resultChart = document.querySelector("#resultChart");
const chartContext = resultChart.getContext("2d");

const storageKey = "cgpa-calculator-data-v2";
const defaultCreditsPerSemester = 20;
let semesterCount = 8;
let lastResult = null;

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function formatCredits(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSavedData() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveData() {
  const semesters = readSemesterData({ includeIncomplete: true });
  const data = {
    courseType: courseTypeSelect.value,
    semesterCount,
    targetCgpa: targetCgpaInput.value,
    totalCredits: totalCreditsInput.value,
    reportName: reportNameInput.value,
    semesters: semesters.map((semester) => ({
      sgpa: semester.sgpaValue,
      credits: semester.creditsValue,
    })),
  };

  localStorage.setItem(storageKey, JSON.stringify(data));
}

function createNumberInput({ semester, field, placeholder, label }) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = field === "sgpa" ? "0" : "0";
  input.max = field === "sgpa" ? "10" : "";
  input.step = field === "sgpa" ? "0.01" : "1";
  input.placeholder = placeholder;
  input.dataset.field = field;
  input.dataset.semester = String(semester);
  input.setAttribute("aria-label", label);
  return input;
}

function renderSemesterRows(savedSemesters = []) {
  form.replaceChildren();

  ["Semester", "SGPA", "Credits"].forEach((heading) => {
    const headingEl = document.createElement("div");
    headingEl.className = "grid-heading";
    headingEl.textContent = heading;
    form.append(headingEl);
  });

  for (let index = 1; index <= semesterCount; index += 1) {
    const semesterLabel = document.createElement("div");
    semesterLabel.className = "semester-label";
    semesterLabel.textContent = `Semester ${index}`;

    const sgpaInput = createNumberInput({
      semester: index,
      field: "sgpa",
      placeholder: "0.00",
      label: `Semester ${index} SGPA`,
    });

    const creditInput = createNumberInput({
      semester: index,
      field: "credits",
      placeholder: String(defaultCreditsPerSemester),
      label: `Semester ${index} credits`,
    });

    if (savedSemesters[index - 1]) {
      sgpaInput.value = savedSemesters[index - 1].sgpa || "";
      creditInput.value = savedSemesters[index - 1].credits || "";
    }

    form.append(semesterLabel, sgpaInput, creditInput);
  }

  semesterHelp.textContent = `Enter SGPA and credits for ${semesterCount} semester${semesterCount === 1 ? "" : "s"}.`;
}

function readSemesterData(options = {}) {
  return Array.from({ length: semesterCount }, (_, index) => {
    const semester = index + 1;
    const sgpaInput = document.querySelector(`[data-field="sgpa"][data-semester="${semester}"]`);
    const creditsInput = document.querySelector(`[data-field="credits"][data-semester="${semester}"]`);
    const sgpaValue = sgpaInput ? sgpaInput.value : "";
    const creditsValue = creditsInput ? creditsInput.value : "";
    const sgpa = Number(sgpaValue);
    const credits = creditsValue === "" ? defaultCreditsPerSemester : Number(creditsValue);
    const isComplete =
      sgpaValue !== "" &&
      Number.isFinite(sgpa) &&
      sgpa >= 0 &&
      sgpa <= 10 &&
      Number.isFinite(credits) &&
      credits > 0;

    return {
      semester,
      sgpa,
      sgpaValue,
      credits,
      creditsValue,
      isComplete: options.includeIncomplete ? Boolean(sgpaValue || creditsValue) || isComplete : isComplete,
      isValidScore: isComplete,
    };
  });
}

function getCourseStats(completed, completedCredits) {
  const enteredTotalCredits = Number(totalCreditsInput.value);
  const autoTotalCredits =
    completed.length > 0 ? (completedCredits / completed.length) * semesterCount : semesterCount * defaultCreditsPerSemester;
  const totalCredits =
    Number.isFinite(enteredTotalCredits) && enteredTotalCredits > completedCredits ? enteredTotalCredits : autoTotalCredits;

  return {
    totalCredits,
    remainingSemesters: Math.max(semesterCount - completed.length, 0),
    remainingCredits: Math.max(totalCredits - completedCredits, 0),
  };
}

function getCalculationResult() {
  const semesters = readSemesterData();
  const completed = semesters.filter((semester) => semester.isValidScore);
  const completedCredits = completed.reduce((sum, semester) => sum + semester.credits, 0);
  const earnedPoints = completed.reduce((sum, semester) => sum + semester.sgpa * semester.credits, 0);
  const currentCgpa = completedCredits > 0 ? earnedPoints / completedCredits : 0;
  const courseStats = getCourseStats(completed, completedCredits);

  return {
    semesters,
    completed,
    completedCredits,
    earnedPoints,
    currentCgpa,
    ...courseStats,
  };
}

function updatePrediction(result) {
  const targetCgpa = Number(targetCgpaInput.value);

  predictionResult.className = "prediction-result";
  targetPlanList.replaceChildren();

  if (result.completed.length === 0) {
    predictionResult.textContent = "Add semester details to calculate your required SGPA.";
    return;
  }

  if (!Number.isFinite(targetCgpa) || targetCgpa <= 0 || targetCgpa > 10) {
    predictionResult.textContent = "Enter a target CGPA between 0 and 10.";
    predictionResult.classList.add("warning");
    return;
  }

  if (result.remainingSemesters === 0 || result.remainingCredits === 0) {
    predictionResult.textContent = "All semesters are complete, so there are no remaining semesters to predict.";
    predictionResult.classList.add("warning");
    return;
  }

  const requiredPoints = targetCgpa * result.totalCredits - result.earnedPoints;
  const requiredAverageSgpa = requiredPoints / result.remainingCredits;

  if (requiredAverageSgpa > 10) {
    predictionResult.textContent = `You would need an average SGPA of ${formatNumber(requiredAverageSgpa)}, which is above 10.00. Try a lower target or update total credits.`;
    predictionResult.classList.add("danger");
    return;
  }

  if (requiredAverageSgpa <= 0) {
    predictionResult.textContent = `Your current score already meets a ${formatNumber(targetCgpa)} target, assuming ${formatCredits(result.totalCredits)} total credits.`;
    return;
  }

  predictionResult.textContent = `To reach ${formatNumber(targetCgpa)} CGPA, aim for an average SGPA of ${formatNumber(requiredAverageSgpa)} across the remaining ${formatCredits(result.remainingCredits)} credits.`;

  for (let semester = result.completed.length + 1; semester <= semesterCount; semester += 1) {
    const item = document.createElement("article");
    item.className = "plan-item";
    item.innerHTML = `<span>Semester ${semester}</span><strong>${formatNumber(requiredAverageSgpa)}</strong>`;
    targetPlanList.append(item);
  }
}

function drawChart(result) {
  const width = resultChart.width;
  const height = resultChart.height;
  const padding = 48;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  chartContext.clearRect(0, 0, width, height);
  chartContext.fillStyle = "#ffffff";
  chartContext.fillRect(0, 0, width, height);

  chartContext.strokeStyle = "#dce3df";
  chartContext.lineWidth = 1;
  chartContext.font = "24px Segoe UI, sans-serif";
  chartContext.fillStyle = "#63706b";

  for (let mark = 0; mark <= 10; mark += 2) {
    const y = padding + chartHeight - (mark / 10) * chartHeight;
    chartContext.beginPath();
    chartContext.moveTo(padding, y);
    chartContext.lineTo(width - padding, y);
    chartContext.stroke();
    chartContext.fillText(String(mark), 12, y + 8);
  }

  if (result.completed.length === 0) {
    chartContext.fillStyle = "#63706b";
    chartContext.fillText("Add SGPA values to see your progress chart.", padding, height / 2);
    return;
  }

  const points = [];
  let totalCredits = 0;
  let totalPoints = 0;

  result.completed.forEach((semester, index) => {
    totalCredits += semester.credits;
    totalPoints += semester.sgpa * semester.credits;
    const cgpa = totalPoints / totalCredits;
    const x = padding + (index / Math.max(result.completed.length - 1, 1)) * chartWidth;
    points.push({
      x,
      sgpaY: padding + chartHeight - (semester.sgpa / 10) * chartHeight,
      cgpaY: padding + chartHeight - (cgpa / 10) * chartHeight,
      label: `S${semester.semester}`,
    });
  });

  function drawLine(key, color) {
    chartContext.strokeStyle = color;
    chartContext.lineWidth = 5;
    chartContext.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        chartContext.moveTo(point.x, point[key]);
      } else {
        chartContext.lineTo(point.x, point[key]);
      }
    });
    chartContext.stroke();

    points.forEach((point) => {
      chartContext.fillStyle = color;
      chartContext.beginPath();
      chartContext.arc(point.x, point[key], 7, 0, Math.PI * 2);
      chartContext.fill();
    });
  }

  drawLine("sgpaY", "#227c6d");
  drawLine("cgpaY", "#f1a43c");

  chartContext.fillStyle = "#1c2321";
  points.forEach((point) => {
    chartContext.fillText(point.label, point.x - 16, height - 14);
  });

  chartContext.fillStyle = "#227c6d";
  chartContext.fillText("SGPA", width - 170, 34);
  chartContext.fillStyle = "#f1a43c";
  chartContext.fillText("CGPA", width - 90, 34);
}

function calculate() {
  const result = getCalculationResult();
  lastResult = result;

  currentCgpaEl.textContent = formatNumber(result.currentCgpa);
  completedCreditsEl.textContent = formatCredits(result.completedCredits);
  completedSemestersEl.textContent = String(result.completed.length);

  updatePrediction(result);
  drawChart(result);
  saveData();
}

function setSemesterCount(nextCount, savedSemesters = readSemesterData({ includeIncomplete: true })) {
  semesterCount = Math.min(Math.max(Number(nextCount) || 1, 1), 12);
  semesterCountInput.value = String(semesterCount);
  renderSemesterRows(savedSemesters);
  calculate();
}

function resetCalculator() {
  localStorage.removeItem(storageKey);
  reportNameInput.value = "";
  targetCgpaInput.value = "8.50";
  totalCreditsInput.value = "";
  courseTypeSelect.value = "8";
  setSemesterCount(8, []);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createReportFileName(reportName) {
  const cleanName = reportName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${cleanName || "cgpa-report"}-${dateStamp}.html`;
}

function downloadReport() {
  const result = lastResult || getCalculationResult();
  const target = targetCgpaInput.value || "Not set";
  const reportName = reportNameInput.value.trim() || "CGPA Report";
  const rows = result.semesters
    .map(
      (semester) =>
        `<tr><td>Semester ${semester.semester}</td><td>${escapeHtml(semester.sgpaValue || "-")}</td><td>${escapeHtml(semester.creditsValue || defaultCreditsPerSemester)}</td></tr>`
    )
    .join("");
  const report = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(reportName)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1c2321; margin: 32px; }
    h1 { margin-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #dce3df; padding: 10px; text-align: left; }
    th { background: #e8f3ef; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    .box { border: 1px solid #dce3df; padding: 14px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportName)}</h1>
  <p>Generated from CGPA Calculator</p>
  <div class="summary">
    <div class="box"><strong>Current CGPA</strong><br>${formatNumber(result.currentCgpa)}</div>
    <div class="box"><strong>Completed Credits</strong><br>${formatCredits(result.completedCredits)}</div>
    <div class="box"><strong>Target CGPA</strong><br>${escapeHtml(target)}</div>
  </div>
  <p>Total semesters: ${semesterCount} | Estimated total credits: ${formatCredits(result.totalCredits)}</p>
  <table>
    <thead><tr><th>Semester</th><th>SGPA</th><th>Credits</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([report], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = createReportFileName(reportName);
  link.click();
  URL.revokeObjectURL(url);
}

function loadInitialState() {
  const savedData = getSavedData();
  const savedCount = savedData.semesterCount || 8;
  courseTypeSelect.value = savedData.courseType || (["4", "6", "8"].includes(String(savedCount)) ? String(savedCount) : "custom");
  semesterCount = Math.min(Math.max(Number(savedCount) || 8, 1), 12);
  semesterCountInput.value = String(semesterCount);
  reportNameInput.value = savedData.reportName || "";
  targetCgpaInput.value = savedData.targetCgpa || "8.50";
  totalCreditsInput.value = savedData.totalCredits || "";
  renderSemesterRows(savedData.semesters || []);
  calculate();
}

form.addEventListener("input", calculate);
targetCgpaInput.addEventListener("input", calculate);
totalCreditsInput.addEventListener("input", calculate);
reportNameInput.addEventListener("input", calculate);
resetButton.addEventListener("click", resetCalculator);
downloadReportButton.addEventListener("click", downloadReport);

courseTypeSelect.addEventListener("change", () => {
  if (courseTypeSelect.value === "custom") {
    semesterCountInput.disabled = false;
    semesterCountInput.focus();
    return;
  }

  semesterCountInput.disabled = true;
  setSemesterCount(Number(courseTypeSelect.value));
});

semesterCountInput.addEventListener("change", () => {
  courseTypeSelect.value = "custom";
  semesterCountInput.disabled = false;
  setSemesterCount(semesterCountInput.value);
});

window.addEventListener("resize", () => {
  if (lastResult) {
    drawChart(lastResult);
  }
});

loadInitialState();
semesterCountInput.disabled = courseTypeSelect.value !== "custom";
