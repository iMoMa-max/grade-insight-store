const deleteStateKey = "grade-insight-store-state";
const deleteStaticHosts = new Set(["github.io", "pages.dev"]);
let lastExamValue = "";
let customExam = null;
let customOpen = false;
let rebuildQueued = false;

const deleteEl = {
  manageClassSelect: document.querySelector("#manageClassSelect"),
  deleteClassButton: document.querySelector("#deleteClassButton"),
  examSelect: document.querySelector("#examSelect"),
  deleteExamButton: document.querySelector("#deleteExamButton"),
};

const trashIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16"></path>
    <path d="M9 7V5h6v2"></path>
    <path d="M7 7l1 13h8l1-13"></path>
    <path d="M10 11v5"></path>
    <path d="M14 11v5"></path>
  </svg>
`;

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

function setCustomOpen(open) {
  customOpen = open;
  if (!customExam) return;
  customExam.root.classList.toggle("open", open);
  customExam.button.setAttribute("aria-expanded", String(open));
  customExam.list.hidden = !open;
}

function selectExam(value) {
  const select = deleteEl.examSelect;
  if (!select) return;
  select.value = value;
  lastExamValue = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  setCustomOpen(false);
  queueRebuildCustomExam();
}

async function deleteCurrentExam(examId) {
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
}

function ensureCustomExamSelect() {
  const select = deleteEl.examSelect;
  if (!select || customExam) return;

  select.classList.add("native-exam-select");
  if (deleteEl.deleteExamButton) {
    deleteEl.deleteExamButton.hidden = true;
    deleteEl.deleteExamButton.disabled = true;
  }

  const root = document.createElement("div");
  root.className = "exam-combo";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "exam-combo-button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const list = document.createElement("div");
  list.className = "exam-combo-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  root.append(button, list);
  select.insertAdjacentElement("afterend", root);
  customExam = { root, button, list };

  button.addEventListener("click", () => setCustomOpen(!customOpen));
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) setCustomOpen(false);
  });
}

function rebuildCustomExamNow() {
  ensureCustomExamSelect();
  const select = deleteEl.examSelect;
  if (!select || !customExam) return;

  const options = Array.from(select.options).filter((option) => option.value);
  const currentValue = select.value || lastExamValue;
  const selected = options.find((option) => option.value === currentValue) || options[0];

  if (selected && select.value !== selected.value) {
    select.value = selected.value;
  }

  lastExamValue = selected?.value || "";
  customExam.root.hidden = options.length === 0;
  customExam.button.textContent = selected ? cleanExamLabel(selected.textContent) : "请先新建考试";
  customExam.list.innerHTML = "";

  options.forEach((option) => {
    const row = document.createElement("div");
    row.className = "exam-option-row";
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(option.value === select.value));

    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "exam-option-name";
    nameButton.textContent = cleanExamLabel(option.textContent);
    nameButton.addEventListener("click", () => selectExam(option.value));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "exam-delete-inline";
    deleteButton.setAttribute("aria-label", `删除${cleanExamLabel(option.textContent)}`);
    deleteButton.innerHTML = trashIcon;
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await deleteCurrentExam(option.value);
    });

    row.append(nameButton, deleteButton);
    customExam.list.append(row);
  });

  updateDeleteButtonsOnly();
}

function queueRebuildCustomExam() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    rebuildCustomExamNow();
  });
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
  queueRebuildCustomExam();
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
  await deleteCurrentExam(deleteEl.examSelect?.value);
});

deleteEl.manageClassSelect?.addEventListener("change", updateDeleteButtons);
deleteEl.examSelect?.addEventListener("change", () => {
  lastExamValue = deleteEl.examSelect.value;
  updateDeleteButtons();
});

if (deleteEl.examSelect) {
  new MutationObserver(updateDeleteButtons).observe(deleteEl.examSelect, { childList: true });
}

updateDeleteButtons();
