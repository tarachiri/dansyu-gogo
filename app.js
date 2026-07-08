const STORAGE_KEY = "danshu-gogo-prototype-v1";

const statusLabels = {
  submitted: "投稿済み",
  reviewing: "確認中",
  confirmed: "確約済み",
  synced: "本体反映済み",
};

const seedMeetings = [
  {
    id: "sample-1",
    submitter: "山田",
    organization: "東京断酒新生会",
    meetingName: "立川例会",
    venue: "立川市女性総合センター",
    address: "東京都立川市曙町",
    date: "2026-07-15",
    startTime: "19:00",
    endTime: "20:30",
    pattern: "毎週",
    status: "confirmed",
    note: "公開可。会場確認済み。",
  },
  {
    id: "sample-2",
    submitter: "佐藤",
    organization: "多摩断酒会",
    meetingName: "府中昼例会",
    venue: "府中市市民活動センター",
    address: "東京都府中市宮町",
    date: "2026-07-22",
    startTime: "13:30",
    endTime: "15:00",
    pattern: "第4週",
    status: "reviewing",
    note: "時間確認中。",
  },
  {
    id: "sample-3",
    submitter: "田中",
    organization: "神奈川断酒会",
    meetingName: "横浜例会",
    venue: "かながわ県民センター",
    address: "神奈川県横浜市神奈川区",
    date: "2026-08-05",
    startTime: "18:30",
    endTime: "20:00",
    pattern: "第1週",
    status: "submitted",
    note: "投稿のみ。確認前。",
  },
  {
    id: "sample-4",
    submitter: "鈴木",
    organization: "埼玉断酒連合会",
    meetingName: "浦和例会",
    venue: "浦和コミュニティセンター",
    address: "埼玉県さいたま市浦和区",
    date: "2026-08-18",
    startTime: "19:00",
    endTime: "20:30",
    pattern: "第3週",
    status: "synced",
    note: "本体反映済み。",
  },
];

let state = loadState();
let selectedId = null;
let selectedTableIds = new Set();
let calendarCursor = new Date("2026-07-01T00:00:00");
let chatState = createChatState();

const form = document.querySelector("#meetingForm");
const list = document.querySelector("#submissionList");
const table = document.querySelector("#meetingTable");
const summaryGrid = document.querySelector("#summaryGrid");
const template = document.querySelector("#submissionTemplate");
const statusFilter = document.querySelector("#statusFilter");
const searchInput = document.querySelector("#searchInput");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarTitle = document.querySelector("#calendarTitle");
const exportJson = document.querySelector("#exportJson");
const listNote = document.querySelector("#listNote");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatDraft = document.querySelector("#chatDraft");
const formTabButton = document.querySelector('[data-tab="form"]');
const listTabButton = document.querySelector('[data-tab="list"]');
const importProductionButton = document.querySelector("#importProductionButton");

const chatSteps = [
  { key: "submitter", label: "投稿者", question: "まず投稿者のお名前を教えてください。" },
  { key: "organization", label: "団体", question: "団体名を教えてください。" },
  { key: "meetingName", label: "例会名", question: "例会名を教えてください。" },
  { key: "venue", label: "会場", question: "会場名を教えてください。" },
  { key: "address", label: "住所", question: "住所を教えてください。未定なら「スキップ」で大丈夫です。", optional: true },
  { key: "date", label: "日付", question: "日付を入力してください。例: 2026-08-05" },
  { key: "startTime", label: "開始", question: "開始時間を入力してください。例: 19:00" },
  { key: "endTime", label: "終了", question: "終了時間を入力してください。未定なら「スキップ」で大丈夫です。", optional: true },
  { key: "pattern", label: "パターン", question: "開催パターンを教えてください。例: 単発、毎週、第2週、最終週" },
  { key: "note", label: "備考", question: "備考があれば入力してください。なければ「スキップ」で大丈夫です。", optional: true },
];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { meetings: seedMeetings, lastTemplate: seedMeetings[0] };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return { meetings: seedMeetings, lastTemplate: seedMeetings[0] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createChatState() {
  return {
    stepIndex: 0,
    draft: {},
    complete: false,
  };
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function getStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = `status-badge status-${status}`;
  badge.textContent = statusLabels[status];
  return badge;
}

function addChatMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message chat-message--${role}`;
  message.textContent = text;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatDraft() {
  const entries = chatSteps
    .filter((step) => chatState.draft[step.key])
    .map((step) => `<strong>${step.label}</strong>: ${chatState.draft[step.key]}`);

  chatDraft.innerHTML = entries.length
    ? `下書き ${entries.join(" / ")}`
    : "下書きはまだありません。";
}

function askCurrentChatStep() {
  const step = chatSteps[chatState.stepIndex];
  if (!step) {
    addChatMessage("kamo", "この内容で投稿一覧に入れます。「登録」と入力すると投稿済みで追加します。修正したい場合は「最初から」を押してください。");
    chatState.complete = true;
    return;
  }
  addChatMessage("kamo", step.question);
}

function normalizeChatValue(step, value) {
  const trimmed = value.trim();
  if (step.optional && ["skip", "スキップ", "なし", "未定"].includes(trimmed.toLowerCase())) {
    return "";
  }
  if (step.key === "date") {
    const normalized = trimmed.replaceAll("/", "-");
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : trimmed;
  }
  if (["startTime", "endTime"].includes(step.key)) {
    const match = trimmed.match(/^(\d{1,2})[:：](\d{2})$/);
    if (!match) return trimmed;
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return trimmed;
}

function createMeetingFromChat() {
  const draft = chatState.draft;
  const meeting = {
    id: `chat-${Date.now()}`,
    submitter: draft.submitter || "",
    organization: draft.organization || "",
    meetingName: draft.meetingName || "",
    venue: draft.venue || "",
    address: draft.address || "",
    date: draft.date || "",
    startTime: draft.startTime || "",
    endTime: draft.endTime || "",
    pattern: draft.pattern || "単発",
    status: "submitted",
    note: draft.note || "かもちゃんチャットから登録",
  };

  state.meetings.push(meeting);
  state.lastTemplate = meeting;
  selectedTableIds.add(meeting.id);
  saveState();
  renderAll();
  addChatMessage("kamo", "投稿済みとして一覧に追加しました。確認できたら「確約」にしてください。");
}

async function importProductionTestData() {
  importProductionButton.textContent = "読み込み中";
  importProductionButton.disabled = true;
  try {
    const response = await fetch("./production-test-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("failed to fetch production-test-data.json");
    const productionMeetings = await response.json();
    state.meetings = [
      ...state.meetings.filter((meeting) => meeting.source !== "production-test"),
      ...productionMeetings,
    ];
    selectedTableIds = new Set(state.meetings.map((meeting) => meeting.id));
    saveState();
    renderAll();
    listTabButton.click();
    importProductionButton.textContent = `${productionMeetings.length}件投入済み`;
  } catch {
    importProductionButton.textContent = "読み込み失敗";
  } finally {
    setTimeout(() => {
      importProductionButton.textContent = "テスト投入";
      importProductionButton.disabled = false;
    }, 1800);
  }
}

function resetChat() {
  chatState = createChatState();
  chatMessages.innerHTML = "";
  addChatMessage("kamo", "こんにちは、かもちゃんです。例会情報を一つずつ聞いて登録します。");
  renderChatDraft();
  askCurrentChatStep();
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getVisibleMeetings() {
  const status = statusFilter.value;
  const query = searchInput.value.trim().toLowerCase();

  return state.meetings
    .filter((meeting) => status === "all" || meeting.status === status)
    .filter((meeting) => {
      if (!query) return true;
      return [
        meeting.organization,
        meeting.meetingName,
        meeting.venue,
        meeting.address,
        meeting.submitter,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderSummary() {
  summaryGrid.innerHTML = "";
  Object.entries(statusLabels).forEach(([key, label]) => {
    const count = state.meetings.filter((meeting) => meeting.status === key).length;
    const metric = document.createElement("div");
    metric.className = "metric";
    metric.innerHTML = `<span>${label}</span><strong>${count}</strong>`;
    summaryGrid.append(metric);
  });
}

function renderList() {
  list.innerHTML = "";
  const meetings = getVisibleMeetings();
  listNote.textContent = `表示中 ${meetings.length}件 / 全${state.meetings.length}件`;

  if (!meetings.length) {
    const empty = document.createElement("div");
    empty.className = "submission";
    empty.textContent = "該当する投稿はありません。";
    list.append(empty);
    return;
  }

  meetings.forEach((meeting) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".submission__date").textContent =
      `${formatDate(meeting.date)} ${meeting.startTime}`;
    node.querySelector("h3").textContent = meeting.meetingName;
    node.querySelector(".submission__meta").textContent =
      `${meeting.organization} / ${meeting.venue} / ${meeting.submitter}`;
    const details = node.querySelector(".submission__details");
    [
      ["会場", meeting.venue],
      ["住所", meeting.address || "未入力"],
      ["区分", meeting.pattern],
      ["備考", meeting.note || "なし"],
    ].forEach(([term, description]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = description;
      details.append(dt, dd);
    });

    const select = node.querySelector(".status-select");
    Object.entries(statusLabels).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = meeting.status;
    select.addEventListener("change", () => {
      updateMeeting(meeting.id, { status: select.value });
    });

    node.querySelector(".confirm-button").disabled =
      ["confirmed", "synced"].includes(meeting.status);
    node.querySelector(".confirm-button").addEventListener("click", () => {
      updateMeeting(meeting.id, { status: "confirmed" });
    });

    node.querySelector(".edit-button").addEventListener("click", () => {
      formTabButton.click();
      fillForm(meeting);
      selectedId = meeting.id;
    });

    list.append(node);
  });
}

function renderTable() {
  table.innerHTML = "";
  const visibleMeetings = getGogoVisibleMeetings();
  if (!selectedTableIds.size) {
    selectedTableIds = new Set(visibleMeetings.map((meeting) => meeting.id));
  }

  visibleMeetings.forEach((meeting) => {
    const tr = document.createElement("tr");
    tr.dataset.meetingId = meeting.id;
    if (!selectedTableIds.has(meeting.id)) {
      tr.classList.add("is-unselected");
    }

    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedTableIds.has(meeting.id);
    checkbox.setAttribute("aria-label", `${meeting.meetingName}を印刷対象にする`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedTableIds.add(meeting.id);
        tr.classList.remove("is-unselected");
      } else {
        selectedTableIds.delete(meeting.id);
        tr.classList.add("is-unselected");
      }
    });
    checkboxCell.append(checkbox);

    [
      formatDate(meeting.date),
      `${meeting.startTime}${meeting.endTime ? `-${meeting.endTime}` : ""}`,
      meeting.organization,
      meeting.meetingName,
      meeting.venue,
      meeting.address || "",
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });

    const statusCell = document.createElement("td");
    statusCell.append(getStatusBadge(meeting.status));
    tr.prepend(checkboxCell);
    tr.append(statusCell);
    table.append(tr);
  });
}

function getGogoVisibleMeetings() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return state.meetings
    .filter((meeting) => {
      const date = new Date(`${meeting.date}T00:00:00`);
      return date <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  calendarTitle.textContent = formatMonth(calendarCursor);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = getDateKey(date);
    const cell = document.createElement("div");
    cell.className = "calendar__cell";
    if (date.getMonth() !== month) {
      cell.classList.add("is-muted");
    }

    const day = document.createElement("span");
    day.className = "calendar__day";
    day.textContent = date.getDate();
    cell.append(day);

    getGogoVisibleMeetings()
      .filter((meeting) => meeting.date === dateKey)
      .forEach((meeting) => {
        const item = document.createElement("span");
        item.className = "calendar__item";
        item.textContent = `${meeting.startTime} ${meeting.meetingName}`;
        cell.append(item);
      });

    calendarGrid.append(cell);
  }
}

function renderExport() {
  const confirmed = state.meetings
    .filter((meeting) => ["confirmed", "synced"].includes(meeting.status))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((meeting) => ({
      source: "gogo-prototype",
      organization: meeting.organization,
      meeting_name: meeting.meetingName,
      venue_name: meeting.venue,
      address: meeting.address,
      date: meeting.date,
      start_time: meeting.startTime,
      end_time: meeting.endTime,
      note: meeting.note,
      status: meeting.status,
    }));

  exportJson.textContent = JSON.stringify(confirmed, null, 2);
}

function renderAll() {
  renderSummary();
  renderList();
  renderTable();
  renderCalendar();
  renderExport();
}

function fillForm(meeting) {
  Object.entries(meeting).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function readForm() {
  return {
    id: selectedId || `meeting-${Date.now()}`,
    submitter: form.elements.submitter.value.trim(),
    organization: form.elements.organization.value.trim(),
    meetingName: form.elements.meetingName.value.trim(),
    venue: form.elements.venue.value.trim(),
    address: form.elements.address.value.trim(),
    date: form.elements.date.value,
    startTime: form.elements.startTime.value,
    endTime: form.elements.endTime.value,
    pattern: form.elements.pattern.value,
    status: form.elements.status.value,
    note: form.elements.note.value.trim(),
  };
}

function updateMeeting(id, patch) {
  state.meetings = state.meetings.map((meeting) =>
    meeting.id === id ? { ...meeting, ...patch } : meeting
  );
  saveState();
  renderAll();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const meeting = readForm();
  const exists = state.meetings.some((item) => item.id === meeting.id);

  if (exists) {
    state.meetings = state.meetings.map((item) =>
      item.id === meeting.id ? meeting : item
    );
  } else {
    state.meetings.push(meeting);
  }

  state.lastTemplate = meeting;
  selectedId = null;
  form.reset();
  saveState();
  renderAll();
});

document.querySelector("#loadLastButton").addEventListener("click", () => {
  formTabButton.click();
  fillForm(state.lastTemplate || seedMeetings[0]);
  selectedId = null;
});

document.querySelector("#duplicateButton").addEventListener("click", () => {
  const source = selectedId
    ? state.meetings.find((meeting) => meeting.id === selectedId)
    : state.lastTemplate;
  if (!source) return;
  formTabButton.click();
  fillForm({ ...source, id: "", status: "submitted" });
  selectedId = null;
});

document.querySelector("#resetButton").addEventListener("click", () => {
  state = { meetings: seedMeetings, lastTemplate: seedMeetings[0] };
  selectedId = null;
  form.reset();
  saveState();
  renderAll();
});

document.querySelector("#printButton").addEventListener("click", () => {
  listTabButton.click();
  window.print();
});

document.querySelector("#selectAllTableButton").addEventListener("click", () => {
  selectedTableIds = new Set(getGogoVisibleMeetings().map((meeting) => meeting.id));
  renderTable();
});

document.querySelector("#printSelectedButton").addEventListener("click", () => {
  document.body.classList.add("print-selected");
  listTabButton.click();
  window.print();
  setTimeout(() => {
    document.body.classList.remove("print-selected");
  }, 500);
});

document.querySelector("#copyJsonButton").addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(exportJson.textContent);
    event.currentTarget.textContent = "コピー済み";
  } catch {
    event.currentTarget.textContent = "選択してコピー";
  }
  setTimeout(() => {
    event.currentTarget.textContent = "JSONをコピー";
  }, 1400);
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value) return;
  chatInput.value = "";
  addChatMessage("user", value);

  if (chatState.complete) {
    if (["登録", "はい", "OK", "ok"].includes(value)) {
      createMeetingFromChat();
      resetChat();
    } else {
      addChatMessage("kamo", "登録する場合は「登録」と入力してください。");
    }
    return;
  }

  const step = chatSteps[chatState.stepIndex];
  chatState.draft[step.key] = normalizeChatValue(step, value);
  chatState.stepIndex += 1;
  renderChatDraft();
  askCurrentChatStep();
});

document.querySelector("#chatResetButton").addEventListener("click", resetChat);
importProductionButton.addEventListener("click", importProductionTestData);

document.querySelector("#prevMonthButton").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#nextMonthButton").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelector(`#${button.dataset.tab}Panel`).classList.add("is-active");
  });
});

statusFilter.addEventListener("change", renderList);
searchInput.addEventListener("input", renderList);

renderAll();
resetChat();
