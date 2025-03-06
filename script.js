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
    try { incomes = JSON.parse(incomesData) || []; } catch(e) { incomes = []; }
  }
  if (utilitiesData) {
    try { utilityExpenses = JSON.parse(utilitiesData) || []; } catch(e) { utilityExpenses = []; }
  }
  if (budgetsData) {
    try { budgetCategories = JSON.parse(budgetsData) || []; } catch(e) { budgetCategories = []; }
  }
}

// Save current data to localStorage
function saveData() {
  localStorage.setItem(LS_INCOMES, JSON.stringify(incomes));
  localStorage.setItem(LS_UTILITIES, JSON.stringify(utilityExpenses));
  localStorage.setItem(LS_BUDGETS, JSON.stringify(budgetCategories));
}

// Recalculate budget allocations (for percent-based budgets) and all totals
function recalcBudgetsAndTotals() {
  // Calculate total income and total utilities
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalUtility = utilityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  // Remaining income after utilities (for percentage allocations)
  let remainingIncome = totalIncome - totalUtility;
  if (remainingIncome < 0) remainingIncome = 0;
  // Recalculate each budget category
  for (let cat of budgetCategories) {
    if (cat.type === 'percent') {
      // Allocate percentage of remaining income
      cat.allocated = (remainingIncome * cat.value) / 100;
    } else {
      // Fixed amount
      cat.allocated = cat.value;
    }
    // Recalculate spent and remaining for the category
    cat.spent = cat.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    cat.remaining = cat.allocated - cat.spent;
  }
  // Calculate total expenses (utilities + all budget expenses) and balance
  const totalBudgetExpenses = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const totalExpenses = totalUtility + totalBudgetExpenses;
  const totalBalance = totalIncome - totalExpenses;
  return { totalIncome, totalUtility, totalBudgetExpenses, totalExpenses, totalBalance };
}

// Update the entire UI (summary, budgets, lists) based on current state
function updateUI() {
  // Recalculate dynamic values
  const totals = recalcBudgetsAndTotals();
  // Update summary fields
  totalIncomeEl.textContent = totals.totalIncome.toFixed(2);
  totalExpensesEl.textContent = totals.totalExpenses.toFixed(2);
  balanceEl.textContent = totals.totalBalance.toFixed(2);
  
  // Update budget categories summary list
  budgetsListEl.innerHTML = "";
  if (budgetCategories.length === 0) {
    // No budget categories yet
    const li = document.createElement("li");
    li.classList.add("empty");
    li.textContent = "No budgets set.";
    budgetsListEl.appendChild(li);
  } else {
    for (let cat of budgetCategories) {
      const li = document.createElement("li");
      // Check if overspent (remaining negative) to mark
      if (cat.remaining < 0) {
        li.classList.add("over-budget");
      }
      // Budget name and type label
      const nameSpan = document.createElement("span");
      nameSpan.className = "budget-name";
      nameSpan.textContent = cat.name;
      // Add type label (percent or fixed)
      if (cat.type === 'percent') {
        nameSpan.textContent += ` [${cat.value}%]`;
      } else {
        nameSpan.textContent += ` [Fixed]`;
      }
      li.appendChild(nameSpan);
      // Budget details (allocated, spent, remaining)
      const detailsSpan = document.createElement("span");
      detailsSpan.className = "budget-details";
      detailsSpan.innerHTML = ` - Allocated: MVR ${cat.allocated.toFixed(2)}, Spent: MVR ${cat.spent.toFixed(2)}, Remaining: MVR <span class="remaining-amount">${cat.remaining.toFixed(2)}</span>`;
      li.appendChild(detailsSpan);
      // Progress bar
      const barContainer = document.createElement("div");
      barContainer.className = "budget-bar";
      const barInner = document.createElement("div");
      barInner.className = "bar-inner";
      // Calculate bar fill percentage
      let fillPercent;
      if (cat.allocated > 0) {
        fillPercent = (cat.spent / cat.allocated) * 100;
        if (fillPercent > 100) fillPercent = 100;
      } else {
        fillPercent = cat.spent > 0 ? 100 : 0;
      }
      barInner.style.width = fillPercent + "%";
      // If overspent, bar will be colored via CSS (li.over-budget .bar-inner)
      barContainer.appendChild(barInner);
      li.appendChild(barContainer);
      budgetsListEl.appendChild(li);
    }
  }
  
  // Update category options in "Add Budget Expense" form
  expenseCategorySelect.innerHTML = "";
  if (budgetCategories.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No categories available";
    opt.disabled = true;
    opt.selected = true;
    expenseCategorySelect.appendChild(opt);
    expenseAmountInput.disabled = true;
    expenseDescInput.disabled = true;
    expenseSubmitBtn.disabled = true;
  } else {
    expenseAmountInput.disabled = false;
    expenseDescInput.disabled = false;
    expenseSubmitBtn.disabled = false;
    for (let cat of budgetCategories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      expenseCategorySelect.appendChild(opt);
    }
  }
  
  // Update incomes list
  incomeListEl.innerHTML = "";
  if (incomes.length === 0) {
    const li = document.createElement("li");
    li.classList.add("empty");
    li.textContent = "No incomes added.";
    incomeListEl.appendChild(li);
  } else {
    for (let inc of incomes) {
      const li = document.createElement("li");
      li.dataset.id = inc.id;
      const textSpan = document.createElement("span");
      textSpan.className = "entry-text";
      // Display description if available, otherwise just amount
      if (inc.desc && inc.desc.trim() !== "") {
        textSpan.textContent = `${inc.desc} - MVR ${inc.amount.toFixed(2)}`;
      } else {
        textSpan.textContent = `MVR ${inc.amount.toFixed(2)}`;
      }
      li.appendChild(textSpan);
      // Actions (edit, delete)
      const actionsSpan = document.createElement("span");
      actionsSpan.className = "entry-actions";
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";  // pencil emoji for edit
      editBtn.title = "Edit";
      editBtn.className = "edit-btn";
      editBtn.dataset.id = inc.id;
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";  // trash can emoji for delete
      deleteBtn.title = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.dataset.id = inc.id;
      actionsSpan.appendChild(editBtn);
      actionsSpan.appendChild(deleteBtn);
      li.appendChild(actionsSpan);
      incomeListEl.appendChild(li);
    }
  }
  
  // Update utility expenses list
  utilityListEl.innerHTML = "";
  if (utilityExpenses.length === 0) {
    const li = document.createElement("li");
    li.classList.add("empty");
    li.textContent = "No utility expenses added.";
    utilityListEl.appendChild(li);
  } else {
    for (let exp of utilityExpenses) {
      const li = document.createElement("li");
      li.dataset.id = exp.id;
      const textSpan = document.createElement("span");
      textSpan.className = "entry-text";
      if (exp.desc && exp.desc.trim() !== "") {
        textSpan.textContent = `${exp.desc} - MVR ${exp.amount.toFixed(2)}`;
      } else {
        textSpan.textContent = `MVR ${exp.amount.toFixed(2)}`;
      }
      li.appendChild(textSpan);
      // Actions
      const actionsSpan = document.createElement("span");
      actionsSpan.className = "entry-actions";
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "Edit";
      editBtn.className = "edit-btn";
      editBtn.dataset.id = exp.id;
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.dataset.id = exp.id;
      actionsSpan.appendChild(editBtn);
      actionsSpan.appendChild(deleteBtn);
      li.appendChild(actionsSpan);
      utilityListEl.appendChild(li);
    }
  }
  
  // Update budget expenses history (grouped by category)
  budgetExpenseListContainer.innerHTML = "";
  let anyBudgetExpense = false;
  for (let cat of budgetCategories) {
    if (cat.expenses.length > 0) {
      anyBudgetExpense = true;
      const catGroupDiv = document.createElement("div");
      catGroupDiv.className = "category-group";
      const titleDiv = document.createElement("div");
      titleDiv.className = "category-title";
      titleDiv.textContent = cat.name;
      catGroupDiv.appendChild(titleDiv);
      const ul = document.createElement("ul");
      for (let exp of cat.expenses) {
        const li = document.createElement("li");
        li.dataset.id = exp.id;
        li.dataset.catId = cat.id;
        const textSpan = document.createElement("span");
        textSpan.className = "entry-text";
        if (exp.desc && exp.desc.trim() !== "") {
          textSpan.textContent = `${exp.desc} - MVR ${exp.amount.toFixed(2)}`;
        } else {
          textSpan.textContent = `MVR ${exp.amount.toFixed(2)}`;
        }
        li.appendChild(textSpan);
        // Actions
        const actionsSpan = document.createElement("span");
        actionsSpan.className = "entry-actions";
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.title = "Edit";
        editBtn.className = "edit-btn";
        editBtn.dataset.id = exp.id;
        editBtn.dataset.catId = cat.id;
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.dataset.id = exp.id;
        deleteBtn.dataset.catId = cat.id;
        actionsSpan.appendChild(editBtn);
        actionsSpan.appendChild(deleteBtn);
        li.appendChild(actionsSpan);
        ul.appendChild(li);
      }
      catGroupDiv.appendChild(ul);
      budgetExpenseListContainer.appendChild(catGroupDiv);
    }
  }
  if (!anyBudgetExpense) {
    const p = document.createElement("p");
    p.classList.add("empty");
    p.textContent = "No budget expenses recorded yet.";
    budgetExpenseListContainer.appendChild(p);
  }
  
  // Save updated state to localStorage
  saveData();
}

// Utility function to generate a unique ID (number) based on timestamp
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
    // Add new income entry
    const newIncome = {
      id: generateId(),
      amount: amountVal,
      desc: descVal
    };
    incomes.push(newIncome);
  } else {
    // Update existing income entry
    const inc = incomes.find(i => i.id === editIncomeId);
    if (inc) {
      inc.amount = amountVal;
      inc.desc = descVal;
    }
    // Reset edit mode
    editIncomeId = null;
    incomeSubmitBtn.textContent = "Add Income";
    incomeCancelBtn.style.display = "none";
  }
  // Clear form fields
  incomeAmountInput.value = "";
  incomeDescInput.value = "";
  // Update UI and data
  updateUI();
});

// Cancel editing income
incomeCancelBtn.addEventListener("click", function() {
  editIncomeId = null;
  incomeAmountInput.value = "";
  incomeDescInput.value = "";
  incomeSubmitBtn.textContent = "Add Income";
  incomeCancelBtn.style.display = "none";
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
      desc: descVal
    };
    utilityExpenses.push(newExp);
  } else {
    const exp = utilityExpenses.find(x => x.id === editUtilityId);
    if (exp) {
      exp.amount = amountVal;
      exp.desc = descVal;
    }
    editUtilityId = null;
    utilitySubmitBtn.textContent = "Add Expense";
    utilityCancelBtn.style.display = "none";
  }
  utilityAmountInput.value = "";
  utilityDescInput.value = "";
  updateUI();
});

// Cancel editing utility expense
utilityCancelBtn.addEventListener("click", function() {
  editUtilityId = null;
  utilityAmountInput.value = "";
  utilityDescInput.value = "";
  utilitySubmitBtn.textContent = "Add Expense";
  utilityCancelBtn.style.display = "none";
});

// Add Budget Category
budgetForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const nameVal = budgetNameInput.value.trim();
  if (nameVal === "") {
    alert("Please enter a category name.");
    return;
  }
  const isPercent = budgetTypePercentRadio.checked;
  const valueVal = parseFloat(budgetValueInput.value);
  if (isNaN(valueVal) || valueVal <= 0) {
    alert("Please enter a valid budget value.");
    return;
  }
  const newCat = {
    id: generateId(),
    name: nameVal,
    type: isPercent ? "percent" : "fixed",
    value: valueVal,
    allocated: 0,
    spent: 0,
    remaining: 0,
    expenses: []
  };
  budgetCategories.push(newCat);
  // Clear form
  budgetNameInput.value = "";
  budgetTypeFixedRadio.checked = true;
  budgetTypePercentRadio.checked = false;
  budgetValueInput.value = "";
  // Update UI (which will recalc allocations for percent)
  updateUI();
});

// Add Budget Expense
budgetExpenseForm.addEventListener("submit", function(e) {
  e.preventDefault();
  if (budgetCategories.length === 0) {
    alert("Please add a budget category first.");
    return;
  }
  const catId = expenseCategorySelect.value;
  const amountVal = parseFloat(expenseAmountInput.value);
  if (isNaN(amountVal) || amountVal <= 0) {
    alert("Please enter a valid expense amount.");
    return;
  }
  const descVal = expenseDescInput.value.trim();
  if (editBudgetExpId === null) {
    // Add new budget expense
    const cat = budgetCategories.find(c => c.id == catId);
    if (cat) {
      const newExp = {
        id: generateId(),
        amount: amountVal,
        desc: descVal
      };
      cat.expenses.push(newExp);
    }
  } else {
    // Update existing budget expense
    let origCat = budgetCategories.find(c => c.id === editBudgetExpOrigCatId);
    let expenseObj = null;
    if (origCat) {
      expenseObj = origCat.expenses.find(exp => exp.id === editBudgetExpId);
    }
    const newCat = budgetCategories.find(c => c.id == catId);
    if (expenseObj) {
      // If category changed
      if (!newCat || newCat.id !== editBudgetExpOrigCatId) {
        // Remove from original category
        if (origCat) {
          origCat.expenses = origCat.expenses.filter(exp => exp.id !== editBudgetExpId);
        }
        // Add to new category
        if (newCat) {
          // Keep same id for continuity
          expenseObj.amount = amountVal;
          expenseObj.desc = descVal;
          expenseObj.id = editBudgetExpId;
          newCat.expenses.push(expenseObj);
        }
      } else {
        // Category unchanged, just update values
        expenseObj.amount = amountVal;
        expenseObj.desc = descVal;
      }
    }
    // Reset edit mode
    editBudgetExpId = null;
    editBudgetExpOrigCatId = null;
    expenseSubmitBtn.textContent = "Add Expense";
    expenseCancelBtn.style.display = "none";
  }
  // Clear form fields
  expenseCategorySelect.selectedIndex = 0;
  expenseAmountInput.value = "";
  expenseDescInput.value = "";
  // Update UI
  updateUI();
});

// Cancel editing budget expense
expenseCancelBtn.addEventListener("click", function() {
  editBudgetExpId = null;
  editBudgetExpOrigCatId = null;
  expenseAmountInput.value = "";
  expenseDescInput.value = "";
  expenseSubmitBtn.textContent = "Add Expense";
  expenseCancelBtn.style.display = "none";
});

// Handle edit/delete button clicks in lists using event delegation
incomeListEl.addEventListener("click", function(e) {
  if (e.target.classList.contains("edit-btn")) {
    const id = Number(e.target.dataset.id);
    const inc = incomes.find(i => i.id === id);
    if (inc) {
      // Populate form for editing
      incomeAmountInput.value = inc.amount;
      incomeDescInput.value = inc.desc || "";
      editIncomeId = id;
      incomeSubmitBtn.textContent = "Update Income";
      incomeCancelBtn.style.display = "inline-block";
    }
  } else if (e.target.classList.contains("delete-btn")) {
    const id = Number(e.target.dataset.id);
    // Remove income by id
    incomes = incomes.filter(i => i.id !== id);
    updateUI();
  }
});

utilityListEl.addEventListener("click", function(e) {
  if (e.target.classList.contains("edit-btn")) {
    const id = Number(e.target.dataset.id);
    const exp = utilityExpenses.find(x => x.id === id);
    if (exp) {
      utilityAmountInput.value = exp.amount;
      utilityDescInput.value = exp.desc || "";
      editUtilityId = id;
      utilitySubmitBtn.textContent = "Update Expense";
      utilityCancelBtn.style.display = "inline-block";
    }
  } else if (e.target.classList.contains("delete-btn")) {
    const id = Number(e.target.dataset.id);
    utilityExpenses = utilityExpenses.filter(x => x.id !== id);
    updateUI();
  }
});

budgetExpenseListContainer.addEventListener("click", function(e) {
  if (e.target.classList.contains("edit-btn")) {
    const expId = Number(e.target.dataset.id);
    const catId = Number(e.target.dataset.catId);
    // Find the category and expense
    const cat = budgetCategories.find(c => c.id === catId);
    const exp = cat ? cat.expenses.find(x => x.id === expId) : null;
    if (cat && exp) {
      // Populate form for editing
      expenseCategorySelect.value = catId;
      expenseAmountInput.value = exp.amount;
      expenseDescInput.value = exp.desc || "";
      editBudgetExpId = expId;
      editBudgetExpOrigCatId = catId;
      expenseSubmitBtn.textContent = "Update Expense";
      expenseCancelBtn.style.display = "inline-block";
    }
  } else if (e.target.classList.contains("delete-btn")) {
    const expId = Number(e.target.dataset.id);
    const catId = Number(e.target.dataset.catId);
    // Find category and remove the expense
    const cat = budgetCategories.find(c => c.id === catId);
    if (cat) {
      cat.expenses = cat.expenses.filter(x => x.id !== expId);
    }
    updateUI();
  }
});

// Initialize app on page load
loadData();
updateUI();
