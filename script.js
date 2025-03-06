// Data structures for transactions and categories
let transactions = [];
const categories = [
  { name: "Utilities", budget: 300 },
  { name: "Food", budget: 500 },
  { name: "Rent", budget: 1000 },
  { name: "Entertainment", budget: 200 },
  { name: "Others", budget: 200 }
];

// Load saved data from Local Storage if available
const savedTransactions = localStorage.getItem("transactions");
if (savedTransactions) {
  transactions = JSON.parse(savedTransactions);
}
const savedCategories = localStorage.getItem("categories");
if (savedCategories) {
  // Merge saved budgets into categories (if budgets were adjusted previously)
  const storedCats = JSON.parse(savedCategories);
  storedCats.forEach(storedCat => {
    const cat = categories.find(c => c.name === storedCat.name);
    if (cat) {
      cat.budget = storedCat.budget;
    }
  });
}

// DOM elements
const balanceEl = document.getElementById("totalBalance");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const transactionForm = document.getElementById("transactionForm");
const typeSelect = document.getElementById("type");
const categoryGroup = document.getElementById("categoryGroup");
const categorySelect = document.getElementById("category");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const transactionBody = document.getElementById("transactionBody");
const categoryList = document.getElementById("categoryList");

let editingId = null;
let lastAddedId = null;

// Initialize the display
updateBalance();
updateCategorySummary();
showTransactions();

// Show/hide the category field based on selected type
typeSelect.addEventListener("change", () => {
  if (typeSelect.value === "expense") {
    categoryGroup.style.display = "block";
  } else {
    categoryGroup.style.display = "none";
    categorySelect.value = "";
  }
});

// Form submission handler for adding or updating transactions
transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = typeSelect.value;
  const name = nameInput.value.trim();
  const amountValue = amountInput.value.trim();
  const amount = parseFloat(amountValue);
  const category = categorySelect.value;
  // Validate inputs
  if (!type || name === "" || isNaN(amount) || amount <= 0 || (type === "expense" && !category)) {
    alert("Please fill out all fields correctly.");
    return;
  }
  if (editingId === null) {
    // Add new transaction
    const newId = transactions.length > 0 ? transactions[transactions.length - 1].id + 1 : 1;
    const transaction = { id: newId, type, name, amount };
    transaction.category = (type === "expense") ? category : "";
    transactions.push(transaction);
    lastAddedId = newId;
  } else {
    // Update existing transaction
    const index = transactions.findIndex(tr => tr.id === editingId);
    if (index !== -1) {
      transactions[index].type = type;
      transactions[index].name = name;
      transactions[index].amount = amount;
      transactions[index].category = (type === "expense") ? category : "";
    }
    lastAddedId = editingId;
    editingId = null;
    // Restore form to add mode
    submitBtn.textContent = "Add Transaction";
    cancelEditBtn.style.display = "none";
  }
  // Save to Local Storage and refresh UI
  localStorage.setItem("transactions", JSON.stringify(transactions));
  showTransactions();
  updateBalance();
  updateCategorySummary();
  // Reset form fields
  transactionForm.reset();
  categoryGroup.style.display = "none";
});

// Cancel edit mode
cancelEditBtn.addEventListener("click", () => {
  editingId = null;
  transactionForm.reset();
  categoryGroup.style.display = "none";
  submitBtn.textContent = "Add Transaction";
  cancelEditBtn.style.display = "none";
});

// Display all transactions in the table
function showTransactions() {
  transactionBody.innerHTML = "";
  transactions.forEach(tr => {
    const rowClass = tr.type === "income" ? "income" : "expense";
    const typeText = tr.type.charAt(0).toUpperCase() + tr.type.slice(1);
    const categoryText = (tr.type === "expense") ? tr.category : "-";
    // Table row HTML with data-label attributes for responsive design
    const rowHTML = `
      <tr id="tr-${tr.id}" class="transaction-row ${rowClass}">
        <td data-label="Type">${typeText}</td>
        <td data-label="Description">${tr.name}</td>
        <td data-label="Category">${categoryText}</td>
        <td data-label="Amount">$${tr.amount.toFixed(2)}</td>
        <td data-label="Options">
          <a href="#" class="edit-btn" data-id="${tr.id}">Edit</a>
          <a href="#" class="delete-btn" data-id="${tr.id}">Delete</a>
        </td>
      </tr>`;
    transactionBody.insertAdjacentHTML("beforeend", rowHTML);
  });
  // Highlight the last added or edited transaction
  if (lastAddedId !== null) {
    const newRow = document.getElementById(`tr-${lastAddedId}`);
    if (newRow) {
      newRow.classList.add("new-row");
      setTimeout(() => newRow.classList.remove("new-row"), 1000);
    }
    lastAddedId = null;
  }
}

// Handle edit/delete clicks using event delegation
transactionBody.addEventListener("click", (e) => {
  e.preventDefault();
  const target = e.target;
  if (target.classList.contains("edit-btn")) {
    const id = Number(target.dataset.id);
    startEdit(id);
  } else if (target.classList.contains("delete-btn")) {
    const id = Number(target.dataset.id);
    deleteTransaction(id);
  }
});

// Populate the form fields for editing a transaction
function startEdit(id) {
  const tr = transactions.find(t => t.id === id);
  if (!tr) return;
  editingId = id;
  // Fill form with existing values
  typeSelect.value = tr.type;
  if (tr.type === "expense") {
    categoryGroup.style.display = "block";
    categorySelect.value = tr.category;
  } else {
    categoryGroup.style.display = "none";
    categorySelect.value = "";
  }
  nameInput.value = tr.name;
  amountInput.value = tr.amount;
  submitBtn.textContent = "Update Transaction";
  cancelEditBtn.style.display = "inline-block";
  nameInput.focus();
}

// Delete a transaction by ID
function deleteTransaction(id) {
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    const wasEditing = (editingId === id);
    transactions.splice(index, 1);
    // If the deleted transaction was being edited, exit edit mode
    if (wasEditing) {
      editingId = null;
      transactionForm.reset();
      categoryGroup.style.display = "none";
      submitBtn.textContent = "Add Transaction";
      cancelEditBtn.style.display = "none";
    }
    localStorage.setItem("transactions", JSON.stringify(transactions));
    showTransactions();
    updateBalance();
    updateCategorySummary();
  }
}

// Calculate and display total income, total expense, and balance
function updateBalance() {
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach(tr => {
    if (tr.type === "income") {
      totalIncome += Number(tr.amount);
    } else if (tr.type === "expense") {
      totalExpense += Number(tr.amount);
    }
  });
  const balance = totalIncome - totalExpense;
  balanceEl.textContent = balance.toFixed(2);
  totalIncomeEl.textContent = totalIncome.toFixed(2);
  totalExpenseEl.textContent = totalExpense.toFixed(2);
}

// Update the category-wise budget usage list
function updateCategorySummary() {
  categoryList.innerHTML = "";
  categories.forEach(cat => {
    let spent = 0;
    transactions.forEach(tr => {
      if (tr.type === "expense" && tr.category === cat.name) {
        spent += Number(tr.amount);
      }
    });
    const li = document.createElement("li");
    li.textContent = `${cat.name}: $${spent.toFixed(2)} / $${cat.budget.toFixed(2)}`;
    if (spent > cat.budget) {
      li.style.color = "#f44336";  // highlight if over budget
    }
    categoryList.appendChild(li);
  });
  localStorage.setItem("categories", JSON.stringify(categories));
}
