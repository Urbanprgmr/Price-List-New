// Unique localStorage keys with a distinctive prefix
const LS_PREFIX = "ExpBudTracker_";
const LS_INCOMES = LS_PREFIX + "incomes";
const LS_UTILITIES = LS_PREFIX + "utilities";
const LS_BUDGETS = LS_PREFIX + "budgets";
const LS_HISTORY = LS_PREFIX + "history"; // New key for storing history with timestamps

// Data arrays for incomes, utility expenses, and budget categories
let incomes = [];
let utilityExpenses = [];
let budgetCategories = [];
let history = [];

// Load data from localStorage
function loadData() {
    incomes = JSON.parse(localStorage.getItem(LS_INCOMES)) || [];
    utilityExpenses = JSON.parse(localStorage.getItem(LS_UTILITIES)) || [];
    budgetCategories = JSON.parse(localStorage.getItem(LS_BUDGETS)) || [];
    history = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
}

// Save current data to localStorage
function saveData() {
    localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
    localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
    localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

// Function to generate timestamps
function getTimestamp() {
    return new Date().toLocaleString();
}

// Update the UI
function updateUI() {
    // Update history section
    const historyListEl = document.getElementById("history-list");
    historyListEl.innerHTML = history.length === 0
        ? "<li class='empty'>No history records yet.</li>"
        : history.map(entry => `
            <li>
                <div>
                    <strong>${entry.type}</strong> - ${entry.desc}  
                    <br>Amount: <strong>MVR ${entry.amount.toFixed(2)}</strong>  
                    <br><small>${entry.timestamp}</small>
                </div>
                <button class="tiny-btn" onclick="deleteHistory(${entry.id})">🗑</button>
            </li>
        `).join("");

    saveData();
}

// Add Income
document.getElementById("income-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("income-amount").value);
    const desc = document.getElementById("income-desc").value.trim();

    if (!isNaN(amount) && amount > 0) {
        const newIncome = { id: Date.now(), type: "Income", amount, desc, timestamp: getTimestamp() };
        incomes.push(newIncome);
        history.push(newIncome);
        saveData();
        updateUI();
    }
});

// Add Utility Expense
document.getElementById("utility-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("utility-amount").value);
    const desc = document.getElementById("utility-desc").value.trim();

    if (!isNaN(amount) && amount > 0) {
        const newExpense = { id: Date.now(), type: "Utility Expense", amount, desc, timestamp: getTimestamp() };
        utilityExpenses.push(newExpense);
        history.push(newExpense);
        saveData();
        updateUI();
    }
});

// Add Budget Category
document.getElementById("budget-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById("budget-name").value.trim();
    const value = parseFloat(document.getElementById("budget-value").value);
    const isPercent = document.getElementById("budget-type-percent").checked;

    if (!isNaN(value) && value > 0) {
        const newBudget = {
            id: Date.now(),
            type: "Budget",
            name,
            allocated: isPercent ? 0 : value, // Set allocated to 0 initially for percentage-based budgets
            value,
            spent: 0,
            remaining: value,
            expenses: [],
            desc: `Budget Created: ${name}`,
            timestamp: getTimestamp()
        };
        budgetCategories.push(newBudget);
        history.push(newBudget);
        saveData();
        updateUI();
    }
});

// Add Budget Expense
document.getElementById("budget-expense-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const budgetId = document.getElementById("expense-category").value;
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const desc = document.getElementById("expense-desc").value.trim();

    if (!isNaN(amount) && amount > 0) {
        const budget = budgetCategories.find(b => b.id == budgetId);
        if (budget) {
            const newExpense = { id: Date.now(), type: "Budget Expense", amount, desc, timestamp: getTimestamp() };
            budget.expenses.push(newExpense);
            budget.spent += amount;
            budget.remaining -= amount;
            history.push({ ...newExpense, desc: `Expense in ${budget.name}: ${desc}` });
            saveData();
            updateUI();
        }
    }
});

// Delete History Entry
function deleteHistory(id) {
    history = history.filter(h => h.id !== id);
    saveData();
    updateUI();
}

// Initialize App
loadData();
updateUI();
