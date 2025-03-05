// Unique localStorage keys
const LS_PREFIX = "ExpBudTracker_";
const LS_INCOMES = LS_PREFIX + "incomes";
const LS_UTILITIES = LS_PREFIX + "utilities";
const LS_BUDGETS = LS_PREFIX + "budgets";

// Data arrays
let incomes = [];
let utilityExpenses = [];
let budgetCategories = [];

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

// Update UI
function updateUI() {
    totalIncomeEl.textContent = incomes.reduce((sum, inc) => sum + inc.amount, 0).toFixed(2);
    totalExpensesEl.textContent = (utilityExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
        budgetCategories.reduce((sum, cat) => sum + cat.expenses.reduce((s, e) => s + e.amount, 0), 0)).toFixed(2);
    
    balanceEl.textContent = (parseFloat(totalIncomeEl.textContent) - parseFloat(totalExpensesEl.textContent)).toFixed(2);
    
    saveData();
}

// Add Income
document.getElementById("income-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("income-amount").value);
    const desc = document.getElementById("income-desc").value;
    
    if (!isNaN(amount) && amount > 0) {
        incomes.push({ id: Date.now(), amount, desc, timestamp: new Date().toLocaleString() });
        updateUI();
    }
});

// Add Utility Expense
document.getElementById("utility-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("utility-amount").value);
    const desc = document.getElementById("utility-desc").value;

    if (!isNaN(amount) && amount > 0) {
        utilityExpenses.push({ id: Date.now(), amount, desc, timestamp: new Date().toLocaleString() });
        updateUI();
    }
});

// Initialize
loadData();
updateUI();
