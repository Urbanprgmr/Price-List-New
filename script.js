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

// Recalculate Totals
function recalculateTotals() {
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalUtility = utilityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalBudgetExpenses = budgetCategories.reduce((sum, cat) => sum + cat.expenses.reduce((s, e) => s + e.amount, 0), 0);
    
    const totalExpenses = totalUtility + totalBudgetExpenses;
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalUtility, totalBudgetExpenses, totalExpenses, balance };
}

// Update UI
function updateUI() {
    const totals = recalculateTotals();

    document.getElementById("total-income").textContent = totals.totalIncome.toFixed(2);
    document.getElementById("total-expenses").textContent = totals.totalExpenses.toFixed(2);
    document.getElementById("balance").textContent = totals.balance.toFixed(2);

    // Update budget categories list
    const budgetsListEl = document.getElementById("budgets-list");
    budgetsListEl.innerHTML = budgetCategories.map(cat => `
        <li>
            <div>${cat.name}</div>
            <div>Assigned: MVR ${cat.allocated.toFixed(2)}</div>
            <div>Used: MVR ${cat.spent.toFixed(2)}</div>
            <div>Remaining: MVR ${cat.remaining.toFixed(2)}</div>
            <div class="budget-bar-container">
                <div class="budget-bar" style="width: ${Math.max((cat.remaining / cat.allocated) * 100, 0)}%"></div>
            </div>
            <button class="tiny-btn" onclick="editBudget(${cat.id})">✏</button>
            <button class="tiny-btn" onclick="deleteBudget(${cat.id})">🗑</button>
        </li>
    `).join("");

    // Update budget category selection in expense form
    const expenseCategorySelect = document.getElementById("expense-category");
    expenseCategorySelect.innerHTML = budgetCategories.length ? 
        budgetCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join("") : 
        `<option disabled selected>No budgets available</option>`;

    // Update unified history
    const historyListEl = document.getElementById("history-list");
    historyListEl.innerHTML = history.map(entry => `
        <li>
            ${entry.timestamp} - ${entry.desc} - MVR ${entry.amount.toFixed(2)}
            <button class="tiny-btn" onclick="deleteHistory(${entry.id})">🗑</button>
        </li>
    `).join("");

    saveData();
}

// Edit Budget (Modify Assigned Amount)
function editBudget(id) {
    const budget = budgetCategories.find(b => b.id === id);
    if (budget) {
        const newAmount = parseFloat(prompt(`Edit budget for ${budget.name} (Current: MVR ${budget.allocated.toFixed(2)})`));
        if (!isNaN(newAmount) && newAmount > 0) {
            budget.allocated = newAmount;
            budget.remaining = newAmount - budget.spent;
            saveData();
            updateUI();
        }
    }
}

// Add Budget Category
document.getElementById("budget-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById("budget-name").value.trim();
    const isPercent = document.querySelector('input[name="budget-type"]:checked').value === "percent";
    const value = parseFloat(document.getElementById("budget-value").value);

    if (!isNaN(value) && value > 0) {
        const newBudget = {
            id: Date.now(),
            name,
            type: isPercent ? "percent" : "fixed",
            value,
            allocated: value,
            spent: 0,
            remaining: value,
            expenses: []
        };
        budgetCategories.push(newBudget);
        history.push({ id: newBudget.id, desc: `Budget Created: ${name}`, amount: value, timestamp: new Date().toLocaleString() });
        saveData();
        updateUI();
    }
});

// Delete Budget
function deleteBudget(id) {
    budgetCategories = budgetCategories.filter(b => b.id !== id);
    history.push({ id, desc: "Budget Deleted", amount: 0, timestamp: new Date().toLocaleString() });
    saveData();
    updateUI();
}

// Initialize App
loadData();
updateUI();
