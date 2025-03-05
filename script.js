// Unique localStorage keys
const LS_PREFIX = "BudgetApp_";
const LS_INCOMES = LS_PREFIX + "incomes";
const LS_UTILITIES = LS_PREFIX + "utilities";
const LS_BUDGETS = LS_PREFIX + "budgets";

// Data Arrays
let incomes = [], utilityExpenses = [], budgetCategories = [];

// Load Data
function loadData() {
    incomes = JSON.parse(localStorage.getItem(LS_INCOMES)) || [];
    utilityExpenses = JSON.parse(localStorage.getItem(LS_UTILITIES)) || [];
    budgetCategories = JSON.parse(localStorage.getItem(LS_BUDGETS)) || [];
}

// Save Data
function saveData() {
    localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
    localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
    localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
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

    // Update income list
    const incomeListEl = document.getElementById("income-list");
    incomeListEl.innerHTML = incomes.map(inc => `
        <li>
            ${inc.desc ? inc.desc + " - " : ""}MVR ${inc.amount.toFixed(2)} 
            (Added: ${inc.timestamp})
            <button class="small-btn" onclick="deleteIncome(${inc.id})">🗑</button>
        </li>
    `).join("");

    // Update utility list
    const utilityListEl = document.getElementById("utility-list");
    utilityListEl.innerHTML = utilityExpenses.map(exp => `
        <li>
            ${exp.desc ? exp.desc + " - " : ""}MVR ${exp.amount.toFixed(2)} 
            (Added: ${exp.timestamp})
            <button class="small-btn" onclick="deleteUtility(${exp.id})">🗑</button>
        </li>
    `).join("");

    // Update budget categories list
    const budgetsListEl = document.getElementById("budgets-list");
    budgetsListEl.innerHTML = budgetCategories.map(cat => `
        <li>
            ${cat.name} - Allocated: MVR ${cat.allocated.toFixed(2)}, Spent: MVR ${cat.spent.toFixed(2)}, Remaining: MVR ${cat.remaining.toFixed(2)}
            <button class="small-btn" onclick="deleteBudget(${cat.id})">🗑</button>
        </li>
    `).join("");

    // Update budget category selection in expense form
    const expenseCategorySelect = document.getElementById("expense-category");
    expenseCategorySelect.innerHTML = budgetCategories.map(cat => `
        <option value="${cat.id}">${cat.name}</option>
    `).join("");

    saveData();
}

// Add Income
document.getElementById("income-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("income-amount").value);
    const desc = document.getElementById("income-desc").value.trim();
    
    if (!isNaN(amount) && amount > 0) {
        incomes.push({ id: Date.now(), amount, desc, timestamp: new Date().toLocaleString() });
        saveData();
        updateUI();
    }
});

// Delete Income
function deleteIncome(id) {
    incomes = incomes.filter(i => i.id !== id);
    updateUI();
}

// Add Utility Expense
document.getElementById("utility-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("utility-amount").value);
    const desc = document.getElementById("utility-desc").value.trim();

    if (!isNaN(amount) && amount > 0) {
        utilityExpenses.push({ id: Date.now(), amount, desc, timestamp: new Date().toLocaleString() });
        saveData();
        updateUI();
    }
});

// Delete Utility Expense
function deleteUtility(id) {
    utilityExpenses = utilityExpenses.filter(x => x.id !== id);
    updateUI();
}

// Add Budget Category
document.getElementById("budget-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById("budget-name").value.trim();
    const isPercent = document.querySelector('input[name="budget-type"]:checked').value === "percent";
    const value = parseFloat(document.getElementById("budget-value").value);

    if (!isNaN(value) && value > 0) {
        budgetCategories.push({
            id: Date.now(),
            name,
            type: isPercent ? "percent" : "fixed",
            value,
            allocated: 0,
            spent: 0,
            remaining: 0,
            expenses: []
        });
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
            budget.expenses.push({ id: Date.now(), amount, desc });
            budget.spent += amount;
            budget.remaining -= amount;
            saveData();
            updateUI();
        }
    }
});

// Restore Local Storage
document.getElementById("restore-storage").addEventListener("click", function() {
    if (confirm("Are you sure you want to restore previous data?")) {
        loadData();
        updateUI();
    }
});

// Initialize App
loadData();
updateUI();
