const deleteStateKey = "grade-insight-store-state";
const deleteStaticHosts = new Set(["github.io", "pages.dev"]);
const deleteExamValue = "__delete_current_exam__";
let lastExamValue = "";
let decoratingExamSelect = false;
let decorateQueued = false;

const deleteEl = {
  manageClassSelect: document.querySelector("#manageClassSelect"),
  deleteClassButton: document.querySelector("#deleteClassButton"),
  examSelect: document.querySelector("#examSelect"),
  deleteExamButton: document.querySelector("#deleteExamButton"),
};

if (deleteEl.deleteExamButton) deleteEl.deleteExamButton.hidden = true;

function canUseDeleteRemoteApi() {
  if (location.protocol === "file:") return false;
  return !Array.from(deleteStaticHosts).some((host) => location.hostname === host || location.hostname.endsWith(`.${host}`));
}

async function readStoredState() {
  if (canUseDeleteRemoteApi()) {
    try {
      const response = await fetch("/api/state");
      if (response.ok) return response.json();
    } catch {
      // Fall back to browser storage below.
    }
  }
  return JSON.parse(localStorage.getItem(deleteStateKey) || "{}");
}

async function writeStoredState(payload) {
  if (canUseDeleteRemoteApi()) {
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) return;
    } catch {
      // Fall back to browser storage below.
    }
  }
  localStorage.setItem(deleteStateKey, JSON.stringify(payload));
}

function cleanExamLabel(label) {
  return String(label).replace(/\s+-\s+\d{4}-\d{2}-\d{2}$/, "");
}

function decorateExamSelectNow() {
  const select = deleteEl.examSelect;
  if (!select || decoratingExamSelect) return;
  decoratingExamSelect = true;

  const currentValue = select.value && select.value !== deleteExamValue ? select.value : lastExamValue;
  Array.from(select.options).forEach((option) => {
    if (option.value === deleteExamValue) return;
    const clean = cleanExamLabel(option.textContent);
    if (option.textContent !== clean) option.textContent = clean;
  });

  const hasExam = Boolean(currentValue);
  const existingDelete = Array.from(select.options).find((option) => option.value === deleteExamValue);
  if (hasExam && !existingDelete) {
    const option = document.createElement("option");
    option.value = deleteExamValue;
    option.textContent = "\u5220\u9664\u5f53\u524d\u8003\u8bd5";
    select.append(option);
  }
  if (!hasExam && existingDelete) existingDelete.remove();
  if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
    if (select.value !== currentValue) select.value = currentValue;
    lastExamValue = currentValue;
  }

  decoratingExamSelect = false;
}

function queueDecorateExamSelect() {
  if (decorateQueued) return;
  decorateQueued = true;
  requestAnimationFrame(() => {
    decorateQueued = false;
    decorateExamSelectNow();
    updateDeleteButtonsOnly();
  });
}

async function deleteCurrentExam(examId) {
  if (!examId) return;
  const data = await readStoredState();
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const exams = Array.isArray(data.exams) ? data.exams : [];
  const exam = exams.find((item) => item.id === examId);
  if (!exam) return;

  if (!confirm(`\u5220\u9664\u201c${exam.name}\u201d\u53ca\u5176\u6240\u6709\u6210\u7ee9\uff1f`)) {
    deleteEl.examSelect.value = examId;
    return;
  }
  await writeStoredState({
    classes,
    exams: exams.filter((item) => item.id !== examId),
  });
  location.reload();
}

function updateDeleteButtonsOnly() {
  if (deleteEl.deleteClassButton) deleteEl.deleteClassButton.disabled = !deleteEl.manageClassSelect?.value;
  if (deleteEl.deleteExamButton) {
    deleteEl.deleteExamButton.hidden = true;
    deleteEl.deleteExamButton.disabled = true;
  }
}

function updateDeleteButtons() {
  updateDeleteButtonsOnly();
  queueDecorateExamSelect();
}

deleteEl.deleteClassButton?.addEventListener("click", async () => {
  const classId = deleteEl.manageClassSelect?.value;
  if (!classId) return;

  const data = await readStoredState();
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const exams = Array.isArray(data.exams) ? data.exams : [];
  const classInfo = classes.find((item) => item.id === classId);
  if (!classInfo) return;

  if (!confirm(`\u5220\u9664\u201c${classInfo.name}\u201d\u53ca\u5176\u6240\u6709\u8003\u8bd5\u548c\u6210\u7ee9\uff1f`)) return;
  await writeStoredState({
    classes: classes.filter((item) => item.id !== classId),
    exams: exams.filter((exam) => exam.classId !== classId),
  });
  location.reload();
});

deleteEl.deleteExamButton?.addEventListener("click", async () => {
  await deleteCurrentExam(deleteEl.examSelect?.value);
});

deleteEl.examSelect?.addEventListener(
  "change",
  async (event) => {
    if (deleteEl.examSelect.value !== deleteExamValue) {
      lastExamValue = deleteEl.examSelect.value;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const examId = lastExamValue;
    deleteEl.examSelect.value = examId;
    await deleteCurrentExam(examId);
  },
  true
);

deleteEl.manageClassSelect?.addEventListener("change", updateDeleteButtons);
deleteEl.examSelect?.addEventListener("change", updateDeleteButtons);
if (deleteEl.examSelect) {
  new MutationObserver(updateDeleteButtons).observe(deleteEl.examSelect, { childList: true });
}
updateDeleteButtons();
