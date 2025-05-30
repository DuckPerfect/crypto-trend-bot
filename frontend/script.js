// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const coinInput = document.getElementById('coinInput');
    const searchButton = document.getElementById('searchButton');
    const modeButtons = document.querySelectorAll('.mode-button');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    const topCoinsList = document.getElementById('topCoinsList');
    const topCoinsLoading = document.getElementById('topCoinsLoading');
    const topCoinsError = document.getElementById('topCoinsError');

    let currentMode = '24h'; // Default mode

    // Set active mode button
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentMode = button.dataset.mode;
            // Optionally, trigger search if a coin is already entered
            if (coinInput.value.trim() !== '') {
                fetchTrend();
            }
        });
    });

    searchButton.addEventListener('click', fetchTrend);
    coinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchTrend();
        }
    });

    async function fetchTrend() {
        const coin = coinInput.value.trim();
        if (!coin) {
            displayError("Please enter a cryptocurrency name.", errorDiv);
            return;
        }

        resultsDiv.innerHTML = ''; // Clear previous results
        errorDiv.style.display = 'none'; // Hide any previous errors
        loadingDiv.style.display = 'flex'; // Show loading spinner
        // resultsDiv.classList.remove('no-border'); // This class isn't defined or used for border hiding, can remove or implement if needed

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/trend?coin=${coin}&mode=${currentMode}`);
            const data = await response.json();

            loadingDiv.style.display = 'none'; // Hide loading spinner

            if (!response.ok) {
                displayError(data.error || "An unknown error occurred.", errorDiv);
                // resultsDiv.classList.add('no-border'); // If you want to hide border on error
                return;
            }

            if (currentMode === 'graph') {
                if (data.image) {
                    resultsDiv.innerHTML = `<img src="data:image/png;base64,${data.image}" alt="${coin} Trend Chart" class="chart-image">`;
                } else {
                    displayError("No graph image data received.", errorDiv);
                }
            } else {
                let directionClass = '';
                let directionIcon = '';
                if (data.direction === 'Rising') {
                    directionClass = 'positive';
                    directionIcon = '<i class="fas fa-arrow-up"></i>';
                } else if (data.direction === 'Falling') {
                    directionClass = 'negative';
                    directionIcon = '<i class="fas fa-arrow-down"></i>';
                } else {
                    directionClass = 'stable';
                    directionIcon = '<i class="fas fa-equals"></i>';
                }

                resultsDiv.innerHTML = `
                    <p class="trend-report">
                        📊 <strong>TrendBot ${data.mode} Report</strong><br>
                        <strong>${data.coin}</strong> is: <span class="direction ${directionClass}">${directionIcon} ${data.direction}</span><br>
                        Change: $${data.change} (${data.percent}%)
                    </p>
                `;
            }

        } catch (error) {
            console.error("Fetch trend error:", error);
            loadingDiv.style.display = 'none'; // Hide loading spinner
            displayError("Failed to connect to the backend. Please ensure the server is running and try again.", errorDiv);
        }
    }

    async function fetchTopCoins() {
        topCoinsList.innerHTML = '<p class="placeholder-text">Loading top cryptos...</p>';
        topCoinsError.style.display = 'none';
        topCoinsLoading.style.display = 'flex';

        try {
            const response = await fetch('http://127.0.0.1:5000/api/top_coins');
            const data = await response.json();

            topCoinsLoading.style.display = 'none';

            if (!response.ok) {
                displayError(data.error || "Failed to load top cryptos.", topCoinsError);
                topCoinsList.innerHTML = ''; // Clear placeholder
                return;
            }

            displayTopCoins(data);

        } catch (error) {
            console.error("Fetch top coins error:", error);
            topCoinsLoading.style.display = 'none';
            displayError("Failed to connect to the backend or fetch top cryptos.", topCoinsError);
            topCoinsList.innerHTML = ''; // Clear placeholder
        }
    }

    function displayTopCoins(coins) {
        topCoinsList.innerHTML = ''; // Clear placeholder/previous items
        if (coins.length === 0) {
            topCoinsList.innerHTML = '<p class="placeholder-text">No top cryptocurrencies available.</p>';
            return;
        }

        coins.forEach(coin => {
            const item = document.createElement('div');
            item.classList.add('top-coin-item');
            item.dataset.coinId = coin.id; // Store coin ID for lookup

            let changeClass = '';
            if (coin.price_change_percentage_24h > 0) {
                changeClass = 'positive';
            } else if (coin.price_change_percentage_24h < 0) {
                changeClass = 'negative';
            }

            // Create the individual spans for name, price, and change
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('top-coin-name');
            nameSpan.textContent = `${coin.name} (${coin.symbol})`;
            nameSpan.setAttribute('title', `${coin.name} (${coin.symbol})`); // Add title for full name on hover

            const priceSpan = document.createElement('span');
            priceSpan.classList.add('top-coin-price');
            priceSpan.textContent = `$${coin.current_price.toFixed(2)}`;

            const changeSpan = document.createElement('span');
            changeSpan.classList.add('top-coin-change', changeClass);
            changeSpan.textContent = coin.price_change_percentage_24h ? `${coin.price_change_percentage_24h.toFixed(2)}%` : 'N/A';

            item.appendChild(nameSpan);
            item.appendChild(priceSpan);
            item.appendChild(changeSpan);

            topCoinsList.appendChild(item);

            // Add event listener to click on top coin item
            item.addEventListener('click', () => {
                coinInput.value = coin.id; // Auto-fill search box
                fetchTrend(); // Trigger search for this coin
            });
        });
    }

    function displayError(message, targetElement) {
        targetElement.textContent = `⚠️ ${message}`;
        targetElement.style.display = 'block';
        // For the main results, reset to placeholder if there's an error
        if (targetElement === errorDiv) {
            resultsDiv.innerHTML = '<p class="placeholder-text">Enter a cryptocurrency and select a mode to see its trend.</p>';
        }
    }

    // Initial load: Fetch top coins
    fetchTopCoins();
});