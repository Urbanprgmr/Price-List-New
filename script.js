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
let editBudgetExpOrigCatId = null;  // store original category of budget expense being edited

// Get references to form elements and lists
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const balanceEl = document.getElementById("balance");
const budgetsListEl = document.getElementById("budgets-list");

const incomeForm = document.getElementById("income-form");
const incomeAmountInput = document.getElementById("income-amount");
const incomeDescInput = document.getElementById("income-desc");
const incomeSubmitBtn = document.getElementById("income-submit-btn");
const incomeCancelBtn = document.getElementById("income-cancel-btn");

const utilityForm = document.getElementById("utility-form");
const utilityAmountInput = document.getElementById("utility-amount");
const utilityDescInput = document.getElementById("utility-desc");
const utilitySubmitBtn = document.getElementById("utility-submit-btn");
const utilityCancelBtn = document.getElementById("utility-cancel-btn");

const budgetForm = document.getElementById("budget-form");
const budgetNameInput = document.getElementById("budget-name");
const budgetTypeFixedRadio = document.getElementById("budget-type-fixed");
const budgetTypePercentRadio = document.getElementById("budget-type-percent");
const budgetValueInput = document.getElementById("budget-value");
const budgetSubmitBtn = document.getElementById("budget-submit-btn");

const budgetExpenseForm = document.getElementById("budget-expense-form");
const expenseCategorySelect = document.getElementById("expense-category");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDescInput = document.getElementById("expense-desc");
const expenseSubmitBtn = document.getElementById("expense-submit-btn");
const expenseCancelBtn = document.getElementById("expense-cancel-btn");

const incomeListEl = document.getElementById("income-list");
const utilityListEl = document.getElementById("utility-list");
const budgetExpenseListContainer = document.getElementById("budget-expense-list");

// Load data from localStorage
function loadData() {
  const incomesData = localStorage.getItem(LS_INCOMES);
  const utilitiesData = localStorage.getItem(LS_UTILITIES);
  const budgetsData = localStorage.getItem(LS_BUDGETS);
  if (incomesData) {
    try { 
      incomes = JSON.parse(incomesData) || [];
      incomes.forEach(inc => {
        if (!inc.timestamp) {
          inc.timestamp = new Date().toLocaleString();
        }
      });
    } catch(e) { incomes = []; }
  }
  if (utilitiesData) {
    try { 
      utilityExpenses = JSON.parse(utilitiesData) || [];
      utilityExpenses.forEach(exp => {
        if (!exp.timestamp) {
          exp.timestamp = new Date().toLocaleString();
        }
      });
    } catch(e) { utilityExpenses = []; }
  }
  if (budgetsData) {
    try { 
      budgetCategories = JSON.parse(budgetsData) || [];
      budgetCategories.forEach(cat => {
        cat.expenses.forEach(exp => {
          if (!exp.timestamp) {
            exp.timestamp = new Date().toLocaleString();
          }
        });
      });
    } catch(e) { budgetCategories = []; }
  }
}

// Save current data to localStorage
function saveData() {
  localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
  localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
  localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
}

// Utility function to generate a unique ID
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Add Income
incomeForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const amountVal = parseFloat(incomeAmountInput.value);
  if (isNaN(amountVal) || amountVal <= 0) {
    alert("Please enter a valid income amount.");
    return;
  }
  const descVal = incomeDescInput.value.trim();
  if (editIncomeId === null) {
    const newIncome = {
      id: generateId(),
      amount: amountVal,
      desc: descVal,
      timestamp: new Date().toLocaleString()
    };
    incomes.push(newIncome);
  } else {
    const inc = incomes.find(i => i.id === editIncomeId);
    if (inc) {
      inc.amount = amountVal;
      inc.desc = descVal;
      inc.timestamp = new Date().toLocaleString();
    }
    editIncomeId = null;
    incomeSubmitBtn.textContent = "Add Income";
    incomeCancelBtn.style.display = "none";
  }
  incomeAmountInput.value = "";
  incomeDescInput.value = "";
  updateUI();
});

// Add Utility Expense
utilityForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const amountVal = parseFloat(utilityAmountInput.value);
  if (isNaN(amountVal) || amountVal <= 0) {
    alert("Please enter a valid expense amount.");
    return;
  }
  const descVal = utilityDescInput.value.trim();
  if (editUtilityId === null) {
    const newExp = {
      id: generateId(),
      amount: amountVal,
      desc: descVal,
      timestamp: new Date().toLocaleString()
    };
    utilityExpenses.push(newExp);
  } else {
    const exp = utilityExpenses.find(x => x.id === editUtilityId);
    if (exp) {
      exp.amount = amountVal;
      exp.desc = descVal;
      exp.timestamp = new Date().toLocaleString();
    }
    editUtilityId = null;
    utilitySubmitBtn.textContent = "Add Expense";
    utilityCancelBtn.style.display = "none";
  }
  utilityAmountInput.value = "";
  utilityDescInput.value = "";
  updateUI();
});

// Add Budget Expense
budgetExpenseForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const catId = expenseCategorySelect.value;
  const amountVal = parseFloat(expenseAmountInput.value);
  if (isNaN(amountVal) || amountVal <= 0) {
    alert("Please enter a valid expense amount.");
    return;
  }
  const descVal = expenseDescInput.value.trim();
  const cat = budgetCategories.find(c => c.id == catId);
  if (cat) {
    const newExp = {
      id: generateId(),
      amount: amountVal,
      desc: descVal,
      timestamp: new Date().toLocaleString()
    };
    cat.expenses.push(newExp);
  }
  expenseCategorySelect.selectedIndex = 0;
  expenseAmountInput.value = "";
  expenseDescInput.value = "";
  updateUI();
});

// Update UI to show timestamps
function updateUI() {
  incomeListEl.innerHTML = incomes.map(inc => 
    `<li>${inc.desc ? inc.desc + " - " : ""}MVR ${inc.amount.toFixed(2)} (Added: ${inc.timestamp})</li>`).join("");

  utilityListEl.innerHTML = utilityExpenses.map(exp => 
    `<li>${exp.desc ? exp.desc + " - " : ""}MVR ${exp.amount.toFixed(2)} (Added: ${exp.timestamp})</li>`).join("");

  budgetExpenseListContainer.innerHTML = budgetCategories.map(cat => 
    cat.expenses.map(exp => 
      `<li>${exp.desc ? exp.desc + " - " : ""}MVR ${exp.amount.toFixed(2)} (Added: ${exp.timestamp})</li>`).join("")).join("");
  
  saveData();
}

// Initialize app
loadData();
updateUI();
