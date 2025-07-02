const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM"];
const table = document.getElementById("schedule-table");
const saveBtn = document.getElementById("save-btn");
const statusText = document.getElementById("status");

// Replace with YOUR GitHub username and repo
const RAW_JSON_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/schedule.json";

let isOwner = false;
let schedule = {};

// Ask if you're the owner (simple key method)
const key = prompt("Enter secret key (leave blank to view only):");
if (key === "mySecret123") {
  isOwner = true;
  saveBtn.style.display = "inline-block";
  statusText.textContent = "You are editing your schedule.";
} else {
  statusText.textContent = "Viewing schedule (read-only).";
}

function createTable(data) {
  const thead = table.createTHead();
  const row = thead.insertRow();
  row.insertCell().outerHTML = "<th>Time</th>";
  for (const day of days) {
    row.insertCell().outerHTML = `<th>${day}</th>`;
  }

  for (const time of timeSlots) {
    const row = table.insertRow();
    row.insertCell().outerHTML = `<th>${time}</th>`;
    for (const day of days) {
      const cell = row.insertCell();
      cell.textContent = data[day]?.[time] || "";
      if (isOwner) cell.contentEditable = "true";
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
      data[day][time] = row.cells[j].textContent.trim();
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
  alert("Download complete! Replace your GitHub `schedule.json` to update.");
});

// Load schedule
fetch(RAW_JSON_URL)
  .then(res => res.json())
  .then(data => {
    schedule = data;
    createTable(schedule);
  })
  .catch(err => {
    console.error(err);
    alert("Failed to load schedule.json");
  });
