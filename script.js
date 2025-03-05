// Utility functions
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

// Load stored data or initialize empty
let incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
let categories = JSON.parse(localStorage.getItem('categories') || '[]');
let logs = JSON.parse(localStorage.getItem('logs') || '[]');
let savingGoal = JSON.parse(localStorage.getItem('savingGoal') || 'null');

// Edit mode flags
let editingIncomeId = null;
let editingExpenseId = null;
let editingCategoryId = null;

// DOM elements
const incomeListElem = document.getElementById('income-list');
const expenseListElem = document.getElementById('expense-list');
const budgetsListElem = document.getElementById('budgets-list');
const logListElem = document.getElementById('log-list');
const noCategoryMsgElem = document.getElementById('no-category-msg');
const summaryElem = document.getElementById('summary');
const incomeForm = document.getElementById('income-form');
const expenseForm = document.getElementById('expense-form');
const categoryForm = document.getElementById('category-form');
const goalForm = document.getElementById('goal-form');
const goalTypeSelect = document.getElementById('goal-type');
const goalValueInput = document.getElementById('goal-value');

// Helper to get month key "YYYY-MM"
function getMonthKey(date = new Date()) {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  return y + '-' + (m < 10 ? '0' + m : m);
}

// Monthly rollover: carry forward any leftover budget
const currentMonth = getMonthKey();
let lastProcessedMonth = localStorage.getItem('lastProcessedMonth');
if (!lastProcessedMonth) {
  localStorage.setItem('lastProcessedMonth', currentMonth);
} else if (lastProcessedMonth !== currentMonth) {
  const nowTime = Date.now();
  categories.forEach(cat => {
    // Calculate spending in this category for lastProcessedMonth
    let spent = 0;
    expenses.forEach(exp => {
      if (exp.category === cat.name && exp.month === lastProcessedMonth) {
        spent += Number(exp.amount);
      }
    });
    const totalBudgetLast = cat.baseBudget + (cat.carry || 0);
    let leftover = totalBudgetLast - spent;
    if (leftover < 0) leftover = 0;
    if (leftover > 0) {
      // carry leftover to next month
      cat.carry = (cat.carry || 0) + leftover;
      logs.push({
        message: `Carried forward MVR ${leftover.toFixed(2)} in "${cat.name}" from ${lastProcessedMonth} to ${currentMonth}`,
        time: nowTime
      });
    } else {
      cat.carry = 0;
      if (spent > totalBudgetLast) {
        let overAmt = spent - totalBudgetLast;
        logs.push({
          message: `Overspent category "${cat.name}" by MVR ${overAmt.toFixed(2)} in ${lastProcessedMonth} (no carry forward)`,
          time: nowTime
        });
      }
    }
  });
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('logs', JSON.stringify(logs));
  localStorage.setItem('lastProcessedMonth', currentMonth);
}

// Refresh category dropdown options for expenses
function refreshCategoryOptions() {
  const select = document.getElementById('expense-category');
  select.innerHTML = '';
  if (categories.length === 0) {
    select.disabled = true;
    noCategoryMsgElem.style.display = 'block';
  } else {
    select.disabled = false;
    noCategoryMsgElem.style.display = 'none';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }
}

// Display budgets and usage for each category
function refreshBudgets() {
  budgetsListElem.innerHTML = '';
  const monthKey = currentMonth;
  categories.forEach(cat => {
    // Calculate spent in current month for this category
    let spent = 0;
    expenses.forEach(exp => {
      if (exp.category === cat.name && exp.month === monthKey) {
        spent += Number(exp.amount);
      }
    });
    const totalBudget = cat.baseBudget + (cat.carry || 0);
    const leftover = totalBudget - spent;
    let percentFill = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
    if (percentFill > 100) percentFill = 100;
    const overspent = leftover < 0;
    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div>
        <strong>${cat.name}</strong>
        <button class="action-btn" onclick="editCategory(${cat.id})">Edit</button>
      </div>
      <div class="budget-bar-container">
        <div class="budget-bar-fill ${overspent ? 'over' : ''}" style="width: ${percentFill}%;"></div>
      </div>
      <div class="budget-stats">
        MVR ${spent.toFixed(2)} / ${totalBudget.toFixed(2)} spent 
        (${totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(0) : 0}% of budget, 
         ${leftover >= 0 ? 'MVR ' + leftover.toFixed(2) + ' left' : 'overspent by MVR ' + Math.abs(leftover).toFixed(2)})
      </div>`;
    budgetsListElem.appendChild(item);
  });
}

// Refresh incomes list
function refreshIncomeList() {
  incomeListElem.innerHTML = '';
  for (let i = incomes.length - 1; i >= 0; i--) {
    const inc = incomes[i];
    const li = document.createElement('li');
    li.className = 'income-item';
    li.id = `income-${inc.id}`;
    li.innerHTML = `${inc.name} - MVR ${Number(inc.amount).toFixed(2)} <small>${formatTime(inc.time)}</small>
      <button class="action-btn" onclick="editIncome(${inc.id})">Edit</button>
      <button class="action-btn delete-btn" onclick="deleteIncome(${inc.id})">Delete</button>`;
    incomeListElem.appendChild(li);
  }
}

// Refresh expenses list
function refreshExpenseList() {
  expenseListElem.innerHTML = '';
  for (let i = expenses.length - 1; i >= 0; i--) {
    const exp = expenses[i];
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.id = `expense-${exp.id}`;
    const namePart = exp.name ? `"${exp.name}"` : '';
    li.innerHTML = `${exp.category} ${namePart} - MVR ${Number(exp.amount).toFixed(2)} <small>${formatTime(exp.time)}</small>
      <button class="action-btn" onclick="editExpense(${exp.id})">Edit</button>
      <button class="action-btn delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>`;
    expenseListElem.appendChild(li);
  }
}

// Refresh audit log list
function refreshLogList() {
  logListElem.innerHTML = '';
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerHTML = `${entry.message} <small>${formatTime(entry.time)}</small>`;
    logListElem.appendChild(li);
  }
}

// Update monthly summary (income, expenses, savings, goal)
function updateSummary() {
  const monthKey = currentMonth;
  let totalInc = 0, totalExp = 0;
  incomes.forEach(inc => { if (inc.month === monthKey) totalInc += Number(inc.amount); });
  expenses.forEach(exp => { if (exp.month === monthKey) totalExp += Number(exp.amount); });
  const netSavings = totalInc - totalExp;
  let summaryHTML = `
    <p>Total Income: MVR ${totalInc.toFixed(2)}</p>
    <p>Total Expenses: MVR ${totalExp.toFixed(2)}</p>`;
  if (netSavings >= 0) {
    summaryHTML += `<p>Saved: MVR ${netSavings.toFixed(2)}</p>`;
  } else {
    summaryHTML += `<p><span class="neg">Overspent: MVR ${Math.abs(netSavings).toFixed(2)}</span></p>`;
  }
  if (savingGoal) {
    let targetAmount = 0;
    let goalDesc = '';
    if (savingGoal.type === 'percent') {
      targetAmount = (savingGoal.value / 100) * totalInc;
      goalDesc = `${savingGoal.value}% of income (MVR ${targetAmount.toFixed(2)})`;
    } else {
      targetAmount = Number(savingGoal.value);
      goalDesc = `MVR ${targetAmount.toFixed(2)}`;
    }
    if (netSavings >= targetAmount) {
      summaryHTML += `<p><span class="pos">Savings goal ${goalDesc} achieved!</span></p>`;
    } else if (netSavings >= 0) {
      const percentAchieved = targetAmount > 0 ? ((netSavings / targetAmount) * 100).toFixed(0) : 0;
      summaryHTML += `<p>Savings Goal: ${goalDesc} – ${percentAchieved}% achieved</p>`;
    } else {
      summaryHTML += `<p>Savings Goal: ${goalDesc} (not achieved)</p>`;
    }
  }
  summaryElem.innerHTML = summaryHTML;
}

// Log an action and update log UI
function addLog(message) {
  const entry = { message: message, time: Date.now() };
  logs.push(entry);
  localStorage.setItem('logs', JSON.stringify(logs));
  const li = document.createElement('li');
  li.className = 'log-item';
  li.innerHTML = `${message} <small>${formatTime(entry.time)}</small>`;
  li.style.opacity = '0';
  logListElem.prepend(li);
  requestAnimationFrame(() => { li.style.opacity = '1'; });
}

// Form submission handlers
function handleAddIncome(e) {
  e.preventDefault();
  const name = document.getElementById('income-name').value.trim();
  const amountVal = parseFloat(document.getElementById('income-amount').value);
  if (!name || isNaN(amountVal) || amountVal <= 0) {
    alert('Please enter a valid income source and amount.');
    return;
  }
  if (editingIncomeId) {
    // Update existing income
    const inc = incomes.find(i => i.id === editingIncomeId);
    if (!inc) return;
    const oldName = inc.name;
    const oldAmount = inc.amount;
    inc.name = name;
    inc.amount = amountVal;
    // (Keep original timestamp and month)
    localStorage.setItem('incomes', JSON.stringify(incomes));
    const li = document.getElementById(`income-${inc.id}`);
    if (li) {
      li.innerHTML = `${inc.name} - MVR ${Number(inc.amount).toFixed(2)} <small>${formatTime(inc.time)}</small>
        <button class="action-btn" onclick="editIncome(${inc.id})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteIncome(${inc.id})">Delete</button>`;
    } else {
      refreshIncomeList();
    }
    addLog(`Edited Income "${oldName}" – amount ${oldAmount} -> ${inc.amount}`);
    editingIncomeId = null;
    incomeForm.querySelector('button[type="submit"]').textContent = 'Add Income';
  } else {
    // Add new income
    const newInc = {
      id: generateId(),
      name: name,
      amount: amountVal,
      time: Date.now(),
      month: getMonthKey()
    };
    incomes.push(newInc);
    localStorage.setItem('incomes', JSON.stringify(incomes));
    const li = document.createElement('li');
    li.className = 'income-item';
    li.id = `income-${newInc.id}`;
    li.innerHTML = `${newInc.name} - MVR ${newInc.amount.toFixed(2)} <small>${formatTime(newInc.time)}</small>
      <button class="action-btn" onclick="editIncome(${newInc.id})">Edit</button>
      <button class="action-btn delete-btn" onclick="deleteIncome(${newInc.id})">Delete</button>`;
    li.style.opacity = '0';
    incomeListElem.prepend(li);
    requestAnimationFrame(() => { li.style.opacity = '1'; });
    addLog(`Added Income: "${newInc.name}" – MVR ${newInc.amount}`);
  }
  incomeForm.reset();
  updateSummary();
}

function handleAddExpense(e) {
  e.preventDefault();
  const category = document.getElementById('expense-category').value;
  const name = document.getElementById('expense-name').value.trim();
  const amountVal = parseFloat(document.getElementById('expense-amount').value);
  if (!category) {
    alert('Please select a category.');
    return;
  }
  if (isNaN(amountVal) || amountVal <= 0) {
    alert('Please enter a valid expense amount.');
    return;
  }
  if (editingExpenseId) {
    // Update existing expense
    const exp = expenses.find(e => e.id === editingExpenseId);
    if (!exp) return;
    const oldCat = exp.category;
    const oldName = exp.name;
    const oldAmount = exp.amount;
    exp.category = category;
    exp.name = name;
    exp.amount = amountVal;
    // (Keep original timestamp and month)
    localStorage.setItem('expenses', JSON.stringify(expenses));
    const li = document.getElementById(`expense-${exp.id}`);
    if (li) {
      const namePart = exp.name ? `"${exp.name}"` : '';
      li.innerHTML = `${exp.category} ${namePart} - MVR ${Number(exp.amount).toFixed(2)} <small>${formatTime(exp.time)}</small>
        <button class="action-btn" onclick="editExpense(${exp.id})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>`;
    } else {
      refreshExpenseList();
    }
    addLog(`Edited Expense (was ${oldCat} "${oldName}" MVR ${oldAmount}) -> (${exp.category} "${exp.name}" MVR ${exp.amount})`);
    editingExpenseId = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
  } else {
    // Add new expense
    const newExp = {
      id: generateId(),
      category: category,
      name: name,
      amount: amountVal,
      time: Date.now(),
      month: getMonthKey()
    };
    expenses.push(newExp);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.id = `expense-${newExp.id}`;
    const namePart = newExp.name ? `"${newExp.name}"` : '';
    li.innerHTML = `${newExp.category} ${namePart} - MVR ${newExp.amount.toFixed(2)} <small>${formatTime(newExp.time)}</small>
      <button class="action-btn" onclick="editExpense(${newExp.id})">Edit</button>
      <button class="action-btn delete-btn" onclick="deleteExpense(${newExp.id})">Delete</button>`;
    li.style.opacity = '0';
    expenseListElem.prepend(li);
    requestAnimationFrame(() => { li.style.opacity = '1'; });
    addLog(`Added Expense: ${newExp.name ? '"' + newExp.name + '"' : ''} (Category: ${newExp.category}) – MVR ${newExp.amount}`);
  }
  expenseForm.reset();
  refreshBudgets();
  updateSummary();
}

function handleAddCategory(e) {
  e.preventDefault();
  const name = document.getElementById('category-name').value.trim();
  const budgetVal = parseFloat(document.getElementById('category-budget').value);
  if (!name || isNaN(budgetVal) || budgetVal < 0) {
    alert('Please enter a valid category name and budget.');
    return;
  }
  // Prevent duplicate category names
  const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists && (!editingCategoryId || (editingCategoryId && categories.find(c => c.id === editingCategoryId).name.toLowerCase() !== name.toLowerCase()))) {
    alert('This category name already exists.');
    return;
  }
  if (editingCategoryId) {
    // Update category
    const cat = categories.find(c => c.id === editingCategoryId);
    if (!cat) return;
    const oldName = cat.name;
    const oldBudget = cat.baseBudget;
    cat.name = name;
    cat.baseBudget = budgetVal;
    // Update existing expenses if name changed
    if (oldName !== name) {
      expenses.forEach(exp => {
        if (exp.category === oldName) exp.category = name;
      });
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
    localStorage.setItem('categories', JSON.stringify(categories));
    refreshCategoryOptions();
    refreshBudgets();
    addLog(`Edited Budget Category "${oldName}" – name: "${oldName}"->"${name}", budget: ${oldBudget} -> ${budgetVal}`);
    editingCategoryId = null;
    categoryForm.querySelector('button[type="submit"]').textContent = 'Add Category';
  } else {
    // Add new category
    const newCat = { id: generateId(), name: name, baseBudget: budgetVal, carry: 0 };
    categories.push(newCat);
    localStorage.setItem('categories', JSON.stringify(categories));
    refreshCategoryOptions();
    refreshBudgets();
    addLog(`Added Budget Category: "${name}" (MVR ${budgetVal} per month)`);
  }
  categoryForm.reset();
}

function handleSetGoal(e) {
  e.preventDefault();
  const type = goalTypeSelect.value;
  const value = parseFloat(goalValueInput.value);
  if (isNaN(value) || value < 0) {
    alert('Please enter a valid goal value.');
    return;
  }
  if (type === 'percent' && value > 100) {
    alert('Percentage goal should be between 0 and 100.');
    return;
  }
  const oldGoal = savingGoal ? { ...savingGoal } : null;
  savingGoal = { type: type, value: value };
  localStorage.setItem('savingGoal', JSON.stringify(savingGoal));
  if (!oldGoal) {
    addLog(`Set savings goal: ${type === 'percent' ? value + '% of income' : 'MVR ' + value}`);
  } else {
    const oldDesc = oldGoal.type === 'percent' ? `${oldGoal.value}% of income` : `MVR ${oldGoal.value}`;
    const newDesc = savingGoal.type === 'percent' ? `${savingGoal.value}% of income` : `MVR ${savingGoal.value}`;
    addLog(`Updated savings goal (was ${oldDesc}, now ${newDesc})`);
  }
  updateSummary();
}

// Edit/Delete functions for entries
function editIncome(id) {
  const inc = incomes.find(i => i.id === id);
  if (!inc) return;
  document.getElementById('income-name').value = inc.name;
  document.getElementById('income-amount').value = inc.amount;
  editingIncomeId = id;
  incomeForm.querySelector('button[type="submit"]').textContent = 'Update Income';
}
function deleteIncome(id) {
  const idx = incomes.findIndex(i => i.id === id);
  if (idx === -1) return;
  const removed = incomes.splice(idx, 1)[0];
  localStorage.setItem('incomes', JSON.stringify(incomes));
  const li = document.getElementById(`income-${id}`);
  if (li) {
    li.classList.add('fade-out');
    setTimeout(() => { if (li.parentNode) li.parentNode.removeChild(li); }, 300);
  }
  addLog(`Deleted Income: "${removed.name}" – MVR ${removed.amount}`);
  updateSummary();
}

function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  document.getElementById('expense-category').value = exp.category;
  document.getElementById('expense-name').value = exp.name;
  document.getElementById('expense-amount').value = exp.amount;
  editingExpenseId = id;
  expenseForm.querySelector('button[type="submit"]').textContent = 'Update Expense';
}
function deleteExpense(id) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  const removed = expenses.splice(idx, 1)[0];
  localStorage.setItem('expenses', JSON.stringify(expenses));
  const li = document.getElementById(`expense-${id}`);
  if (li) {
    li.classList.add('fade-out');
    setTimeout(() => { if (li.parentNode) li.parentNode.removeChild(li); }, 300);
  }
  addLog(`Deleted Expense: ${removed.name ? '"' + removed.name + '"' : ''} (Category: ${removed.category}) – MVR ${removed.amount}`);
  refreshBudgets();
  updateSummary();
}

function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('category-name').value = cat.name;
  document.getElementById('category-budget').value = cat.baseBudget;
  editingCategoryId = id;
  categoryForm.querySelector('button[type="submit"]').textContent = 'Update Category';
}

// Attach form event listeners
incomeForm.addEventListener('submit', handleAddIncome);
expenseForm.addEventListener('submit', handleAddExpense);
categoryForm.addEventListener('submit', handleAddCategory);
goalForm.addEventListener('submit', handleSetGoal);

// Initial load: populate UI with stored data
refreshCategoryOptions();
refreshBudgets();
refreshIncomeList();
refreshExpenseList();
refreshLogList();
updateSummary();
// Prefill savings goal form if a goal is set
if (savingGoal) {
  goalTypeSelect.value = savingGoal.type;
  goalValueInput.value = savingGoal.value;
}
