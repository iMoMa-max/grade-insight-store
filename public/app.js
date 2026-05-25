const text = {
  loading: "\u6b63\u5728\u8bfb\u53d6",
  ready: "\u5df2\u540c\u6b65",
  localReady: "\u672c\u5730\u5b58\u50a8",
  saving: "\u6b63\u5728\u4fdd\u5b58",
  saved: "\u5df2\u4fdd\u5b58",
  savedLocal: "\u5df2\u4fdd\u5b58\u5230\u672c\u673a",
  noClass: "\u8bf7\u5148\u521b\u5efa\u73ed\u7ea7",
  noExam: "\u8bf7\u5148\u65b0\u5efa\u8003\u8bd5",
  importDone: "\u6279\u91cf\u5bfc\u5165\u5b8c\u6210",
  badImport: "\u6279\u91cf\u683c\u5f0f\u6709\u8bef",
  cleared: "\u672c\u6b21\u6210\u7ee9\u5df2\u6e05\u7a7a",
  chooseNo: "\u8bf7\u5148\u70b9\u51fb\u5b66\u53f7",
  absent: "\u4f11\u5b66",
  missing: "\u672a\u5f55",
};

const today = new Date().toISOString().slice(0, 10);
const state = {
  classes: [],
  exams: [],
  selectedClassId: "",
  selectedExamId: "",
  selectedNo: null,
  apiAvailable: true,
};
const localStateKey = "grade-insight-store-state";
const staticHosts = new Set(["github.io", "pages.dev"]);

const el = {
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsCloseButton: document.querySelector("#settingsCloseButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsTabs: Array.from(document.querySelectorAll("[data-settings-tab]")),
  settingsPages: Array.from(document.querySelectorAll("[data-settings-page]")),
  titleClassMenu: document.querySelector("#titleClassMenu"),
  classForm: document.querySelector("#classForm"),
  classFormTitle: document.querySelector("#classFormTitle"),
  manageClassSelect: document.querySelector("#manageClassSelect"),
  className: document.querySelector("#className"),
  classSize: document.querySelector("#classSize"),
  inactiveNos: document.querySelector("#inactiveNos"),
  newClassButton: document.querySelector("#newClassButton"),
  examForm: document.querySelector("#examForm"),
  classSelect: document.querySelector("#classSelect"),
  examName: document.querySelector("#examName"),
  examDate: document.querySelector("#examDate"),
  examTotal: document.querySelector("#examTotal"),
  examSelect: document.querySelector("#examSelect"),
  activeCount: document.querySelector("#activeCount"),
  enteredCount: document.querySelector("#enteredCount"),
  averageScore: document.querySelector("#averageScore"),
  bulkInput: document.querySelector("#bulkInput"),
  bulkButton: document.querySelector("#bulkButton"),
  bulkToggleButton: document.querySelector("#bulkToggleButton"),
  bulkPanel: document.querySelector("#bulkPanel"),
  clearExamButton: document.querySelector("#clearExamButton"),
  studentGrid: document.querySelector("#studentGrid"),
  scoreDialog: document.querySelector("#scoreDialog"),
  editingNo: document.querySelector("#editingNo"),
  singleScore: document.querySelector("#singleScore"),
  saveScoreButton: document.querySelector("#saveScoreButton"),
  cancelScoreButton: document.querySelector("#cancelScoreButton"),
};

el.examDate.value = today;

function setStatus(message, busy = false) {
  el.statusText.textContent = message;
  el.statusText.title = message;
  el.statusDot.classList.toggle("pulse", busy);
}

function canUseRemoteApi() {
  if (location.protocol === "file:") return false;
  return !Array.from(staticHosts).some((host) => location.hostname === host || location.hostname.endsWith(`.${host}`));
}

function toggleSettings(forceOpen) {
  const shouldOpen = forceOpen ?? el.settingsPanel.hidden;
  el.settingsPanel.hidden = !shouldOpen;
  if (shouldOpen) setSettingsTab(state.classes.length ? "exam" : "class");
}

function setSettingsTab(tab) {
  el.settingsTabs.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
  el.settingsPages.forEach((page) => {
    page.hidden = page.dataset.settingsPage !== tab;
  });
  if (tab === "class") fillClassForm(state.selectedClassId);
}

function toggleBulk(forceOpen) {
  const shouldOpen = forceOpen ?? el.bulkPanel.hidden;
  el.bulkPanel.hidden = !shouldOpen;
  el.bulkToggleButton.textContent = shouldOpen ? "-" : "+";
}

function closeScoreDialog() {
  el.scoreDialog.hidden = true;
}

function openScoreDialog(no) {
  const exam = currentExam();
  state.selectedNo = no;
  el.editingNo.textContent = `${no} \u53f7`;
  el.singleScore.value = exam?.scores[no] ?? "";
  el.scoreDialog.hidden = false;
  el.singleScore.focus();
  renderStudents();
}

function uid() {
  return crypto.randomUUID();
}

function parseNos(value) {
  return String(value)
    .split(new RegExp("[,\\s\\uFF0C\\u3001.]+"))
    .map((item) => Number(item.trim()))
    .filter((num) => Number.isInteger(num) && num > 0);
}

function currentClass() {
  return state.classes.find((item) => item.id === state.selectedClassId) || null;
}

function selectClass(classId) {
  state.selectedClassId = classId;
  state.selectedExamId = state.exams.find((exam) => exam.classId === state.selectedClassId)?.id || "";
  state.selectedNo = null;
  render();
}

function currentExam() {
  return state.exams.find((item) => item.id === state.selectedExamId) || null;
}

function activeNumbers(classInfo) {
  if (!classInfo) return [];
  const inactive = new Set(classInfo.inactiveNos);
  return Array.from({ length: classInfo.size }, (_, index) => index + 1).filter((num) => !inactive.has(num));
}

async function loadState() {
  setStatus(text.loading, true);
  let data = {};
  state.apiAvailable = canUseRemoteApi();
  if (state.apiAvailable) {
    try {
      const response = await fetch("/api/state");
      if (!response.ok) throw new Error("API unavailable");
      data = await response.json();
    } catch {
      state.apiAvailable = false;
      data = JSON.parse(localStorage.getItem(localStateKey) || "{}");
    }
  } else {
    data = JSON.parse(localStorage.getItem(localStateKey) || "{}");
  }
  state.classes = data.classes || [];
  state.exams = data.exams || [];
  state.selectedClassId = state.classes[0]?.id || "";
  state.selectedExamId = state.exams.find((exam) => exam.classId === state.selectedClassId)?.id || "";
  toggleSettings(state.classes.length === 0 || state.exams.length === 0);
  setStatus(state.apiAvailable ? text.ready : text.localReady);
  render();
}

async function saveState(message = text.saved) {
  setStatus(text.saving, true);
  const payload = { classes: state.classes, exams: state.exams };
  if (state.apiAvailable) {
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("API unavailable");
    } catch {
      state.apiAvailable = false;
      localStorage.setItem(localStateKey, JSON.stringify(payload));
      message = text.savedLocal;
    }
  } else {
    localStorage.setItem(localStateKey, JSON.stringify(payload));
    message = text.savedLocal;
  }
  setStatus(message);
  render();
}

function render() {
  renderTitleClass();
  renderSelects();
  renderStats();
  renderStudents();
}

function renderTitleClass() {
  el.titleClassMenu.innerHTML = state.classes
    .map((item) => `<button type="button" data-class-id="${item.id}" class="${item.id === state.selectedClassId ? "active" : ""}">${escapeHtml(item.name)}</button>`)
    .join("");
  el.titleClassMenu.hidden = state.classes.length === 0;
}

function renderSelects() {
  el.manageClassSelect.innerHTML =
    `<option value="">${state.classes.length ? "\u65b0\u5efa\u73ed\u7ea7" : "\u6682\u65e0\u73ed\u7ea7"}</option>` +
    state.classes.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");

  el.classSelect.innerHTML = state.classes
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    .join("");
  el.classSelect.value = state.selectedClassId;

  const examOptions = state.exams
    .filter((exam) => exam.classId === state.selectedClassId)
    .map((exam) => `<option value="${exam.id}">${escapeHtml(exam.name)} - ${escapeHtml(exam.date)}</option>`)
    .join("");
  el.examSelect.innerHTML = examOptions || `<option value="">${text.noExam}</option>`;
  el.examSelect.value = state.selectedExamId;
}

function renderStats() {
  const classInfo = currentClass();
  const exam = currentExam();
  const nums = activeNumbers(classInfo);
  const scores = exam ? Object.values(exam.scores).map(Number).filter(Number.isFinite) : [];
  const total = scores.reduce((sum, score) => sum + score, 0);

  el.activeCount.textContent = String(nums.length);
  el.enteredCount.textContent = String(scores.length);
  el.averageScore.textContent = scores.length ? (total / scores.length).toFixed(1) : "0";
}

function resetClassForm() {
  el.manageClassSelect.value = "";
  el.classFormTitle.textContent = "\u65b0\u5efa\u73ed\u7ea7";
  el.className.value = "";
  el.classSize.value = "40";
  el.inactiveNos.value = "";
}

function fillClassForm(classId) {
  const classInfo = state.classes.find((item) => item.id === classId);
  if (!classInfo) {
    resetClassForm();
    return;
  }
  el.manageClassSelect.value = classId;
  el.classFormTitle.textContent = "\u4fee\u6539\u73ed\u7ea7";
  el.className.value = classInfo.name;
  el.classSize.value = classInfo.size;
  el.inactiveNos.value = classInfo.inactiveNos.join(", ");
}

function renderStudents() {
  const classInfo = currentClass();
  const exam = currentExam();
  const nums = activeNumbers(classInfo);

  if (!classInfo) {
    el.studentGrid.innerHTML = `<div class="empty">${text.noClass}</div>`;
    return;
  }

  if (!exam) {
    el.studentGrid.innerHTML = `<div class="empty">${text.noExam}</div>`;
    return;
  }

  el.studentGrid.innerHTML = nums
    .map((num) => {
      const score = exam.scores[num];
      const entered = score !== undefined && score !== "";
      const selected = state.selectedNo === num;
      return `
        <button type="button" class="student-tile ${entered ? "entered" : ""} ${selected ? "selected" : ""}" data-no="${num}">
          <strong>${num}</strong>
          <span>${entered ? escapeHtml(score) : text.missing}</span>
        </button>
      `;
    })
    .join("");
}

function parseBulk(value) {
  const exam = currentExam();
  const classInfo = currentClass();
  if (!exam || !classInfo) throw new Error(text.noExam);

  const active = new Set(activeNumbers(classInfo));
  const chunks = String(value)
    .split(/\.{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const entries = {};
  for (const chunk of chunks) {
    const match = chunk.match(new RegExp("^(\\d+)[.:\\uFF1A,\\s]+(\\d+(?:\\.\\d+)?)$"));
    if (!match) throw new Error(text.badImport);
    const no = Number(match[1]);
    const score = Number(match[2]);
    if (!active.has(no) || !Number.isFinite(score) || score < 0 || score > exam.total) {
      throw new Error(text.badImport);
    }
    entries[no] = score;
  }
  return entries;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

el.classForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existingId = el.manageClassSelect.value;
  const classInfo = {
    id: existingId || uid(),
    name: el.className.value.trim(),
    size: Number(el.classSize.value),
    inactiveNos: parseNos(el.inactiveNos.value),
  };

  if (existingId) {
    state.classes = state.classes.map((item) => (item.id === existingId ? classInfo : item));
  } else {
    state.classes.unshift(classInfo);
  }

  state.selectedClassId = classInfo.id;
  state.selectedExamId = "";
  fillClassForm(classInfo.id);
  toggleSettings(true);
  await saveState(text.saved);
});

el.manageClassSelect.addEventListener("change", () => fillClassForm(el.manageClassSelect.value));
el.newClassButton.addEventListener("click", resetClassForm);

el.examForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedClassId) {
    setStatus(text.noClass);
    return;
  }
  const exam = {
    id: uid(),
    classId: state.selectedClassId,
    name: el.examName.value.trim(),
    date: el.examDate.value,
    total: Number(el.examTotal.value),
    scores: {},
  };
  state.exams.unshift(exam);
  state.selectedExamId = exam.id;
  el.examForm.reset();
  el.examDate.value = today;
  el.examTotal.value = "100";
  toggleSettings(false);
  await saveState(text.saved);
});

el.settingsButton.addEventListener("click", () => toggleSettings());
el.settingsCloseButton.addEventListener("click", () => toggleSettings(false));
el.settingsTabs.forEach((button) => {
  button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab));
});

el.classSelect.addEventListener("change", () => {
  selectClass(el.classSelect.value);
});

el.titleClassMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-class-id]");
  if (button) selectClass(button.dataset.classId);
});

el.examSelect.addEventListener("change", () => {
  state.selectedExamId = el.examSelect.value;
  state.selectedNo = null;
  render();
});

el.bulkButton.addEventListener("click", async () => {
  try {
    const exam = currentExam();
    const entries = parseBulk(el.bulkInput.value);
    Object.assign(exam.scores, entries);
    el.bulkInput.value = "";
    await saveState(text.importDone);
  } catch (error) {
    setStatus(error.message || text.badImport);
  }
});

el.bulkToggleButton.addEventListener("click", () => toggleBulk());

el.clearExamButton.addEventListener("click", async () => {
  const exam = currentExam();
  if (!exam) {
    setStatus(text.noExam);
    return;
  }
  exam.scores = {};
  state.selectedNo = null;
  el.singleScore.value = "";
  el.editingNo.textContent = "\u672a\u9009\u62e9";
  closeScoreDialog();
  toggleBulk(false);
  await saveState(text.cleared);
});

el.studentGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-no]");
  if (!button) return;
  openScoreDialog(Number(button.dataset.no));
});

el.saveScoreButton.addEventListener("click", async () => {
  const exam = currentExam();
  if (!exam) {
    setStatus(text.noExam);
    return;
  }
  if (!state.selectedNo) {
    setStatus(text.chooseNo);
    return;
  }
  const score = Number(el.singleScore.value);
  if (!Number.isFinite(score) || score < 0 || score > exam.total) {
    setStatus(text.badImport);
    return;
  }
  exam.scores[state.selectedNo] = score;
  closeScoreDialog();
  await saveState(text.saved);
});

el.cancelScoreButton.addEventListener("click", closeScoreDialog);
el.scoreDialog.addEventListener("click", (event) => {
  if (event.target === el.scoreDialog) closeScoreDialog();
});

loadState();
