const deleteStateKey = "grade-insight-store-state";
const deleteStaticHosts = new Set(["github.io", "pages.dev"]);

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

function updateDeleteButtons() {
  if (deleteEl.deleteClassButton) deleteEl.deleteClassButton.disabled = !deleteEl.manageClassSelect?.value;
  if (deleteEl.deleteExamButton) deleteEl.deleteExamButton.disabled = !deleteEl.examSelect?.value;
}

deleteEl.deleteClassButton?.addEventListener("click", async () => {
  const classId = deleteEl.manageClassSelect?.value;
  if (!classId) return;

  const data = await readStoredState();
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const exams = Array.isArray(data.exams) ? data.exams : [];
  const classInfo = classes.find((item) => item.id === classId);
  if (!classInfo) return;

  if (!confirm(`删除“${classInfo.name}”及其所有考试和成绩？`)) return;
  await writeStoredState({
    classes: classes.filter((item) => item.id !== classId),
    exams: exams.filter((exam) => exam.classId !== classId),
  });
  location.reload();
});

deleteEl.deleteExamButton?.addEventListener("click", async () => {
  const examId = deleteEl.examSelect?.value;
  if (!examId) return;

  const data = await readStoredState();
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const exams = Array.isArray(data.exams) ? data.exams : [];
  const exam = exams.find((item) => item.id === examId);
  if (!exam) return;

  if (!confirm(`删除“${exam.name}”及其所有成绩？`)) return;
  await writeStoredState({
    classes,
    exams: exams.filter((item) => item.id !== examId),
  });
  location.reload();
});

deleteEl.manageClassSelect?.addEventListener("change", updateDeleteButtons);
deleteEl.examSelect?.addEventListener("change", updateDeleteButtons);
new MutationObserver(updateDeleteButtons).observe(document.body, { childList: true, subtree: true });
updateDeleteButtons();
