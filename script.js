const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = Array.from({length: 17}, (_, i) => {
  const hour = 6 + i;
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = ((hour - 1) % 12 + 1) + ampm;
  return display;
});

const table = document.getElementById("schedule-table");
const saveBtn = document.getElementById("save-btn");
const statusText = document.getElementById("status");
const colorPicker = document.getElementById("color-picker");

const RAW_JSON_URL = "https://raw.githubusercontent.com/Nutellalala1/ZZZZSchedule/master/schedule.json";

let isOwner = false;
let schedule = {};

const key = prompt("Enter secret key (leave blank to view only):");
if (key === "mySecret123") {
  isOwner = true;
  saveBtn.style.display = "inline-block";
  statusText.textContent = "📝 You can edit your schedule.";
} else {
  saveBtn.style.display = "none";
  statusText.textContent = "🔒 Viewing schedule only.";
}

function createTable(data) {
  const thead = table.createTHead();
  const headRow = thead.insertRow();
  headRow.insertCell().outerHTML = "<th>Time</th>";
  for (const day of days) {
    headRow.insertCell().outerHTML = `<th>${day}</th>`;
  }

  for (const time of timeSlots) {
    const row = table.insertRow();
    row.insertCell().outerHTML = `<th>${time}</th>`;
    for (const day of days) {
      const cell = row.insertCell();
      const entry = data[day]?.[time] || "";
      const content = typeof entry === "string" ? entry : entry.text || "";
      const bgColor = typeof entry === "object" ? entry.color : "";

      cell.textContent = content;
      if (bgColor) cell.style.backgroundColor = bgColor;
      if (isOwner) {
        cell.contentEditable = "true";
        cell.classList.add("editable");

        cell.addEventListener("dblclick", () => {
          colorPicker.click();
          colorPicker.oninput = () => {
            cell.style.backgroundColor = colorPicker.value;
          };
        });
      }
    }
  }
}

function extractTableData() {
  const data = {};
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const time = row.cells[0].textContent;
    for (let j = 1; j < row.cells.length; j++) {
      const day = days[j - 1];
      if (!data[day]) data[day] = {};
      const cell = row.cells[j];
      const text = cell.textContent.trim();
      const color = cell.style.backgroundColor;
      if (text || color) {
        data[day][time] = { text, color };
      }
    }
  }
  return data;
}

saveBtn.addEventListener("click", () => {
  const newSchedule = extractTableData();
  const blob = new Blob([JSON.stringify(newSchedule, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "schedule.json";
  a.click();
  URL.revokeObjectURL(url);

  alert("✅ Download complete! Replace your GitHub `schedule.json` to update.");
});

fetch(RAW_JSON_URL)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return res.json();
  })
  .then(data => {
    schedule = data;
    createTable(schedule);
  })
  .catch(err => {
    console.error("Fetch error:", err);
    alert("⚠️ Failed to load schedule.json — check the URL or GitHub file path.");
  });