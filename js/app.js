// DOM Elements
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskPriority = document.getElementById("task-priority");
const taskCategory = document.getElementById("task-category");
const taskDueDate = document.getElementById("task-due-date");
const tasksContainer = document.getElementById("tasks-container");
const filterButtons = document.querySelectorAll(".filter-btn");
const categoryButtons = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search-input");
const themeToggle = document.querySelector(".theme-toggle");
const editTaskModal = document.getElementById("edit-task-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const editTaskForm = document.getElementById("edit-task-form");
const editTaskId = document.getElementById("edit-task-id");
const editTaskText = document.getElementById("edit-task-text");
const editTaskPriority = document.getElementById("edit-task-priority");
const editTaskCategory = document.getElementById("edit-task-category");
const editTaskDueDate = document.getElementById("edit-task-due-date");

// Dashboard elements
const totalTasksEl = document.getElementById("total-tasks");
const completedTasksEl = document.getElementById("completed-tasks");
const pendingTasksEl = document.getElementById("pending-tasks");
const tasksSummaryEl = document.getElementById("tasks-summary");

// Set today's date as the default date
const today = new Date().toISOString().split("T")[0];
taskDueDate.value = today;

// Local Storage
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Ensure all tasks have categories (for backward compatibility)
tasks = tasks.map((task) => {
  if (!task.category) {
    return { ...task, category: "other" };
  }
  return task;
});

let currentFilter = "all";
let currentCategory = "all";
let searchQuery = "";

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  updateDashboard();
  checkDarkMode();
});

taskForm.addEventListener("submit", addTask);
editTaskForm.addEventListener("submit", updateTask);
closeModalBtn.addEventListener("click", closeModal);
themeToggle.addEventListener("click", toggleTheme);
searchInput.addEventListener("input", handleSearch);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderTasks();
  });
});

// Functions
function addTask(e) {
  e.preventDefault();

  if (!taskInput.value.trim()) return;

  const newTask = {
    id: Date.now(),
    text: taskInput.value.trim(),
    completed: false,
    priority: taskPriority.value,
    category: taskCategory.value,
    dueDate: taskDueDate.value || null,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  updateDashboard();

  // Reset form
  taskForm.reset();
  taskDueDate.value = today;
  taskCategory.value = "work"; // Default category

  // Animation
  setTimeout(() => {
    const firstTask = document.querySelector(".task-item");
    if (firstTask) {
      firstTask.style.animation = "none";
      firstTask.offsetHeight; // Trigger reflow
      firstTask.style.animation = "fadeIn 0.5s ease";
    }
  }, 10);
}

function renderTasks() {
  const filteredTasks = filterAndSearchTasks(
    tasks,
    currentFilter,
    currentCategory,
    searchQuery
  );

  if (filteredTasks.length === 0) {
    tasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="far fa-clipboard"></i>
                <p>No ${
                  currentFilter !== "all" ? currentFilter : ""
                } tasks found. ${
      searchQuery ? "Try a different search." : "Add a task to get started."
    }</p>
            </div>
        `;
    return;
  }

  tasksContainer.innerHTML = "";

  filteredTasks.forEach((task) => {
    const taskElement = createTaskElement(task);
    tasksContainer.appendChild(taskElement);
  });

  // Setup drag and drop after rendering tasks
  setupDragAndDrop();
}

function createTaskElement(task) {
  const taskElement = document.createElement("div");
  taskElement.classList.add("task-item");
  taskElement.classList.add(`priority-${task.priority}`);
  taskElement.classList.add(`category-${task.category}`);
  if (task.completed) taskElement.classList.add("completed");
  taskElement.dataset.id = task.id;
  taskElement.draggable = true;

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && new Date() > dueDate && !task.completed;

  // Get category icon
  const categoryIcon = getCategoryIcon(task.category);

  taskElement.innerHTML = `
        <div class="task-checkbox" data-id="${task.id}">
            <i class="fas fa-check"></i>
        </div>
        <div class="task-content">
            <div class="task-text">${escapeHtml(task.text)}</div>
            <div class="task-meta">
                ${
                  task.dueDate
                    ? `
                <div class="task-due-date ${isOverdue ? "overdue" : ""}">
                    <i class="far fa-calendar-alt"></i>
                    <span>${formatDate(task.dueDate)}</span>
                </div>
                `
                    : ""
                }
                <div class="task-priority">
                    <i class="fas fa-flag"></i>
                    <span>${capitalizeFirstLetter(
                      task.priority
                    )} Priority</span>
                </div>
                <div class="task-category">
                    <i class="${categoryIcon}"></i>
                    <span>${capitalizeFirstLetter(task.category)}</span>
                </div>
            </div>
        </div>
        <div class="task-actions">
            <button class="task-btn edit-btn" data-id="${task.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-btn delete-btn" data-id="${task.id}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

  // Event listeners for task elements
  const checkbox = taskElement.querySelector(".task-checkbox");
  checkbox.addEventListener("click", () => toggleTaskStatus(task.id));

  const editBtn = taskElement.querySelector(".edit-btn");
  editBtn.addEventListener("click", () => openEditModal(task));

  const deleteBtn = taskElement.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  return taskElement;
}

function filterAndSearchTasks(tasks, filter, category, query) {
  let filteredTasks = [...tasks];

  // Apply status filter
  switch (filter) {
    case "active":
      filteredTasks = filteredTasks.filter((task) => !task.completed);
      break;
    case "completed":
      filteredTasks = filteredTasks.filter((task) => task.completed);
      break;
    case "today":
      const todayStr = new Date().toISOString().split("T")[0];
      filteredTasks = filteredTasks.filter((task) => task.dueDate === todayStr);
      break;
    case "upcoming":
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredTasks = filteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= tomorrow;
      });
      break;
    case "overdue":
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredTasks = filteredTasks.filter((task) => {
        if (!task.dueDate || task.completed) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < today;
      });
      break;
  }

  // Apply category filter
  if (category !== "all") {
    filteredTasks = filteredTasks.filter((task) => task.category === category);
  }

  // Apply search filter
  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredTasks = filteredTasks.filter((task) =>
      task.text.toLowerCase().includes(lowerQuery)
    );
  }

  return filteredTasks;
}

function toggleTaskStatus(id) {
  tasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  renderTasks();
  updateDashboard();
}

function deleteTask(id) {
  const taskElement = document.querySelector(`.task-item[data-id="${id}"]`);
  if (taskElement) {
    // Add delete animation
    taskElement.style.animation = "fadeOut 0.3s ease forwards";

    setTimeout(() => {
      tasks = tasks.filter((task) => task.id !== id);
      saveTasks();
      renderTasks();
      updateDashboard();
    }, 300);
  }
}

function openEditModal(task) {
  editTaskId.value = task.id;
  editTaskText.value = task.text;
  editTaskPriority.value = task.priority;
  editTaskCategory.value = task.category || "work";
  editTaskDueDate.value = task.dueDate || "";

  editTaskModal.classList.add("active");
  editTaskText.focus();
}

function closeModal() {
  editTaskModal.classList.remove("active");
}

function updateTask(e) {
  e.preventDefault();

  const id = Number(editTaskId.value);
  const updatedText = editTaskText.value.trim();

  if (!updatedText) return;

  tasks = tasks.map((task) => {
    if (task.id === id) {
      return {
        ...task,
        text: updatedText,
        priority: editTaskPriority.value,
        category: editTaskCategory.value,
        dueDate: editTaskDueDate.value || null,
      };
    }
    return task;
  });

  saveTasks();
  renderTasks();
  updateDashboard();
  closeModal();
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Update dashboard statistics
function updateDashboard() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  totalTasksEl.textContent = totalTasks;
  completedTasksEl.textContent = completedTasks;
  pendingTasksEl.textContent = pendingTasks;

  // Update task summary in footer
  tasksSummaryEl.textContent = `${totalTasks} task${
    totalTasks !== 1 ? "s" : ""
  } total`;
}

// Handle search functionality
function handleSearch(e) {
  searchQuery = e.target.value.trim();
  renderTasks();
}

// Get category icon
function getCategoryIcon(category) {
  switch (category) {
    case "work":
      return "fas fa-briefcase";
    case "personal":
      return "fas fa-user";
    case "shopping":
      return "fas fa-shopping-cart";
    case "health":
      return "fas fa-heartbeat";
    default:
      return "fas fa-folder";
  }
}

// Drag and Drop Functionality
function setupDragAndDrop() {
  const taskItems = document.querySelectorAll(".task-item");

  taskItems.forEach((item) => {
    item.addEventListener("dragstart", dragStart);
    item.addEventListener("dragend", dragEnd);
    item.addEventListener("dragover", dragOver);
    item.addEventListener("dragenter", dragEnter);
    item.addEventListener("dragleave", dragLeave);
    item.addEventListener("drop", drop);
  });
}

function dragStart() {
  this.classList.add("dragging");
  setTimeout(() => {
    this.style.opacity = "0.4";
  }, 0);
}

function dragEnd() {
  this.classList.remove("dragging");
  this.style.opacity = "1";
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.preventDefault();
  this.classList.add("drag-over");
}

function dragLeave() {
  this.classList.remove("drag-over");
}

function drop() {
  this.classList.remove("drag-over");

  const draggedItem = document.querySelector(".dragging");
  const draggedId = Number(draggedItem.dataset.id);
  const targetId = Number(this.dataset.id);

  if (draggedId === targetId) return;

  // Find indices
  const draggedIndex = tasks.findIndex((task) => task.id === draggedId);
  const targetIndex = tasks.findIndex((task) => task.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Reorder tasks array
  const [removed] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, removed);

  saveTasks();
  renderTasks();
}

function toggleTheme() {
  const body = document.body;
  const icon = themeToggle.querySelector("i");

  if (body.classList.contains("dark-mode")) {
    body.classList.remove("dark-mode");
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    localStorage.setItem("theme", "light");
  } else {
    body.classList.add("dark-mode");
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    localStorage.setItem("theme", "dark");
  }
}

function checkDarkMode() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const icon = themeToggle.querySelector("i");

  if (savedTheme === "dark" || (savedTheme === null && prefersDark)) {
    document.body.classList.add("dark-mode");
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  }
}

function formatDate(dateString) {
  const options = { month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add animation for delete
document.head.insertAdjacentHTML(
  "beforeend",
  `
<style>
@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-10px);
    }
}
</style>
`
);

// Add event listener for keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Close modal with Escape key
  if (e.key === "Escape" && editTaskModal.classList.contains("active")) {
    closeModal();
  }

  // Add task with Ctrl+Enter from the input field
  if (e.ctrlKey && e.key === "Enter" && document.activeElement === taskInput) {
    taskForm.dispatchEvent(new Event("submit"));
  }
});
