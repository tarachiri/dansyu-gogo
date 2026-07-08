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
const dbStatusFilter = document.querySelector("#dbStatusFilter");
const dbSearchInput = document.querySelector("#dbSearchInput");
const dbCount = document.querySelector("#dbCount");

let meetings = loadMeetings();

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

function renderTable() {
  const rows = visibleMeetings();
  dbCount.textContent = `${rows.length}件 / 全${meetings.length}件`;
  dbTableBody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 13;
    td.className = "db-empty";
    td.textContent = "表示できる meetings はありません。";
    tr.append(td);
    dbTableBody.append(tr);
    return;
  }

  rows.forEach((meeting) => {
    const tr = document.createElement("tr");
    appendCell(tr, meeting.id, "db-id");

    const statusCell = document.createElement("td");
    statusCell.append(renderStatus(meeting.status));
    tr.append(statusCell);

    appendCell(tr, meeting.date);
    appendCell(tr, meeting.startTime);
    appendCell(tr, meeting.endTime);
    appendCell(tr, meeting.organization, "db-wide");
    appendCell(tr, meeting.meetingName, "db-wide");
    appendCell(tr, meeting.venue, "db-wider");
    appendCell(tr, meeting.address, "db-wider");
    appendCell(tr, meeting.submitter);
    appendCell(tr, meeting.pattern, "db-wide");
    appendCell(tr, meeting.note, "db-wider");
    appendCell(tr, meeting.source || "local");
    dbTableBody.append(tr);
  });
}

dbStatusFilter.addEventListener("change", renderTable);
dbSearchInput.addEventListener("input", renderTable);
document.querySelector("#tablePrintButton").addEventListener("click", () => window.print());

renderTable();
