document.addEventListener('DOMContentLoaded', () => {
  // Data storage for incomes, expenses, and categories
  const data = {
    incomes: [],
    expenses: [],
    categories: []
  };
  let incomeId = 0, expenseId = 0, categoryId = 0;

  // Get references to form fields and containers
  const incomeForm = document.getElementById('income-form');
  const incomeDescInput = document.getElementById('income-desc');
  const incomeAmountInput = document.getElementById('income-amount');
  const expenseForm = document.getElementById('expense-form');
  const expenseDescInput = document.getElementById('expense-desc');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expenseCategorySelect = document.getElementById('expense-category');
  const categoryForm = document.getElementById('category-form');
  const categoryNameInput = document.getElementById('category-name');
  const categoryTypeSelect = document.getElementById('category-type');
  const categoryAmountInput = document.getElementById('category-amount');
  const historyList = document.getElementById('history-list');
  const totalIncomeElem = document.getElementById('total-income');
  const totalExpensesElem = document.getElementById('total-expenses');
  const balanceElem = document.getElementById('balance');
  // Edit modals and fields
  const editIncomeModal = document.getElementById('editIncomeModal');
  const editExpenseModal = document.getElementById('editExpenseModal');
  const editCategoryModal = document.getElementById('editCategoryModal');
  const editIncomeForm = document.getElementById('edit-income-form');
  const editIncomeDesc = document.getElementById('edit-income-desc');
  const editIncomeAmount = document.getElementById('edit-income-amount');
  const editIncomeId = document.getElementById('edit-income-id');
  const editExpenseForm = document.getElementById('edit-expense-form');
  const editExpenseDesc = document.getElementById('edit-expense-desc');
  const editExpenseAmount = document.getElementById('edit-expense-amount');
  const editExpenseCategorySelect = document.getElementById('edit-expense-category');
  const editExpenseId = document.getElementById('edit-expense-id');
  const editCategoryForm = document.getElementById('edit-category-form');
  const editCategoryName = document.getElementById('edit-category-name');
  const editCategoryType = document.getElementById('edit-category-type');
  const editCategoryAmount = document.getElementById('edit-category-amount');
  const editCategoryId = document.getElementById('edit-category-id');

  // Helper: calculate total income
  const getTotalIncome = () => data.incomes.reduce((sum, inc) => sum + inc.amount, 0);

  // Update displayed totals (income, expenses, balance)
  function updateTotals() {
    const totalIncome = getTotalIncome();
    const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    totalIncomeElem.textContent = totalIncome.toFixed(2);
    totalExpensesElem.textContent = totalExpenses.toFixed(2);
    balanceElem.textContent = (totalIncome - totalExpenses).toFixed(2);
  }

  // Update all budget category entries in the history (allocated and spent values)
  function updateAllCategoriesUI() {
    const totalIncome = getTotalIncome();
    data.categories.forEach(cat => {
      const catItem = document.querySelector(`.history-item[data-type="category"][data-id="${cat.id}"]`);
      if (!catItem) return;
      const itemTextElem = catItem.querySelector('.item-text');
      // Calculate current allocated amount (if percentage, based on current total income)
      const allocatedAmount = (cat.type === 'percent') ? (cat.allocated / 100) * totalIncome : cat.allocated;
      // Calculate total spent in this category
      const spentAmount = data.expenses
        .filter(exp => exp.categoryId === cat.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      // Prepare text content for the category entry
      if (cat.type === 'percent') {
        // Percentage-based budget
        const pctStr = Number.isInteger(cat.allocated) ? cat.allocated : parseFloat(cat.allocated.toFixed(2));
        itemTextElem.textContent = `Budget ${cat.name}: $${allocatedAmount.toFixed(2)} (${pctStr}% of income); Spent $${spentAmount.toFixed(2)}`;
      } else {
        // Fixed amount budget
        itemTextElem.textContent = `Budget ${cat.name}: $${allocatedAmount.toFixed(2)}; Spent $${spentAmount.toFixed(2)}`;
      }
      // Highlight if overspent
      if (spentAmount > allocatedAmount) {
        catItem.classList.add('overspent');
      } else {
        catItem.classList.remove('overspent');
      }
    });
  }

  // Refresh category options in the expense dropdowns (main form and edit form)
  function updateCategoryOptions() {
    // Clear existing options in expense add form (keep placeholder at index 0)
    while (expenseCategorySelect.options.length > 1) {
      expenseCategorySelect.remove(1);
    }
    // Clear and repopulate edit expense category select
    editExpenseCategorySelect.innerHTML = '';
    data.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      expenseCategorySelect.appendChild(opt.cloneNode(true));  // add to main form
      editExpenseCategorySelect.appendChild(opt);               // add to edit form
    });
  }

  // Open and close modals
  function openModal(modalEl) {
    modalEl.classList.add('open');
  }
  function closeModal(modalEl) {
    modalEl.classList.remove('open');
  }

  // Handle placeholder text when changing budget type (fixed vs percent)
  function handleCategoryTypeChange(selectEl, amountInput) {
    if (selectEl.value === 'percent') {
      amountInput.placeholder = 'Percentage (%)';
      amountInput.max = 100;
    } else {
      amountInput.placeholder = 'Amount';
      amountInput.removeAttribute('max');
    }
  }
  // Attach change events for type selects to update placeholder text
  categoryTypeSelect.addEventListener('change', () => handleCategoryTypeChange(categoryTypeSelect, categoryAmountInput));
  editCategoryType.addEventListener('change', () => handleCategoryTypeChange(editCategoryType, editCategoryAmount));

  /** Event Handlers **/

  // Add Income
  incomeForm.addEventListener('submit', e => {
    e.preventDefault();
    const desc = incomeDescInput.value.trim();
    const amountVal = parseFloat(incomeAmountInput.value);
    if (isNaN(amountVal)) return;  // invalid input
    incomeId++;
    const newIncome = { id: incomeId, desc: desc, amount: amountVal, timestamp: Date.now() };
    data.incomes.push(newIncome);
    // Create history item element for the new income
    const item = document.createElement('div');
    item.className = 'history-item fade-in';
    item.dataset.type = 'income';
    item.dataset.id = newIncome.id;
    // Content text
    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    const amountStr = `$${newIncome.amount.toFixed(2)}`;
    textSpan.textContent = desc ? `Income: ${amountStr} - ${desc}` : `Income: ${amountStr}`;
    // Action buttons (Edit/Delete)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';
    actionsDiv.innerHTML = `<button type="button" class="edit-btn">&#9998;</button>
                             <button type="button" class="delete-btn">&#128465;</button>`;
    item.appendChild(textSpan);
    item.appendChild(actionsDiv);
    historyList.appendChild(item);
    // Update totals and related displays
    updateTotals();
    updateAllCategoriesUI(); // in case percent budgets need recalculation
    // Clear input fields
    incomeDescInput.value = '';
    incomeAmountInput.value = '';
  });

  // Add Expense
  expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const desc = expenseDescInput.value.trim();
    const amountVal = parseFloat(expenseAmountInput.value);
    const catId = expenseCategorySelect.value;
    if (isNaN(amountVal) || !catId) return;
    expenseId++;
    const newExpense = { id: expenseId, desc: desc, amount: amountVal, categoryId: Number(catId), timestamp: Date.now() };
    data.expenses.push(newExpense);
    // Create history item for expense
    const item = document.createElement('div');
    item.className = 'history-item fade-in';
    item.dataset.type = 'expense';
    item.dataset.id = newExpense.id;
    item.dataset.categoryId = newExpense.categoryId;
    // Determine category name
    const cat = data.categories.find(c => c.id === newExpense.categoryId);
    const categoryName = cat ? cat.name : 'Category';
    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    const amountStr = `$${newExpense.amount.toFixed(2)}`;
    textSpan.textContent = desc 
      ? `Expense (${categoryName}): ${amountStr} - ${desc}` 
      : `Expense (${categoryName}): ${amountStr}`;
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';
    actionsDiv.innerHTML = `<button type="button" class="edit-btn">&#9998;</button>
                             <button type="button" class="delete-btn">&#128465;</button>`;
    item.appendChild(textSpan);
    item.appendChild(actionsDiv);
    historyList.appendChild(item);
    // Update totals and category usage
    updateTotals();
    updateAllCategoriesUI();
    // Clear fields and reset category selector
    expenseDescInput.value = '';
    expenseAmountInput.value = '';
    expenseCategorySelect.selectedIndex = 0; // reset to "Select Category"
  });

  // Add Budget Category
  categoryForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = categoryNameInput.value.trim();
    const type = categoryTypeSelect.value;
    let allocatedVal = parseFloat(categoryAmountInput.value);
    if (!name || isNaN(allocatedVal)) return;
    // Clamp percentage between 0 and 100 if needed
    if (type === 'percent') {
      if (allocatedVal < 0) allocatedVal = 0;
      if (allocatedVal > 100) allocatedVal = 100;
    }
    categoryId++;
    const newCat = { id: categoryId, name: name, type: type, allocated: allocatedVal, timestamp: Date.now() };
    data.categories.push(newCat);
    // Create history item for category
    const item = document.createElement('div');
    item.className = 'history-item fade-in';
    item.dataset.type = 'category';
    item.dataset.id = newCat.id;
    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    // Calculate initial allocated amount (if percent, based on current total income)
    const totalIncome = getTotalIncome();
    const allocatedAmount = (newCat.type === 'percent') ? (newCat.allocated / 100) * totalIncome : newCat.allocated;
    if (newCat.type === 'percent') {
      const pctStr = Number.isInteger(newCat.allocated) ? newCat.allocated : parseFloat(newCat.allocated.toFixed(2));
      textSpan.textContent = `Budget ${newCat.name}: $${allocatedAmount.toFixed(2)} (${pctStr}% of income); Spent $0.00`;
    } else {
      textSpan.textContent = `Budget ${newCat.name}: $${allocatedAmount.toFixed(2)}; Spent $0.00`;
    }
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';
    actionsDiv.innerHTML = `<button type="button" class="edit-btn">&#9998;</button>
                             <button type="button" class="delete-btn">&#128465;</button>`;
    item.appendChild(textSpan);
    item.appendChild(actionsDiv);
    historyList.appendChild(item);
    // Update category options in dropdowns and refresh calculations
    updateCategoryOptions();
    updateAllCategoriesUI();  // spent remains 0, but ensures percent allocated shown correctly if incomes exist
    // Clear form fields
    categoryNameInput.value = '';
    categoryTypeSelect.value = 'fixed';
    categoryAmountInput.value = '';
    categoryAmountInput.placeholder = 'Amount';
  });

  // Event delegation for Edit/Delete buttons in the history list
  historyList.addEventListener('click', e => {
    const btn = e.target;
    if (!btn.classList.contains('edit-btn') && !btn.classList.contains('delete-btn')) return;
    const itemDiv = btn.closest('.history-item');
    if (!itemDiv) return;
    const type = itemDiv.dataset.type;
    const id = Number(itemDiv.dataset.id);
    
    // DELETE action
    if (btn.classList.contains('delete-btn')) {
      if (type === 'income') {
        // Remove income from data and DOM
        data.incomes = data.incomes.filter(inc => inc.id !== id);
        itemDiv.classList.add('fade-out');
        setTimeout(() => itemDiv.remove(), 300);
        updateTotals();
        updateAllCategoriesUI(); // update percent budgets if total income changed
      } 
      else if (type === 'expense') {
        const expIndex = data.expenses.findIndex(exp => exp.id === id);
        if (expIndex !== -1) {
          const catId = data.expenses[expIndex].categoryId;
          data.expenses.splice(expIndex, 1);
          itemDiv.classList.add('fade-out');
          setTimeout(() => itemDiv.remove(), 300);
          updateTotals();
          updateAllCategoriesUI(); // update that category's spent total
        }
      } 
      else if (type === 'category') {
        // Confirm category deletion as it removes all associated expenses
        if (!confirm('Delete this category and all its related expenses?')) return;
        const catIndex = data.categories.findIndex(cat => cat.id === id);
        if (catIndex !== -1) {
          const catId = data.categories[catIndex].id;
          // Remove category and its expenses from data
          data.categories.splice(catIndex, 1);
          data.expenses = data.expenses.filter(exp => exp.categoryId !== catId);
          // Remove category item from DOM
          itemDiv.classList.add('fade-out');
          setTimeout(() => itemDiv.remove(), 300);
          // Remove all expense items associated with this category from DOM
          document.querySelectorAll(`.history-item[data-type="expense"][data-category-id="${catId}"]`)
            .forEach(expItem => {
              expItem.classList.add('fade-out');
              setTimeout(() => expItem.remove(), 300);
            });
          // Update category options, totals, and remaining categories UI
          updateCategoryOptions();
          updateTotals();
          updateAllCategoriesUI();
        }
      }
    }

    // EDIT action
    else if (btn.classList.contains('edit-btn')) {
      if (type === 'income') {
        const inc = data.incomes.find(i => i.id === id);
        if (!inc) return;
        editIncomeDesc.value = inc.desc;
        editIncomeAmount.value = inc.amount;
        editIncomeId.value = inc.id;
        openModal(editIncomeModal);
      } 
      else if (type === 'expense') {
        const exp = data.expenses.find(ex => ex.id === id);
        if (!exp) return;
        editExpenseDesc.value = exp.desc;
        editExpenseAmount.value = exp.amount;
        editExpenseId.value = exp.id;
        editExpenseCategorySelect.value = exp.categoryId;
        openModal(editExpenseModal);
      } 
      else if (type === 'category') {
        const cat = data.categories.find(c => c.id === id);
        if (!cat) return;
        editCategoryName.value = cat.name;
        editCategoryType.value = cat.type;
        editCategoryAmount.value = cat.allocated;
        editCategoryId.value = cat.id;
        // Update placeholder to match current type
        handleCategoryTypeChange(editCategoryType, editCategoryAmount);
        openModal(editCategoryModal);
      }
    }
  });

  // Cancel buttons in edit modals (close modal without saving)
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modalEl = document.getElementById(modalId);
      if (modalEl) closeModal(modalEl);
    });
  });

  // Submit updated Income
  editIncomeForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = Number(editIncomeId.value);
    const desc = editIncomeDesc.value.trim();
    const amountVal = parseFloat(editIncomeAmount.value);
    if (isNaN(amountVal)) return;
    const inc = data.incomes.find(i => i.id === id);
    if (!inc) return;
    // Update data
    inc.desc = desc;
    inc.amount = amountVal;
    // Update DOM text
    const itemDiv = document.querySelector(`.history-item[data-type="income"][data-id="${id}"]`);
    if (itemDiv) {
      const textSpan = itemDiv.querySelector('.item-text');
      const amountStr = `$${inc.amount.toFixed(2)}`;
      textSpan.textContent = desc ? `Income: ${amountStr} - ${desc}` : `Income: ${amountStr}`;
    }
    updateTotals();
    updateAllCategoriesUI();
    closeModal(editIncomeModal);
  });

  // Submit updated Expense
  editExpenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = Number(editExpenseId.value);
    const desc = editExpenseDesc.value.trim();
    const amountVal = parseFloat(editExpenseAmount.value);
    const newCatId = Number(editExpenseCategorySelect.value);
    if (isNaN(amountVal) || !newCatId) return;
    const exp = data.expenses.find(ex => ex.id === id);
    if (!exp) return;
    // Track old category for updates
    const oldCatId = exp.categoryId;
    // Update data
    exp.desc = desc;
    exp.amount = amountVal;
    exp.categoryId = newCatId;
    // Update DOM text and data attributes for this expense item
    const itemDiv = document.querySelector(`.history-item[data-type="expense"][data-id="${id}"]`);
    if (itemDiv) {
      itemDiv.dataset.categoryId = exp.categoryId;
      const textSpan = itemDiv.querySelector('.item-text');
      const newCat = data.categories.find(c => c.id === exp.categoryId);
      const categoryName = newCat ? newCat.name : 'Category';
      const amountStr = `$${exp.amount.toFixed(2)}`;
      textSpan.textContent = desc 
        ? `Expense (${categoryName}): ${amountStr} - ${desc}` 
        : `Expense (${categoryName}): ${amountStr}`;
    }
    updateTotals();
    updateAllCategoriesUI();
    closeModal(editExpenseModal);
  });

  // Submit updated Budget Category
  editCategoryForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = Number(editCategoryId.value);
    const name = editCategoryName.value.trim();
    const type = editCategoryType.value;
    let allocatedVal = parseFloat(editCategoryAmount.value);
    if (!name || isNaN(allocatedVal)) return;
    if (type === 'percent') {
      if (allocatedVal < 0) allocatedVal = 0;
      if (allocatedVal > 100) allocatedVal = 100;
    }
    const cat = data.categories.find(c => c.id === id);
    if (!cat) return;
    const oldName = cat.name;
    // Update category data
    cat.name = name;
    cat.type = type;
    cat.allocated = allocatedVal;
    // Update category options if name changed
    if (name !== oldName) {
      updateCategoryOptions();
    }
    // Update any expense items' text that belong to this category (if name changed)
    if (name !== oldName) {
      data.expenses
        .filter(exp => exp.categoryId === id)
        .forEach(exp => {
          const expItem = document.querySelector(`.history-item[data-type="expense"][data-id="${exp.id}"]`);
          if (expItem) {
            const textSpan = expItem.querySelector('.item-text');
            const amountStr = `$${exp.amount.toFixed(2)}`;
            textSpan.textContent = exp.desc 
              ? `Expense (${name}): ${amountStr} - ${exp.desc}` 
              : `Expense (${name}): ${amountStr}`;
          }
        });
    }
    // Update the category's entry in history (allocated or type might have changed)
    updateAllCategoriesUI();
    closeModal(editCategoryModal);
  });
});
