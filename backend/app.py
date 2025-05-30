from flask import Flask, jsonify, request
from flask_cors import CORS
from pycoingecko import CoinGeckoAPI
import matplotlib.pyplot as plt
import io
import base64
import time # Import the time module

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

cg = CoinGeckoAPI()

@app.route('/')
def home():
    return "TrendBot Backend is running!"

@app.route('/api/trend', methods=['GET'])
def get_trend():
    coin = request.args.get('coin', 'bitcoin').lower()
    mode = request.args.get('mode', '24h')

    try:
        # Introduce a small delay before calling CoinGecko API
        time.sleep(1)

        if mode == "graph":
            data = cg.get_coin_market_chart_by_id(id=coin, vs_currency='usd', days=1)
            prices = [p[1] for p in data['prices']]

            if not prices:
                return jsonify({"error": "No price data available for graph."}), 404

            plt.figure(figsize=(10, 4))
            plt.plot(prices, color='#BD93F9') # Dracula Purple
            plt.title(f"{coin.capitalize()} - 24h Price Chart", color='#F8F8F2') # Dracula Foreground
            plt.xlabel("Time", color='#F8F8F2')
            plt.ylabel("Price (USD)", color='#F8F8F2')
            plt.grid(True, color='#6272A4', linestyle=':', alpha=0.7) # Dracula Light Grey
            plt.gca().set_facecolor('#282A36') # Dracula Background
            plt.gcf().set_facecolor('#282A36') # Dracula Background
            plt.tick_params(colors='#F8F8F2') # Dracula Foreground for ticks

            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            buf.close()
            plt.close()
            return jsonify({"coin": coin, "mode": mode, "image": image_base64})
        else:
            days = 1 if mode == "24h" else 7
            data = cg.get_coin_market_chart_by_id(id=coin, vs_currency='usd', days=days)
            prices = [p[1] for p in data['prices']]

            if len(prices) < 2:
                return jsonify({"error": "Insufficient data to calculate trend."}), 404

            change = prices[-1] - prices[0]
            percent = (change / prices[0]) * 100
            direction = "Rising" if change > 0 else "Falling" if change < 0 else "Stable"
            return jsonify({
                "coin": coin,
                "mode": mode,
                "direction": direction,
                "change": f"{change:.2f}",
                "percent": f"{percent:.2f}"
            })
    except Exception as e:
        print(f"Error fetching trend data for {coin} ({mode}): {e}")
        # Check if the error is due to CoinGecko's rate limit
        if "429" in str(e) or "403" in str(e): # Common status codes for rate limit
            return jsonify({"error": "Rate limit hit. Please wait a moment and try again."}), 429
        return jsonify({"error": "Could not fetch trend data. Please check the coin name."}), 500

@app.route('/api/top_coins', methods=['GET'])
def get_top_coins():
    try:
        # Introduce a small delay before calling CoinGecko API
        time.sleep(1)

        coins_data = cg.get_coins_markets(vs_currency='usd', order='market_cap_desc', per_page=10, page=1, sparkline=False)
        top_coins = []
        for coin in coins_data:
            top_coins.append({
                "id": coin['id'],
                "name": coin['name'],
                "symbol": coin['symbol'].upper(),
                "current_price": coin['current_price'],
                "price_change_percentage_24h": coin['price_change_percentage_24h']
            })
        return jsonify(top_coins)
    except Exception as e:
        print(f"Error fetching top coins: {e}")
        # Check if the error is due to CoinGecko's rate limit
        if "429" in str(e) or "403" in str(e):
            return jsonify({"error": "Rate limit hit for top coins. Please wait a moment."}), 429
        return jsonify({"error": "Could not fetch top cryptocurrencies."}), 500

if __name__ == '__main__':
    app.run(debug=True)