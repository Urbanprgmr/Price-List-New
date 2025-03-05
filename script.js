// Expense & Budget Tracker – Script (data management and event handlers)

// Data arrays for incomes, expenses, categories, and savings target
let incomes = [];
let expenses = [];
let categories = [];
let savingsTarget = null;  // Object {type: 'fixed'/'percent', value: number}

// Current form mode for adding (either 'income' or 'expense')
let currentAddType = 'expense';

// Variables to track the item being edited
let currentEditIndex = null;
let currentEditType = null;

// Utility: Generate a unique ID for new transactions based on current time and random number
function generateId(type) {
  const now = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `${type.charAt(0)}-${now}-${random}`;
}

// Utility: Get current month and year as an object
function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

// Load data from localStorage and migrate if needed for compatibility
function loadData() {
  const incomesData = localStorage.getItem('incomes');
  const expensesData = localStorage.getItem('expenses');
  const categoriesData = localStorage.getItem('categories');
  const targetData = localStorage.getItem('savingsTarget');
  let dataChanged = false;

  // Parse or initialize data arrays
  incomes = incomesData ? JSON.parse(incomesData) : [];
  if (!Array.isArray(incomes)) incomes = [];
  expenses = expensesData ? JSON.parse(expensesData) : [];
  if (!Array.isArray(expenses)) expenses = [];
  categories = categoriesData ? JSON.parse(categoriesData) : [];
  if (!Array.isArray(categories)) categories = [];
  savingsTarget = targetData ? JSON.parse(targetData) : null;

  // Migrate category data (ensure objects with name & budget)
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (typeof cat === 'string') {
      // Convert string category name to object with budget 0
      categories[i] = { name: cat, budget: 0 };
      dataChanged = true;
    } else if (typeof cat === 'object') {
      if (!cat.hasOwnProperty('budget')) {
        cat.budget = 0;
        dataChanged = true;
      }
      if (!cat.hasOwnProperty('name') && cat.category) {
        // Rename 'category' property to 'name' if present (legacy support)
        cat.name = cat.category;
        delete cat.category;
        dataChanged = true;
      }
    }
  }
  // Remove duplicate categories by name (keep first occurrence)
  const seenNames = new Set();
  categories = categories.filter(cat => {
    if (seenNames.has(cat.name.toLowerCase())) {
      dataChanged = true;
      return false;
    }
    seenNames.add(cat.name.toLowerCase());
    return true;
  });
  // If no categories exist, add a default category to ensure expense entries have one
  if (categories.length === 0) {
    categories.push({ name: 'Miscellaneous', budget: 0 });
    dataChanged = true;
  }

  // Migrate incomes and expenses entries (add missing id/timestamp)
  const totalOldEntries = (incomes ? incomes.length : 0) + (expenses ? expenses.length : 0);
  const baseTime = Date.now() - (totalOldEntries * 60000);
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    if (typeof inc !== 'object') {
      // Convert plain number to object
      incomes[i] = { amount: parseFloat(inc) || 0 };
    }
    incomes[i].amount = parseFloat(incomes[i].amount) || 0;
    if (!incomes[i].hasOwnProperty('id')) {
      incomes[i].id = generateId('income');
      dataChanged = true;
    }
    if (!incomes[i].hasOwnProperty('timestamp')) {
      incomes[i].timestamp = baseTime + i * 60000;
      dataChanged = true;
    }
  }
  for (let j = 0; j < expenses.length; j++) {
    const exp = expenses[j];
    if (typeof exp !== 'object') {
      // Convert plain number to object with default category
      const amt = parseFloat(exp) || 0;
      expenses[j] = { amount: amt, category: 'Miscellaneous' };
    }
    expenses[j].amount = parseFloat(expenses[j].amount) || 0;
    if (!expenses[j].category) {
      expenses[j].category = 'Miscellaneous';
    }
    if (!expenses[j].hasOwnProperty('id')) {
      expenses[j].id = generateId('expense');
      dataChanged = true;
    }
    if (!expenses[j].hasOwnProperty('timestamp')) {
      expenses[j].timestamp = baseTime + (incomes.length + j) * 60000;
      dataChanged = true;
    }
  }

  // Save migrated data back to localStorage if any changes were made
  if (dataChanged) {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('incomes', JSON.stringify(incomes));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    if (savingsTarget !== null) {
      localStorage.setItem('savingsTarget', JSON.stringify(savingsTarget));
    }
  }
}

// Calculate total income, total expense, and balance for the current month
function getCurrentMonthTotals() {
  const { month, year } = getCurrentMonthYear();
  let monthIncome = 0;
  let monthExpense = 0;
  for (const inc of incomes) {
    const d = new Date(inc.timestamp);
    if (d.getMonth() === month && d.getFullYear() === year) {
      monthIncome += inc.amount;
    }
  }
  for (const exp of expenses) {
    const d = new Date(exp.timestamp);
    if (d.getMonth() === month && d.getFullYear() === year) {
      monthExpense += exp.amount;
    }
  }
  return { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense };
}

// Update the summary display (totals and savings target status)
function updateSummaryDisplay() {
  const now = new Date();
  const titleEl = document.getElementById('summaryTitle');
  if (titleEl) {
    titleEl.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' }) + ' Summary';
  }
  const totals = getCurrentMonthTotals();
  document.getElementById('totalIncome').textContent = totals.income.toFixed(2);
  document.getElementById('totalExpense').textContent = totals.expense.toFixed(2);
  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = totals.balance.toFixed(2);
  // Color balance red if negative, normal if positive/zero
  if (totals.balance < 0) {
    balanceEl.parentElement.classList.add('negative');
  } else {
    balanceEl.parentElement.classList.remove('negative');
  }
  // Update savings target info
  const targetInfoEl = document.getElementById('targetInfo');
  if (savingsTarget && ((savingsTarget.type === 'fixed' && savingsTarget.value > 0) || (savingsTarget.type === 'percent' && savingsTarget.value > 0))) {
    let targetAmount = 0;
    if (savingsTarget.type === 'fixed') {
      targetAmount = savingsTarget.value;
    } else if (savingsTarget.type === 'percent') {
      targetAmount = (savingsTarget.value / 100) * totals.income;
    }
    let savedAmount = totals.balance;
    if (savedAmount < 0) savedAmount = 0;  // don't count negative balance as savings
    let targetText = '';
    if (savingsTarget.type === 'percent') {
      targetText += `Target: ${savingsTarget.value}% of income = $${targetAmount.toFixed(2)}. `;
    } else {
      targetText += `Target: $${targetAmount.toFixed(2)}. `;
    }
    if (savedAmount >= targetAmount) {
      targetText += `Savings target achieved! (Saved $${savedAmount.toFixed(2)}`;
      if (savedAmount > targetAmount) {
        targetText += `, $${(savedAmount - targetAmount).toFixed(2)} over target`;
      }
      targetText += ')';
      targetInfoEl.classList.remove('target-not-met');
      targetInfoEl.classList.add('target-met');
    } else {
      targetText += `Saved $${savedAmount.toFixed(2)} of target. Need $${(targetAmount - savedAmount).toFixed(2)} more to reach target.`;
      targetInfoEl.classList.remove('target-met');
      targetInfoEl.classList.add('target-not-met');
    }
    targetInfoEl.textContent = targetText;
  } else {
    targetInfoEl.textContent = 'No savings target set.';
    targetInfoEl.classList.remove('target-met', 'target-not-met');
  }
}

// Update the category budgets summary (per category spending vs budget for current month)
function updateCategorySummary() {
  const container = document.getElementById('categorySummary');
  container.innerHTML = '';
  const { month, year } = getCurrentMonthYear();
  categories.forEach(cat => {
    const catName = cat.name;
    const budget = parseFloat(cat.budget) || 0;
    // Calculate total spent in this category for current month
    let spent = 0;
    for (const exp of expenses) {
      const d = new Date(exp.timestamp);
      if (d.getMonth() === month && d.getFullYear() === year && exp.category === catName) {
        spent += exp.amount;
      }
    }
    // Create row container
    const row = document.createElement('div');
    row.className = 'cat-summary-row';
    // Category name label
    const label = document.createElement('div');
    label.className = 'cat-label';
    label.textContent = catName;
    // Spending info text
    const info = document.createElement('div');
    info.className = 'cat-info';
    if (budget > 0) {
      const remaining = budget - spent;
      info.textContent = `$${spent.toFixed(2)} / $${budget.toFixed(2)} spent`;
      if (spent > budget) {
        info.textContent += ` (Over by $${(spent - budget).toFixed(2)})`;
      } else {
        info.textContent += ` (Remaining $${remaining.toFixed(2)})`;
      }
    } else {
      info.textContent = `$${spent.toFixed(2)} spent (no budget set)`;
    }
    // Progress bar for category (if budget defined)
    const barContainer = document.createElement('div');
    barContainer.className = 'cat-bar-container';
    if (budget > 0) {
      const barFill = document.createElement('div');
      barFill.className = 'cat-bar-fill';
      let percentage = 0;
      if (budget > 0) {
        percentage = Math.floor((spent / budget) * 100);
        if (percentage > 100) percentage = 100;
      }
      barFill.style.width = percentage + '%';
      if (spent > budget) {
        barFill.classList.add('over-budget');
      }
      barContainer.appendChild(barFill);
    }
    // Append elements to row
    row.appendChild(label);
    row.appendChild(info);
    if (budget > 0) {
      row.appendChild(barContainer);
    }
    container.appendChild(row);
  });
}

// Get a combined list of all transactions (income and expense) sorted by time
function getCombinedTransactionsSorted() {
  const transactions = [];
  for (const inc of incomes) {
    transactions.push({ type: 'income', amount: inc.amount, category: null, timestamp: inc.timestamp, id: inc.id });
  }
  for (const exp of expenses) {
    transactions.push({ type: 'expense', amount: exp.amount, category: exp.category, timestamp: exp.timestamp, id: exp.id });
  }
  // Sort by timestamp ascending, then reverse for newest first
  transactions.sort((a, b) => a.timestamp - b.timestamp);
  return transactions;
}

// Update the history list display (list of transactions with timestamps)
function updateHistoryList() {
  const historyContainer = document.getElementById('historyList');
  historyContainer.innerHTML = '';
  const transList = getCombinedTransactionsSorted().reverse();  // newest first
  for (const entry of transList) {
    const item = document.createElement('div');
    item.className = 'trans-item';
    if (entry.type === 'income') {
      item.classList.add('income-item');
    } else {
      item.classList.add('expense-item');
    }
    // Assign data attributes for id and type (to identify on edit/delete)
    item.dataset.id = entry.id;
    item.dataset.type = entry.type;
    // Amount element (with +/– sign)
    const amountEl = document.createElement('span');
    amountEl.className = 'trans-amount';
    amountEl.textContent = (entry.type === 'income' ? '+ $' : '- $') + entry.amount.toFixed(2);
    // Category (or label "Income" for income entries)
    const categoryEl = document.createElement('span');
    categoryEl.className = 'trans-category';
    categoryEl.textContent = entry.type === 'expense' ? entry.category : 'Income';
    // Timestamp element (formatted locale string)
    const dateEl = document.createElement('span');
    dateEl.className = 'trans-date';
    dateEl.textContent = new Date(entry.timestamp).toLocaleString();
    // Actions (Edit/Delete buttons)
    const actionsEl = document.createElement('span');
    actionsEl.className = 'trans-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    actionsEl.appendChild(editBtn);
    actionsEl.appendChild(deleteBtn);
    // Assemble transaction item
    item.appendChild(amountEl);
    item.appendChild(categoryEl);
    item.appendChild(dateEl);
    item.appendChild(actionsEl);
    historyContainer.appendChild(item);
  }
}

// Handler for adding a new income or expense
function handleAddTransaction(event) {
  event.preventDefault();
  const amountInput = document.getElementById('amountInput');
  const categorySelect = document.getElementById('categorySelect');
  const amountVal = parseFloat(amountInput.value);
  if (isNaN(amountVal) || amountVal < 0) {
    alert('Please enter a valid amount.');
    return;
  }
  if (currentAddType === 'expense') {
    const categoryVal = categorySelect.value;
    if (!categoryVal) {
      alert('Please select a category.');
      return;
    }
    // Create new expense entry
    const newExp = {
      amount: amountVal,
      category: categoryVal,
      timestamp: Date.now(),
      id: generateId('expense')
    };
    expenses.push(newExp);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  } else {
    // Create new income entry
    const newInc = {
      amount: amountVal,
      timestamp: Date.now(),
      id: generateId('income')
    };
    incomes.push(newInc);
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }
  // Clear form inputs
  amountInput.value = '';
  if (currentAddType === 'expense') {
    categorySelect.selectedIndex = 0;
  }
  // Refresh UI
  updateSummaryDisplay();
  updateHistoryList();
  updateCategorySummary();
}

// Handler for category selection change in the add expense form (checks for "Add new category")
function handleCategorySelectChange() {
  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect.value === 'NEW_CATEGORY') {
    const newName = prompt('Enter new category name:');
    if (newName) {
      const nameTrimmed = newName.trim();
      if (nameTrimmed === '') {
        alert('Category name cannot be empty.');
      } else {
        const exists = categories.some(cat => cat.name.toLowerCase() === nameTrimmed.toLowerCase());
        if (exists) {
          alert('Category already exists.');
        } else {
          const newCat = { name: nameTrimmed, budget: 0 };
          categories.push(newCat);
          localStorage.setItem('categories', JSON.stringify(categories));
          populateCategorySelect();
          categorySelect.value = nameTrimmed;
          updateCategorySummary();
        }
      }
    }
    // Reset selection if no valid name was provided
    categorySelect.selectedIndex = 0;
  }
}

// Populate the category dropdown in the add expense form (with existing categories and an "add new" option)
function populateCategorySelect() {
  const categorySelect = document.getElementById('categorySelect');
  categorySelect.innerHTML = '';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.textContent = 'Select category';
  categorySelect.appendChild(placeholderOption);
  for (const cat of categories) {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  }
  const newOption = document.createElement('option');
  newOption.value = 'NEW_CATEGORY';
  newOption.textContent = 'Add new category...';
  categorySelect.appendChild(newOption);
}

// Switch the add form between Income and Expense mode
function switchAddType(type) {
  currentAddType = type;
  const expenseFields = document.getElementById('expenseFields');
  const addBtn = document.getElementById('addBtn');
  const incomeTab = document.getElementById('incomeTab');
  const expenseTab = document.getElementById('expenseTab');
  if (type === 'income') {
    expenseFields.style.display = 'none';
    addBtn.textContent = 'Add Income';
    incomeTab.classList.add('active');
    expenseTab.classList.remove('active');
  } else {
    expenseFields.style.display = 'block';
    addBtn.textContent = 'Add Expense';
    expenseTab.classList.add('active');
    incomeTab.classList.remove('active');
  }
}

// Open the Settings modal and populate the fields
function openSettingsModal() {
  // Set current target values in the form
  const targetTypeSelect = document.getElementById('targetType');
  const targetValueInput = document.getElementById('targetValue');
  if (savingsTarget) {
    targetTypeSelect.value = savingsTarget.type;
    targetValueInput.value = savingsTarget.value;
  } else {
    targetTypeSelect.value = 'percent';
    targetValueInput.value = '';
  }
  // Populate category settings (categories list and budget inputs)
  populateCategorySettings();
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

// Close the Settings modal
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  // Refresh main UI in case of changes
  updateSummaryDisplay();
  updateCategorySummary();
  populateCategorySelect();
}

// Populate the category settings section in the Settings modal (list categories with budgets and add-new form)
function populateCategorySettings() {
  const container = document.getElementById('categorySettings');
  container.innerHTML = '';
  // Create categories table
  const table = document.createElement('table');
  table.className = 'category-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const thName = document.createElement('th');
  thName.textContent = 'Category';
  const thBudget = document.createElement('th');
  thBudget.textContent = 'Monthly Budget ($)';
  headerRow.appendChild(thName);
  headerRow.appendChild(thBudget);
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  categories.forEach((cat, index) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = cat.name;
    const budgetCell = document.createElement('td');
    const budgetInput = document.createElement('input');
    budgetInput.type = 'number';
    budgetInput.min = '0';
    budgetInput.step = '0.01';
    budgetInput.value = parseFloat(cat.budget) || 0;
    budgetInput.dataset.index = index;
    budgetInput.className = 'category-budget-input';
    budgetCell.appendChild(budgetInput);
    row.appendChild(nameCell);
    row.appendChild(budgetCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  // Add new category form
  const addContainer = document.createElement('div');
  addContainer.className = 'new-category-form';
  const newNameInput = document.createElement('input');
  newNameInput.type = 'text';
  newNameInput.id = 'newCategoryName';
  newNameInput.placeholder = 'New category name';
  newNameInput.maxLength = 30;
  const newBudgetInput = document.createElement('input');
  newBudgetInput.type = 'number';
  newBudgetInput.id = 'newCategoryBudget';
  newBudgetInput.placeholder = 'Budget';
  newBudgetInput.min = '0';
  newBudgetInput.step = '0.01';
  const addCatBtn = document.createElement('button');
  addCatBtn.id = 'addCategoryBtn';
  addCatBtn.textContent = 'Add Category';
  addContainer.appendChild(newNameInput);
  addContainer.appendChild(newBudgetInput);
  addContainer.appendChild(addCatBtn);
  container.appendChild(addContainer);
  // Attach events for budget input changes
  const budgetInputs = container.querySelectorAll('input.category-budget-input');
  budgetInputs.forEach(input => {
    input.addEventListener('change', e => {
      const idx = e.target.dataset.index;
      let newVal = parseFloat(e.target.value);
      if (isNaN(newVal) || newVal < 0) newVal = 0;
      categories[idx].budget = newVal;
      localStorage.setItem('categories', JSON.stringify(categories));
    });
  });
  // Attach event for adding a new category
  addCatBtn.addEventListener('click', () => {
    const nameVal = newNameInput.value.trim();
    let budgetVal = parseFloat(newBudgetInput.value);
    if (nameVal === '') {
      alert('Please enter a category name.');
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === nameVal.toLowerCase())) {
      alert('Category already exists.');
      return;
    }
    if (isNaN(budgetVal) || budgetVal < 0) {
      budgetVal = 0;
    }
    const newCatObj = { name: nameVal, budget: budgetVal };
    categories.push(newCatObj);
    localStorage.setItem('categories', JSON.stringify(categories));
    // Refresh the settings UI and main category list
    populateCategorySettings();
    populateCategorySelect();
    updateCategorySummary();
  });
}

// Open the Edit Transaction modal for a given transaction type and index
function openEditModal(type, index) {
  currentEditType = type;
  currentEditIndex = index;
  const editAmountInput = document.getElementById('editAmount');
  const editCategoryField = document.getElementById('editCategoryField');
  const editCategorySelect = document.getElementById('editCategory');
  if (type === 'income') {
    const inc = incomes[index];
    editAmountInput.value = inc.amount;
    editCategoryField.style.display = 'none';
  } else {
    const exp = expenses[index];
    editAmountInput.value = exp.amount;
    // Populate category select with all categories
    editCategorySelect.innerHTML = '';
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      editCategorySelect.appendChild(opt);
    }
    editCategorySelect.value = exp.category;
    editCategoryField.style.display = 'block';
  }
  const modal = document.getElementById('editModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

// Close the Edit Transaction modal
function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

// Handler for saving an edited transaction
function handleSaveEdit(event) {
  event.preventDefault();
  if (currentEditIndex === null || currentEditType === null) return;
  const editAmountInput = document.getElementById('editAmount');
  const editCategorySelect = document.getElementById('editCategory');
  let newAmount = parseFloat(editAmountInput.value);
  if (isNaN(newAmount) || newAmount < 0) {
    alert('Please enter a valid amount.');
    return;
  }
  if (currentEditType === 'income') {
    incomes[currentEditIndex].amount = newAmount;
    localStorage.setItem('incomes', JSON.stringify(incomes));
  } else if (currentEditType === 'expense') {
    const newCategory = editCategorySelect.value;
    if (!newCategory) {
      alert('Please select a category.');
      return;
    }
    expenses[currentEditIndex].amount = newAmount;
    expenses[currentEditIndex].category = newCategory;
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }
  closeEditModal();
  updateSummaryDisplay();
  updateHistoryList();
  updateCategorySummary();
}

// Handler for deleting a transaction
function handleDeleteTransaction(type, index) {
  if (type === 'income') {
    incomes.splice(index, 1);
    localStorage.setItem('incomes', JSON.stringify(incomes));
  } else if (type === 'expense') {
    expenses.splice(index, 1);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }
  updateSummaryDisplay();
  updateHistoryList();
  updateCategorySummary();
}

// Handler for saving the savings target from settings
function handleSaveTarget() {
  const targetTypeSelect = document.getElementById('targetType');
  const targetValueInput = document.getElementById('targetValue');
  const typeVal = targetTypeSelect.value;
  let valueVal = parseFloat(targetValueInput.value);
  if (isNaN(valueVal) || valueVal < 0) {
    alert('Please enter a valid target value.');
    return;
  }
  if (typeVal === 'percent' && valueVal > 100) {
    alert('Percentage cannot exceed 100.');
    return;
  }
  savingsTarget = { type: typeVal, value: valueVal };
  localStorage.setItem('savingsTarget', JSON.stringify(savingsTarget));
  updateSummaryDisplay();
  closeSettingsModal();
}

// Initialize the application
function initApp() {
  loadData();
  populateCategorySelect();
  updateSummaryDisplay();
  updateCategorySummary();
  updateHistoryList();
  // Event listeners
  document.getElementById('addForm').addEventListener('submit', handleAddTransaction);
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('amountInput').value = '';
    if (currentAddType === 'expense') {
      document.getElementById('categorySelect').selectedIndex = 0;
    }
  });
  document.getElementById('incomeTab').addEventListener('click', () => switchAddType('income'));
  document.getElementById('expenseTab').addEventListener('click', () => switchAddType('expense'));
  document.getElementById('categorySelect').addEventListener('change', handleCategorySelectChange);
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
  document.getElementById('saveTargetBtn').addEventListener('click', handleSaveTarget);
  document.getElementById('closeSettings').addEventListener('click', closeSettingsModal);
  document.getElementById('editForm').addEventListener('submit', handleSaveEdit);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  document.getElementById('closeEdit').addEventListener('click', closeEditModal);
  // Delegate click events for Edit/Delete in history list
  document.getElementById('historyList').addEventListener('click', e => {
    const target = e.target;
    if (target.classList.contains('edit-btn')) {
      const itemEl = target.closest('.trans-item');
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      const type = itemEl.dataset.type;
      if (type === 'income') {
        const idx = incomes.findIndex(inc => inc.id === id);
        if (idx !== -1) openEditModal('income', idx);
      } else if (type === 'expense') {
        const idx = expenses.findIndex(exp => exp.id === id);
        if (idx !== -1) openEditModal('expense', idx);
      }
    } else if (target.classList.contains('delete-btn')) {
      const itemEl = target.closest('.trans-item');
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      const type = itemEl.dataset.type;
      if (confirm('Delete this entry?')) {
        if (type === 'income') {
          const idx = incomes.findIndex(inc => inc.id === id);
          if (idx !== -1) handleDeleteTransaction('income', idx);
        } else if (type === 'expense') {
          const idx = expenses.findIndex(exp => exp.id === id);
          if (idx !== -1) handleDeleteTransaction('expense', idx);
        }
      }
    }
  });
  // Close modals when clicking outside modal content
  window.addEventListener('click', e => {
    const settingsModal = document.getElementById('settingsModal');
    const editModal = document.getElementById('editModal');
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
    if (e.target === editModal) {
      closeEditModal();
    }
  });
}

// Start the app on page load
document.addEventListener('DOMContentLoaded', initApp);
