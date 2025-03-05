// Expense & Budget Tracker Script (Data Migration, Backward Compatibility, and Dynamic UI Update)

// Data structure to hold all tracker data (incomes, expenses, categories)
let data = { incomes: [], expenses: [], categories: [] };

// Run migration and initialization when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  migrateLocalStorage();   // Convert old data format to new, if needed
  initData();              // Initialize the data object from localStorage
  renderAll();             // Render the UI with existing data
  setupEventListeners();   // Set up form submit handlers for adding entries
});

/**
 * Data Migration: Convert old localStorage keys to new format.
 * This ensures users' previously saved data (incomes, expenses, budgets) is not lost.
 */
function migrateLocalStorage() {
  const oldIncomes = localStorage.getItem('incomes');
  const oldExpenses = localStorage.getItem('expenses');
  const oldBudgets = localStorage.getItem('budgets');
  
  // Only proceed if we detect old format data
  if (oldIncomes || oldExpenses || oldBudgets) {
    // If the new format ("trackerData") isn't already present, create it
    if (!localStorage.getItem('trackerData')) {
      let incomesArr = [];
      let expensesArr = [];
      let categoriesArr = [];
      try {
        if (oldIncomes) incomesArr = JSON.parse(oldIncomes);
      } catch (e) { /* if parsing fails, leave incomesArr empty */ }
      try {
        if (oldExpenses) expensesArr = JSON.parse(oldExpenses);
      } catch (e) { /* if parsing fails, leave expensesArr empty */ }
      try {
        if (oldBudgets) {
          const parsedBudgets = JSON.parse(oldBudgets);
          if (Array.isArray(parsedBudgets)) {
            categoriesArr = parsedBudgets;  // old budgets were already an array of category objects
          } else if (parsedBudgets && typeof parsedBudgets === 'object') {
            // If old budgets were stored as an object mapping (key: category name, value: budget number)
            categoriesArr = Object.keys(parsedBudgets).map(name => ({
              name: name,
              budget: parsedBudgets[name]
            }));
          }
        }
      } catch (e) { /* leave categoriesArr empty if any parsing fails */ }
      
      // Create the new unified data object
      const newData = {
        incomes: incomesArr || [],
        expenses: expensesArr || [],
        categories: categoriesArr || []
      };
      localStorage.setItem('trackerData', JSON.stringify(newData));
    }
    
    // Clean up old keys to avoid confusion (data is now in trackerData)
    localStorage.removeItem('incomes');
    localStorage.removeItem('expenses');
    localStorage.removeItem('budgets');
  }
}

/**
 * Initialize the global data object from localStorage (new format).
 * Ensures backward compatibility by populating all sections from stored data.
 */
function initData() {
  const storedData = localStorage.getItem('trackerData');
  if (storedData) {
    try {
      data = JSON.parse(storedData);
    } catch (e) {
      console.error("Failed to parse stored data, resetting to defaults.", e);
      data = { incomes: [], expenses: [], categories: [] };
    }
    // Ensure each key exists and is an array (in case old data was partial)
    if (!Array.isArray(data.incomes)) data.incomes = [];
    if (!Array.isArray(data.expenses)) data.expenses = [];
    if (!Array.isArray(data.categories)) data.categories = [];
  } else {
    // No existing data (new user or cleared storage)
    data = { incomes: [], expenses: [], categories: [] };
  }
}

/** Helper to save the current data object back to localStorage */
function saveData() {
  localStorage.setItem('trackerData', JSON.stringify(data));
}

/** Helper to format numbers as currency strings (e.g., 123.4 -> "$123.40") */
function formatCurrency(num) {
  // Ensure num is a number
  if (typeof num !== 'number') num = parseFloat(num) || 0;
  const formatted = num.toFixed(2);
  // Handle negative values to display as -$xx.xx
  return (num < 0 ? "-$" : "$") + Math.abs(num).toFixed(2);
}

/** Calculate total spent for a given category by summing relevant expenses */
function calculateSpent(categoryName) {
  return data.expenses
    .filter(exp => exp.category === categoryName)
    .reduce((sum, exp) => sum + (typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0), 0);
}

/** Render all sections (incomes, expenses, and budget categories) */
function renderAll() {
  renderIncomes();
  renderExpenses();
  renderCategories();
}

/** Render the incomes table */
function renderIncomes() {
  const incomeList = document.getElementById('income-list');
  incomeList.innerHTML = "";  // Clear existing rows
  data.incomes.forEach((inc) => {
    const row = document.createElement('tr');
    const descCell = document.createElement('td');
    const amtCell = document.createElement('td');
    descCell.textContent = inc.description || "";
    amtCell.textContent = formatCurrency(inc.amount);
    amtCell.classList.add('income-amount');  // style income amount in green
    row.appendChild(descCell);
    row.appendChild(amtCell);
    incomeList.appendChild(row);
  });
}

/** Render the expenses table */
function renderExpenses() {
  const expenseList = document.getElementById('expense-list');
  expenseList.innerHTML = "";  // Clear existing rows
  data.expenses.forEach((exp) => {
    const row = document.createElement('tr');
    const descCell = document.createElement('td');
    const amtCell = document.createElement('td');
    const catCell = document.createElement('td');
    descCell.textContent = exp.description || "";
    amtCell.textContent = formatCurrency(exp.amount);
    amtCell.classList.add('expense-amount');  // style expense amount in red
    catCell.textContent = exp.category || "";
    row.appendChild(descCell);
    row.appendChild(amtCell);
    row.appendChild(catCell);
    expenseList.appendChild(row);
  });
}

/** Render the budget categories table and update the category dropdown options */
function renderCategories() {
  const budgetList = document.getElementById('budget-list');
  budgetList.innerHTML = "";  // Clear existing rows
  data.categories.forEach((cat) => {
    const spent = calculateSpent(cat.name);
    const remaining = cat.budget - spent;
    // Create table row for this category
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const budgetCell = document.createElement('td');
    const spentCell = document.createElement('td');
    const remainingCell = document.createElement('td');
    nameCell.textContent = cat.name;
    budgetCell.textContent = formatCurrency(cat.budget);
    spentCell.textContent = formatCurrency(spent);
    remainingCell.textContent = formatCurrency(remaining);
    // If over budget, mark the remaining cell for special styling
    if (remaining < 0) {
      remainingCell.classList.add('over-budget');
    }
    row.appendChild(nameCell);
    row.appendChild(budgetCell);
    row.appendChild(spentCell);
    row.appendChild(remainingCell);
    budgetList.appendChild(row);
  });
  // Update the category dropdown options for expenses form
  populateCategoryOptions();
}

/** Update the expense category <select> with current categories */
function populateCategoryOptions() {
  const select = document.getElementById('expenseCategory');
  // Remember the currently selected value (if any) to restore it after repopulating
  const currentSelection = select.value;
  select.innerHTML = '<option value="" disabled selected>Select category</option>';
  data.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    select.appendChild(option);
  });
  // Try to restore previous selection if it still exists in options
  if (currentSelection) {
    select.value = currentSelection;
  }
}

/** Set up event listeners for the forms to handle adding new entries */
function setupEventListeners() {
  // Add Income Form Submission
  document.getElementById('income-form').addEventListener('submit', addIncome);
  // Add Expense Form Submission
  document.getElementById('expense-form').addEventListener('submit', addExpense);
  // Add Category Form Submission
  document.getElementById('category-form').addEventListener('submit', addCategory);
}

/** Handle adding a new income */
function addIncome(event) {
  event.preventDefault();
  const descInput = document.getElementById('incomeDesc');
  const amountInput = document.getElementById('incomeAmount');
  const description = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  if (!description || isNaN(amount)) {
    return;  // Do not add if input is invalid
  }
  // Create new income object (we can add additional properties like date if needed)
  const newIncome = { description: description, amount: amount };
  data.incomes.push(newIncome);
  saveData();       // Save updated data to localStorage (preserving data across sessions)
  renderIncomes();  // Update the incomes list in the UI
  // Apply animation to the newly added income row
  const incomeRows = document.querySelectorAll('#income-list tr');
  if (incomeRows.length > 0) {
    const lastRow = incomeRows[incomeRows.length - 1];
    lastRow.classList.add('fade-in');
    setTimeout(() => lastRow.classList.remove('fade-in'), 500);
  }
  // Clear the form inputs
  descInput.value = "";
  amountInput.value = "";
}

/** Handle adding a new expense */
function addExpense(event) {
  event.preventDefault();
  const descInput = document.getElementById('expenseDesc');
  const amountInput = document.getElementById('expenseAmount');
  const catSelect = document.getElementById('expenseCategory');
  const description = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = catSelect.value;
  if (!description || isNaN(amount) || !category) {
    return;  // Require all fields to be filled with valid data
  }
  const newExpense = { description: description, amount: amount, category: category };
  data.expenses.push(newExpense);
  saveData();        // Save to localStorage in new format
  renderExpenses();  // Update expenses list
  renderCategories(); // Update budget stats (spent/remaining) since a new expense affects them
  // Animate the new expense entry
  const expenseRows = document.querySelectorAll('#expense-list tr');
  if (expenseRows.length > 0) {
    const lastRow = expenseRows[expenseRows.length - 1];
    lastRow.classList.add('fade-in');
    setTimeout(() => lastRow.classList.remove('fade-in'), 500);
  }
  // Clear the form inputs
  descInput.value = "";
  amountInput.value = "";
  catSelect.value = "";  // Reset to "Select category"
}

/** Handle adding (or updating) a budget category */
function addCategory(event) {
  event.preventDefault();
  const nameInput = document.getElementById('categoryName');
  const budgetInput = document.getElementById('categoryBudget');
  const name = nameInput.value.trim();
  const budgetAmount = parseFloat(budgetInput.value);
  if (!name || isNaN(budgetAmount)) {
    return;  // Require valid category name and budget number
  }
  // Check if this category already exists (to avoid duplicates)
  const existingCat = data.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existingCat) {
    // If category exists, update its budget (maintains backward compatibility for editing budgets)
    existingCat.budget = budgetAmount;
  } else {
    // If new category, add it to the list
    const newCategory = { name: name, budget: budgetAmount };
    data.categories.push(newCategory);
  }
  saveData();
  renderCategories();  // Re-render categories table and dropdown (new category will appear)
  // Animate the new/updated category row (if added at end, it will fade in)
  const categoryRows = document.querySelectorAll('#budget-list tr');
  if (categoryRows.length > 0) {
    const lastRow = categoryRows[categoryRows.length - 1];
    lastRow.classList.add('fade-in');
    setTimeout(() => lastRow.classList.remove('fade-in'), 500);
  }
  // Clear the form inputs
  nameInput.value = "";
  budgetInput.value = "";
}
