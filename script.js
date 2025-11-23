document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Helper to format date to YYYY-MM-DD
    const formatDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // --- Common Navigation Active State ---
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else if (currentPage === 'index.html' && link.getAttribute('href') === 'index.html') {
            link.classList.add('active');
        }
    });

    // --- Index Page (Monthly Calendar + Ledger Modal) Logic ---
    if (currentPage === 'index.html') {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthYearSpan = document.getElementById('current-month-year');
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        const ledgerModal = document.getElementById('ledger-modal');
        const closeModalBtn = ledgerModal.querySelector('.close-button');
        const modalDateSpan = document.getElementById('modal-date');
        const dailyIncomeSumSpan = document.getElementById('daily-income-sum');
        const dailyExpenseSumSpan = document.getElementById('daily-expense-sum');
        const dailyNetSumSpan = document.getElementById('daily-net-sum');

        const transactionTypeRadios = document.querySelectorAll('input[name="transaction-type"]');
        const transactionCategorySelect = document.getElementById('transaction-category');
        const transactionDescriptionInput = document.getElementById('transaction-description');
        const transactionAmountInput = document.getElementById('transaction-amount');
        const addTransactionBtn = document.getElementById('add-transaction-btn');
        const transactionList = document.getElementById('transaction-list');

        let currentMonth = new Date().getMonth();
        let currentYear = new Date().getFullYear();
        let selectedDateForModal = null; // Stores the date string for the modal (YYYY-MM-DD)

        // Generate calendar for a given month and year
        const initCalendar = (month, year) => {
            calendarGrid.innerHTML = ''; // Clear previous calendar
            currentMonthYearSpan.textContent = `${year}년 ${month + 1}월`;

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const firstDayOfWeek = firstDay.getDay(); // 0 for Sunday, 1 for Monday, etc.

            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            weekdays.forEach(day => {
                const weekdayDiv = document.createElement('div');
                weekdayDiv.classList.add('calendar-weekday');
                weekdayDiv.textContent = day;
                calendarGrid.appendChild(weekdayDiv);
            });

            // Add empty cells for the days before the first day of the month
            for (let i = 0; i < firstDayOfWeek; i++) {
                const emptyDiv = document.createElement('div');
                calendarGrid.appendChild(emptyDiv);
            }

            // Add days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('calendar-day');

                const dayNumberSpan = document.createElement('span');
                dayNumberSpan.classList.add('day-number');
                dayNumberSpan.textContent = day;
                dayDiv.appendChild(dayNumberSpan);

                const currentDate = new Date(year, month, day);
                const formattedDate = formatDate(currentDate);

                if (currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear() &&
                    currentDate.getDate() === new Date().getDate()) {
                    dayDiv.classList.add('today');
                }

                dayDiv.dataset.date = formattedDate;

                // Display daily summary for the day
                const dailyData = loadLedgerData(formattedDate);
                let dailyIncome = 0;
                let dailyExpense = 0;
                dailyData.forEach(item => {
                    if (item.type === 'income') dailyIncome += item.amount;
                    else dailyExpense += item.amount;
                });
                const dailyNet = dailyIncome - dailyExpense;

                if (dailyIncome > 0 || dailyExpense > 0) {
                    const summaryDiv = document.createElement('div');
                    summaryDiv.classList.add('day-summary');

                    if (dailyIncome > 0) {
                        const incomeText = document.createElement('span');
                        incomeText.classList.add('income-text');
                        incomeText.textContent = `+${dailyIncome.toLocaleString()}원`;
                        summaryDiv.appendChild(incomeText);
                    }
                    if (dailyExpense > 0) {
                        const expenseText = document.createElement('span');
                        expenseText.classList.add('expense-text');
                        expenseText.textContent = `-${dailyExpense.toLocaleString()}원`;
                        summaryDiv.appendChild(expenseText);
                    }
                    dayDiv.appendChild(summaryDiv);
                }

                dayDiv.addEventListener('click', () => {
                    openLedgerModal(formattedDate);
                });
                calendarGrid.appendChild(dayDiv);
            }
        };

        // Event listeners for month navigation
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            initCalendar(currentMonth, currentYear);
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            initCalendar(currentMonth, currentYear);
        });

        // Open Ledger Modal
        const openLedgerModal = (dateString) => {
            selectedDateForModal = dateString;
            modalDateSpan.textContent = dateString + ' 내역';
            renderLedgerList(dateString);
            ledgerModal.classList.add('open'); // Show modal
        };

        // Close Ledger Modal
        const closeLedgerModal = () => {
            ledgerModal.classList.remove('open'); // Hide modal
            selectedDateForModal = null;
            transactionDescriptionInput.value = '';
            transactionAmountInput.value = '';
            transactionTypeRadios[0].checked = true; // Reset to income
            transactionCategorySelect.value = '식비'; // Reset to default category
            initCalendar(currentMonth, currentYear); // Re-render calendar to update daily summaries
        };

        // Close modal when 'x' is clicked
        closeModalBtn.addEventListener('click', closeLedgerModal);

        // Close modal when clicking outside of modal content
        ledgerModal.addEventListener('click', (event) => {
            if (event.target === ledgerModal) {
                closeLedgerModal();
            }
        });

        // Load ledger data from LocalStorage for a specific date
        const loadLedgerData = (dateString) => {
            const data = JSON.parse(localStorage.getItem(`ledger-${dateString}`)) || [];
            return data;
        };

        // Save ledger data to LocalStorage for a specific date
        const saveLedgerData = (dateString, items) => {
            localStorage.setItem(`ledger-${dateString}`, JSON.stringify(items));
        };

        // Render ledger list and update sums
        const renderLedgerList = (dateString) => {
            transactionList.innerHTML = '';
            const items = loadLedgerData(dateString);

            let totalIncome = 0;
            let totalExpense = 0;

            if (items.length === 0) {
                transactionList.innerHTML = '<li>등록된 내역이 없습니다.</li>';
            } else {
                items.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.dataset.id = item.id;
                    const typeClass = item.type === 'income' ? 'income' : 'expense';
                    const typeText = item.type === 'income' ? '수입' : '지출';
                    const sign = item.type === 'income' ? '+' : '-';

                    listItem.innerHTML = `
                        <div class="transaction-meta">
                            <span class="transaction-type ${typeClass}">${typeText}</span>
                            <span class="transaction-category">${item.category}</span>
                            <span class="transaction-description-text">${item.description}</span>
                        </div>
                        <span class="transaction-amount ${typeClass}">${sign}${item.amount.toLocaleString()}원</span>
                        <button class="delete-btn">삭제</button>
                    `;

                    listItem.querySelector('.delete-btn').addEventListener('click', () => {
                        deleteLedgerItem(dateString, item.id);
                    });
                    transactionList.appendChild(listItem);

                    if (item.type === 'income') {
                        totalIncome += item.amount;
                    } else {
                        totalExpense += item.amount;
                    }
                });
            }

            dailyIncomeSumSpan.textContent = totalIncome.toLocaleString() + '원';
            dailyExpenseSumSpan.textContent = totalExpense.toLocaleString() + '원';
            dailyNetSumSpan.textContent = (totalIncome - totalExpense).toLocaleString() + '원';
            dailyNetSumSpan.style.color = (totalIncome - totalExpense) >= 0 ? '#28a745' : '#dc3545';
        };

        // Add new ledger item
        const addLedgerItem = () => {
            const type = document.querySelector('input[name="transaction-type"]:checked').value;
            const category = transactionCategorySelect.value;
            const description = transactionDescriptionInput.value.trim();
            const amount = parseFloat(transactionAmountInput.value);

            if (!selectedDateForModal) {
                alert('날짜가 선택되지 않았습니다.');
                return;
            }
            if (description === '') {
                alert('내용을 입력해주세요.');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('유효한 금액을 입력해주세요. 금액은 0보다 커야 합니다.');
                return;
            }

            const items = loadLedgerData(selectedDateForModal);
            const newItem = {
                id: Date.now(),
                type: type,
                category: category,
                description: description,
                amount: amount
            };
            items.push(newItem);
            saveLedgerData(selectedDateForModal, items);
            renderLedgerList(selectedDateForModal);

            transactionDescriptionInput.value = '';
            transactionAmountInput.value = '';
            // No need to call initCalendar here, as renderLedgerList updates the modal,
            // and calendar is re-rendered on modal close.
        };

        addTransactionBtn.addEventListener('click', addLedgerItem);

        // Delete ledger item
        const deleteLedgerItem = (dateString, id) => {
            let items = loadLedgerData(dateString);
            items = items.filter(item => item.id !== id);
            saveLedgerData(dateString, items);
            renderLedgerList(dateString);
        };

        // Initial calendar render
        initCalendar(currentMonth, currentYear);
    }

    // --- Stats Page Logic ---
    else if (currentPage === 'stats.html') {
        const statsTotalIncomeSpan = document.getElementById('stats-total-income');
        const statsTotalExpenseSpan = document.getElementById('stats-total-expense');
        const statsNetBalanceSpan = document.getElementById('stats-net-balance');
        const categoryExpenseTableBody = document.querySelector('#category-expense-table tbody');
        const expensePieChartCanvas = document.getElementById('expense-pie-chart');

        const initStatsPage = () => {
            const allStorageKeys = Object.keys(localStorage);
            let monthlyTotalIncome = 0;
            let monthlyTotalExpense = 0;
            const categoryExpenses = {}; // { category: amount }

            const currentMonthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"

            allStorageKeys.forEach(key => {
                if (key.startsWith('ledger-') && key.substring(7, 14) === currentMonthYear) {
                    const dateString = key.substring(7);
                    const transactions = loadLedgerData(dateString);

                    transactions.forEach(item => {
                        if (item.type === 'income') {
                            monthlyTotalIncome += item.amount;
                        } else {
                            monthlyTotalExpense += item.amount;
                            categoryExpenses[item.category] = (categoryExpenses[item.category] || 0) + item.amount;
                        }
                    });
                }
            });

            statsTotalIncomeSpan.textContent = monthlyTotalIncome.toLocaleString() + '원';
            statsTotalExpenseSpan.textContent = monthlyTotalExpense.toLocaleString() + '원';
            statsNetBalanceSpan.textContent = (monthlyTotalIncome - monthlyTotalExpense).toLocaleString() + '원';
            statsNetBalanceSpan.style.color = (monthlyTotalIncome - monthlyTotalExpense) >= 0 ? '#28a745' : '#dc3545';

            // Render category-wise expenses table
            categoryExpenseTableBody.innerHTML = '';
            const sortedCategories = Object.keys(categoryExpenses).sort((a, b) => categoryExpenses[b] - categoryExpenses[a]);
            if (sortedCategories.length === 0) {
                categoryExpenseTableBody.innerHTML = '<tr><td colspan="2">이번 달 지출 내역이 없습니다.</td></tr>';
            } else {
                sortedCategories.forEach(category => {
                    const row = categoryExpenseTableBody.insertRow();
                    const categoryCell = row.insertCell();
                    const amountCell = row.insertCell();
                    categoryCell.textContent = category;
                    amountCell.textContent = categoryExpenses[category].toLocaleString() + '원';
                });
            }

            // Render pie chart (Chart.js)
            if (expensePieChartCanvas) {
                const chartLabels = sortedCategories;
                const chartData = sortedCategories.map(category => categoryExpenses[category]);
                const chartColors = [
                    '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', // Red, Blue, Green, Yellow, Purple
                    '#34495e', '#1abc9c', '#f39c12', '#d35400', '#c0392b'  // Dark Blue, Turquoise, Orange, Dark Orange, Dark Red
                ];

                new Chart(expensePieChartCanvas, {
                    type: 'pie',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: chartData,
                            backgroundColor: chartColors.slice(0, chartLabels.length),
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                text: '카테고리별 지출 분포'
                            }
                        }
                    }
                });
            }
        };

        // Helper function for stats page to load ledger data (reusing from index.html concept)
        const loadLedgerData = (dateString) => {
            const data = JSON.parse(localStorage.getItem(`ledger-${dateString}`)) || [];
            return data;
        };

        initStatsPage();
    }

    // --- About Page Logic ---
    else if (currentPage === 'about.html') {
        // No specific JS needed for About page beyond navigation active state
        console.log('About page loaded');
    }

    // --- Daily/Weekly Page (Placeholder) Logic ---
    else if (currentPage === 'daily.html' || currentPage === 'weekly.html') {
        // These pages are placeholders for now, just logging
        console.log(`${currentPage} page loaded`);
    }
});
