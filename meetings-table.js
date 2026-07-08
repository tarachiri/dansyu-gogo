const STORAGE_KEY = "danshu-gogo-prototype-v1";

const statusLabels = {
  submitted: "投稿済み",
  reviewing: "確認中",
  confirmed: "確約済み",
  synced: "本体反映済み",
};

const fallbackMeetings = [
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
];

const dbTableBody = document.querySelector("#dbTableBody");
const dbTableHead = document.querySelector("#dbTableHead");
const dbStatusFilter = document.querySelector("#dbStatusFilter");
const dbSearchInput = document.querySelector("#dbSearchInput");
const dbCount = document.querySelector("#dbCount");

let meetings = loadMeetings();

const schemaColumns = [
  { key: "id", label: "id", type: "TEXT", description: "レコードID", className: "db-id" },
  { key: "status", label: "状態", type: "ENUM", description: "投稿・確認状態", render: renderStatus },
  { key: "date", label: "日付", type: "DATE", description: "開催日" },
  { key: "startTime", label: "開始", type: "TIME", description: "開始時刻" },
  { key: "endTime", label: "終了", type: "TIME", description: "終了時刻" },
  { key: "organization", label: "団体", type: "TEXT", description: "断酒会・団体名", className: "db-wide" },
  { key: "meetingName", label: "例会名", type: "TEXT", description: "例会・イベント名", className: "db-wide" },
  { key: "venue", label: "会場", type: "TEXT", description: "施設・会場名", className: "db-wider" },
  { key: "address", label: "住所", type: "TEXT", description: "会場住所", className: "db-wider" },
  { key: "submitter", label: "投稿者", type: "TEXT", description: "登録した人" },
  { key: "pattern", label: "パターン", type: "TEXT", description: "開催規則", className: "db-wide" },
  { key: "note", label: "備考", type: "TEXT", description: "確認メモ", className: "db-wider" },
  { key: "source", label: "source", type: "TEXT", description: "データ由来" },
];

function loadMeetings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return fallbackMeetings;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed.meetings) ? parsed.meetings : fallbackMeetings;
  } catch {
    return fallbackMeetings;
  }
}

function visibleMeetings() {
  const status = dbStatusFilter.value;
  const query = dbSearchInput.value.trim().toLowerCase();

  return meetings
    .filter((meeting) => status === "all" || meeting.status === status)
    .filter((meeting) => {
      if (!query) return true;
      return [
        meeting.id,
        meeting.status,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.organization,
        meeting.meetingName,
        meeting.venue,
        meeting.address,
        meeting.submitter,
        meeting.pattern,
        meeting.note,
        meeting.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function renderStatus(status) {
  const span = document.createElement("span");
  span.className = `status-badge status-${status}`;
  span.textContent = statusLabels[status] || status || "";
  return span;
}

function appendCell(row, value, className = "") {
  const td = document.createElement("td");
  td.textContent = value || "";
  if (className) td.className = className;
  row.append(td);
}

function renderSchema() {
  dbTableHead.innerHTML = "";

  const lettersRow = document.createElement("tr");
  lettersRow.className = "db-column-letters";
  const corner = document.createElement("th");
  corner.className = "db-row-number";
  corner.textContent = "";
  lettersRow.append(corner);

  schemaColumns.forEach((_, index) => {
    const th = document.createElement("th");
    th.textContent = String.fromCharCode(65 + index);
    lettersRow.append(th);
  });

  const schemaRow = document.createElement("tr");
  schemaRow.className = "db-schema-row";
  const schemaCorner = document.createElement("th");
  schemaCorner.className = "db-row-number";
  schemaCorner.textContent = "schema";
  schemaRow.append(schemaCorner);

  schemaColumns.forEach((column) => {
    const th = document.createElement("th");
    th.innerHTML = `<strong>${column.label}</strong><span>${column.key}</span><em>${column.type}</em><small>${column.description}</small>`;
    schemaRow.append(th);
  });

  dbTableHead.append(lettersRow, schemaRow);
}

function renderTable() {
  const rows = visibleMeetings();
  dbCount.textContent = `${rows.length}件 / 全${meetings.length}件`;
  dbTableBody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const rowNumber = document.createElement("th");
    rowNumber.className = "db-row-number";
    rowNumber.textContent = "1";
    tr.append(rowNumber);
    const td = document.createElement("td");
    td.colSpan = schemaColumns.length;
    td.className = "db-empty";
    td.textContent = "表示できる meetings はありません。";
    tr.append(td);
    dbTableBody.append(tr);
    return;
  }

  rows.forEach((meeting, index) => {
    const tr = document.createElement("tr");
    const rowNumber = document.createElement("th");
    rowNumber.className = "db-row-number";
    rowNumber.textContent = index + 1;
    tr.append(rowNumber);

    schemaColumns.forEach((column) => {
      if (column.render) {
        const td = document.createElement("td");
        td.append(column.render(meeting[column.key]));
        tr.append(td);
        return;
      }
      appendCell(tr, column.key === "source" ? meeting.source || "local" : meeting[column.key], column.className || "");
    });
    dbTableBody.append(tr);
  });
}

dbStatusFilter.addEventListener("change", renderTable);
dbSearchInput.addEventListener("input", renderTable);
document.querySelector("#tablePrintButton").addEventListener("click", () => window.print());

renderSchema();
renderTable();
