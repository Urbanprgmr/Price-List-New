// Unique localStorage keys with a distinctive prefix
const LS_PREFIX = "ExpBudTracker_";
const LS_INCOMES = LS_PREFIX + "incomes";
const LS_UTILITIES = LS_PREFIX + "utilities";
const LS_BUDGETS = LS_PREFIX + "budgets";

// Data arrays for incomes, utility expenses, and budget categories
let incomes = [];
let utilityExpenses = [];
let budgetCategories = [];

// Edit mode flags and IDs
let editIncomeId = null;
let editUtilityId = null;
let editBudgetExpId = null;
let editBudgetExpOrigCatId = null;

// Get references to form elements and lists
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const balanceEl = document.getElementById("balance");
const budgetsListEl = document.getElementById("budgets-list");

const incomeForm = document.getElementById("income-form");
const incomeAmountInput = document.getElementById("income-amount");
const incomeDescInput = document.getElementById("income-desc");
const incomeSubmitBtn = document.getElementById("income-submit-btn");

const utilityForm = document.getElementById("utility-form");
const utilityAmountInput = document.getElementById("utility-amount");
const utilityDescInput = document.getElementById("utility-desc");
const utilitySubmitBtn = document.getElementById("utility-submit-btn");

const budgetExpenseForm = document.getElementById("budget-expense-form");
const expenseCategorySelect = document.getElementById("expense-category");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDescInput = document.getElementById("expense-desc");
const expenseSubmitBtn = document.getElementById("expense-submit-btn");

const incomeListEl = document.getElementById("income-list");
const utilityListEl = document.getElementById("utility-list");
const budgetExpenseListContainer = document.getElementById("budget-expense-list");

// Load data from localStorage
function loadData() {
    incomes = JSON.parse(localStorage.getItem(LS_INCOMES)) || [];
    utilityExpenses = JSON.parse(localStorage.getItem(LS_UTILITIES)) || [];
    budgetCategories = JSON.parse(localStorage.getItem(LS_BUDGETS)) || [];
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
    localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
    localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
}

// Recalculate budget allocations and totals
function recalculateTotals() {
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalUtility = utilityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalBudgetExpenses = budgetCategories.reduce((sum, cat) => sum + cat.expenses.reduce((s, exp) => s + exp.amount, 0), 0);
    
    const totalExpenses = totalUtility + totalBudgetExpenses;
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalUtility, totalBudgetExpenses, totalExpenses, balance };
}

// Update UI
function updateUI() {
    const totals = recalculateTotals();

    totalIncomeEl.textContent = totals.totalIncome.toFixed(2);
    totalExpensesEl.textContent = totals.totalExpenses.toFixed(2);
    balanceEl.textContent = totals.balance.toFixed(2);

    // Update income list with edit/delete buttons
    incomeListEl.innerHTML = incomes.map(inc => `
        <li>
            ${inc.desc ? inc.desc + " - " : ""}MVR ${inc.amount.toFixed(2)} 
            (Added: ${inc.timestamp})
            <button onclick="editIncome(${inc.id})">Edit</button>
            <button onclick="deleteIncome(${inc.id})">Delete</button>
        </li>
    `).join("");

    // Update utility list with edit/delete buttons
    utilityListEl.innerHTML = utilityExpenses.map(exp => `
        <li>
            ${exp.desc ? exp.desc + " - " : ""}MVR ${exp.amount.toFixed(2)} 
            (Added: ${exp.timestamp})
            <button onclick="editUtility(${exp.id})">Edit</button>
            <button onclick="deleteUtility(${exp.id})">Delete</button>
        </li>
    `).join("");

    saveData();
}

// Add Income
incomeForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(incomeAmountInput.value);
    if (isNaN(amount) || amount <= 0) return alert("Enter valid amount.");

    const desc = incomeDescInput.value.trim();
    const timestamp = new Date().toLocaleString();

    if (editIncomeId === null) {
        incomes.push({ id: Date.now(), amount, desc, timestamp });
    } else {
        const income = incomes.find(i => i.id === editIncomeId);
        income.amount = amount;
        income.desc = desc;
        income.timestamp = timestamp;
        editIncomeId = null;
        incomeSubmitBtn.textContent = "Add Income";
    }
    incomeAmountInput.value = "";
    incomeDescInput.value = "";
    updateUI();
});

// Delete Income
function deleteIncome(id) {
    incomes = incomes.filter(i => i.id !== id);
    updateUI();
}

// Add Utility Expense
utilityForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(utilityAmountInput.value);
    if (isNaN(amount) || amount <= 0) return alert("Enter valid amount.");

    const desc = utilityDescInput.value.trim();
    const timestamp = new Date().toLocaleString();

    if (editUtilityId === null) {
        utilityExpenses.push({ id: Date.now(), amount, desc, timestamp });
    } else {
        const expense = utilityExpenses.find(x => x.id === editUtilityId);
        expense.amount = amount;
        expense.desc = desc;
        expense.timestamp = timestamp;
        editUtilityId = null;
        utilitySubmitBtn.textContent = "Add Expense";
    }
    utilityAmountInput.value = "";
    utilityDescInput.value = "";
    updateUI();
});

// Delete Utility Expense
function deleteUtility(id) {
    utilityExpenses = utilityExpenses.filter(x => x.id !== id);
    updateUI();
}

// Initialize app on page load
loadData();
updateUI();
