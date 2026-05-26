const deleteStateKey = "grade-insight-store-state";
const deleteStaticHosts = new Set(["github.io", "pages.dev"]);
let lastExamValue = "";
let decoratingExamSelect = false;
let decorateQueued = false;

const deleteEl = {
  manageClassSelect: document.querySelector("#manageClassSelect"),
  deleteClassButton: document.querySelector("#deleteClassButton"),
  examSelect: document.querySelector("#examSelect"),
  deleteExamButton: document.querySelector("#deleteExamButton"),
};

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

  const currentValue = select.value || lastExamValue;
  Array.from(select.options).forEach((option) => {
    const clean = cleanExamLabel(option.textContent);
    if (option.textContent !== clean) option.textContent = clean;
  });

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

  if (!confirm(`\u5220\u9664\u201c${exam.name}\u201d\u53ca\u5176\u6240\u6709\u6210\u7ee9\uff1f`)) return;
  await writeStoredState({
    classes,
    exams: exams.filter((item) => item.id !== examId),
  });
  location.reload();
}

function updateDeleteButtonsOnly() {
  if (deleteEl.deleteClassButton) deleteEl.deleteClassButton.disabled = !deleteEl.manageClassSelect?.value;
  if (deleteEl.deleteExamButton) deleteEl.deleteExamButton.disabled = !deleteEl.examSelect?.value;
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

deleteEl.examSelect?.addEventListener("change", () => {
  lastExamValue = deleteEl.examSelect.value;
});

deleteEl.manageClassSelect?.addEventListener("change", updateDeleteButtons);
deleteEl.examSelect?.addEventListener("change", updateDeleteButtons);
if (deleteEl.examSelect) {
  new MutationObserver(updateDeleteButtons).observe(deleteEl.examSelect, { childList: true });
}
updateDeleteButtons();
