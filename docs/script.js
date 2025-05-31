// frontend/script.js

// *** IMPORTANT: Update this URL to your deployed Render backend URL ***
// This should be the base URL of your Render service, WITHOUT /api at the end.
const API_BASE_URL = 'https://47fc-103-160-233-177.ngrok-free.app/'; // <--- CHANGE THIS: Removed '/api'

const coinInput = document.getElementById('coinInput');
const getTrendButton = document.getElementById('getTrendButton');
const modeButtons = document.querySelectorAll('.mode-button');
const trendResults = document.getElementById('trendResults');
const trendSpinner = document.getElementById('trendSpinner');
const trendError = document.getElementById('trendError');
const topCoinsList = document.getElementById('topCoinsList');
const topCoinsSpinner = document.getElementById('topCoinsSpinner');
const topCoinsError = document.getElementById('topCoinsError');

let currentMode = '24h'; // Default mode

// --- Helper Functions for UI State ---
function showLoading(element, spinnerElement) {
    element.innerHTML = ''; // Clear previous content
    element.classList.add('loading'); // Add a class for styling if needed
    spinnerElement.classList.remove('hidden');
    hideError(trendError); // Ensure any previous error is hidden when loading starts
}

function hideLoading(element, spinnerElement) {
    element.classList.remove('loading');
    spinnerElement.classList.add('hidden');
}

// MODIFIED: More robust error display
function showError(errorElement, message) {
    if (message) { // Only show if there's an actual message
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    } else { // If no message, ensure it stays hidden and cleared
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
}

// MODIFIED: Ensure error message content is cleared when hidden
function hideError(errorElement) {
    errorElement.textContent = ''; // Clear text content
    errorElement.classList.add('hidden');
}

// --- Fetching Functions ---

async function fetchTrendData(coin, mode) {
    showLoading(trendResults, trendSpinner);
    try {
        // Corrected API call: API_BASE_URL now correctly combines with /api/trend
        const response = await fetch(`${API_BASE_URL}/api/trend?coin=${coin}&mode=${mode}`);
        const data = await response.json();

        hideLoading(trendResults, trendSpinner);

        if (response.ok) {
            updateTrendDisplay(data, mode);
        } else {
            showError(trendError, data.error || 'An unknown error occurred.');
        }
    } catch (error) {
        console.error('Error fetching trend data:', error);
        hideLoading(trendResults, trendSpinner);
        showError(trendError, 'Network error. Please check your connection or backend server.');
    }
}

async function fetchTopCoins() {
    hideError(topCoinsError); // Ensure error is hidden before showing loading
    showLoading(topCoinsList, topCoinsSpinner);
    try {
        // Corrected API call: API_BASE_URL now correctly combines with /api/top_coins
        const response = await fetch(`${API_BASE_URL}/api/top_coins`);
        const data = await response.json();

        hideLoading(topCoinsList, topCoinsSpinner);

        if (response.ok) {
            updateTopCoinsDisplay(data);
        } else {
            showError(topCoinsError, data.error || 'Failed to load top cryptocurrencies.');
        }
    } catch (error) {
        console.error('Error fetching top coins:', error);
        hideLoading(topCoinsList, topCoinsSpinner);
        showError(topCoinsError, 'Network error. Could not load top cryptos.');
    }
}

// --- UI Update Functions ---

function updateTrendDisplay(data, mode) {
    trendResults.innerHTML = ''; // Clear previous content

    if (mode === 'graph' && data.image) {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${data.image}`;
        img.alt = 'Crypto Trend Chart';
        img.classList.add('chart-image');
        trendResults.appendChild(img);
    } else if (data.direction) {
        const reportDiv = document.createElement('div');
        reportDiv.classList.add('trend-report');

        let directionClass = '';
        if (data.direction === 'Rising') {
            directionClass = 'positive';
        } else if (data.direction === 'Falling') {
            directionClass = 'negative';
        } else {
            directionClass = 'stable';
        }

        reportDiv.innerHTML = `
            <strong>${data.coin}</strong> (${data.mode}) is:
            <span class="direction ${directionClass}">${data.direction}</span>
            <br>Change: $${data.change} (${data.percent}%)
        `;
        trendResults.appendChild(reportDiv);
    } else {
        trendResults.innerHTML = '<p class="placeholder-text">No trend data available for this selection.</p>';
    }
}

function updateTopCoinsDisplay(coins) {
    topCoinsList.innerHTML = ''; // Clear spinner/error and previous items
    if (coins.length === 0) {
        topCoinsList.innerHTML = '<p class="placeholder-text">No top cryptocurrencies found.</p>';
        return;
    }

    coins.forEach(coin => {
        const item = document.createElement('div');
        item.classList.add('top-coin-item');
        item.dataset.coinId = coin.id; // Store coin ID for click event

        const changeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const formattedChange = coin.price_change_percentage_24h ? `${coin.price_change_percentage_24h.toFixed(2)}%` : 'N/A';
        const formattedPrice = coin.current_price ? `$${coin.current_price.toFixed(2)}` : 'N/A';

        item.innerHTML = `
            <span class="top-coin-name">${coin.name} (${coin.symbol})</span>
            <span class="top-coin-price">${formattedPrice}</span>
            <span class="top-coin-change ${changeClass}">${formattedChange}</span>
        `;
        topCoinsList.appendChild(item);
    });
}


// --- Event Listeners ---

getTrendButton.addEventListener('click', () => {
    const coin = coinInput.value.trim();
    if (coin) {
        fetchTrendData(coin, currentMode);
    } else {
        showError(trendError, 'Please enter a cryptocurrency name.');
    }
});

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active')); // Deactivate all
        button.classList.add('active'); // Activate clicked one
        currentMode = button.dataset.mode;

        const coin = coinInput.value.trim();
        if (coin) {
            fetchTrendData(coin, currentMode);
        }
    });
});

// Event delegation for top crypto list clicks
topCoinsList.addEventListener('click', (event) => {
    const item = event.target.closest('.top-coin-item');
    if (item && item.dataset.coinId) {
        const coinId = item.dataset.coinId;
        coinInput.value = coinId; // Set input field to the clicked coin
        fetchTrendData(coinId, currentMode); // Fetch trend for the clicked coin
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    fetchTopCoins(); // Load top cryptocurrencies on page load
});