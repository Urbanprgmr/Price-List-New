// Unique localStorage keys
const LS_PREFIX = "BudgetApp_";
const LS_INCOMES = LS_PREFIX + "incomes";
const LS_UTILITIES = LS_PREFIX + "utilities";
const LS_BUDGETS = LS_PREFIX + "budgets";
const LS_HISTORY = LS_PREFIX + "history"; // Unified history

// Data Arrays
let incomes = [], utilityExpenses = [], budgetCategories = [], history = [];

// Load Data
function loadData() {
    incomes = JSON.parse(localStorage.getItem(LS_INCOMES)) || [];
    utilityExpenses = JSON.parse(localStorage.getItem(LS_UTILITIES)) || [];
    budgetCategories = JSON.parse(localStorage.getItem(LS_BUDGETS)) || [];
    history = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
}

// Save Data
function saveData() {
    localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
    localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
    localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

// Update UI
function updateUI() {
    // Update History Section with Detailed Breakdown
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

    // Update budget category selection in expense form
    const expenseCategorySelect = document.getElementById("expense-category");
    expenseCategorySelect.innerHTML = budgetCategories.length ? 
        budgetCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join("") : 
        `<option disabled selected>No budgets available</option>`;

    saveData();
}

// Add Income
document.getElementById("income-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("income-amount").value);
    const desc = document.getElementById("income-desc").value.trim();
    
    if (!isNaN(amount) && amount > 0) {
        const newIncome = { id: Date.now(), type: "Income", amount, desc, timestamp: new Date().toLocaleString() };
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
        const newExpense = { id: Date.now(), type: "Utility Expense", amount, desc, timestamp: new Date().toLocaleString() };
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
    const isPercent = document.querySelector('input[name="budget-type"]:checked').value === "percent";
    const value = parseFloat(document.getElementById("budget-value").value);

    if (!isNaN(value) && value > 0) {
        const newBudget = {
            id: Date.now(),
            type: "Budget",
            name,
            allocated: value,
            spent: 0,
            remaining: value,
            expenses: [],
            desc: `Budget Created: ${name}`,
            timestamp: new Date().toLocaleString()
        };
        budgetCategories.push(newBudget);
        history.push(newBudget);
        saveData();
        updateUI();
    }
});

// Add Expense to Budget
document.getElementById("budget-expense-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const budgetId = document.getElementById("expense-category").value;
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const desc = document.getElementById("expense-desc").value.trim();

    if (!isNaN(amount) && amount > 0) {
        const budget = budgetCategories.find(b => b.id == budgetId);
        if (budget) {
            const newExpense = { id: Date.now(), type: "Budget Expense", amount, desc, timestamp: new Date().toLocaleString() };
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
