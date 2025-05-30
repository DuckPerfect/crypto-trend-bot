# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from pycoingecko import CoinGeckoAPI
import matplotlib.pyplot as plt
import io
import base64
from flask_caching import Cache # Import Cache

app = Flask(__name__)
CORS(app)

# --- Cache Configuration ---
config = {
    "DEBUG": True,          # Keep debug mode on for development
    "CACHE_TYPE": "SimpleCache", # Use SimpleCache for in-memory caching (suitable for single-process apps)
    "CACHE_DEFAULT_TIMEOUT": 300 # Default cache timeout in seconds (5 minutes)
}
app.config.from_mapping(config)
cache = Cache(app)
# --- End Cache Configuration ---

cg = CoinGeckoAPI()

@app.route('/')
def home():
    return "TrendBot Backend is running!"

@app.route('/api/trend', methods=['GET'])
@cache.cached(timeout=60, query_string=True) # Cache this route for 60 seconds.
                                            # query_string=True makes sure different coins/modes get separate cache entries.
def get_trend():
    coin_id = request.args.get('coin', 'bitcoin').lower()
    mode = request.args.get('mode', '24h')

    if mode == "graph":
        try:
            data = cg.get_coin_market_chart_by_id(id=coin_id, vs_currency='usd', days=1)
            prices = [p[1] for p in data['prices']]

            if not prices:
                return jsonify({"error": "No price data available for graph"}), 404

            plt.style.use('dark_background')
            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(prices, color='#8BE9FD')
            ax.set_title(f"{coin_id.capitalize()} - 24h Price Chart", color='#F8F8F2', fontsize=16)
            ax.set_xlabel("Time", color='#BD93F9', fontsize=12)
            ax.set_ylabel("Price (USD)", color='#BD93F9', fontsize=12)

            ax.grid(True, linestyle='--', alpha=0.5, color='#44475A')
            ax.set_facecolor('#282A36')
            fig.patch.set_facecolor('#282A36')

            ax.tick_params(axis='x', colors='#F8F8F2')
            ax.tick_params(axis='y', colors='#F8F8F2')

            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color('#6272A4')
            ax.spines['bottom'].set_color('#6272A4')

            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            plt.close(fig)

            img_str = base64.b64encode(buf.read()).decode('utf-8')
            buf.close()
            return jsonify({"image": img_str})

        except Exception as e:
            print(f"Error fetching graph data: {e}")
            return jsonify({"error": "Couldn't fetch graph data. Try again or check coin name."}), 500

    days = 1 if mode == "24h" else 7
    try:
        data = cg.get_coin_market_chart_by_id(id=coin_id, vs_currency='usd', days=days)
        prices = [p[1] for p in data['prices']]

        if len(prices) < 2:
            return jsonify({"error": f"Not enough data for {mode} trend. Try a different coin or timeframe."}), 404

        change = prices[-1] - prices[0]
        percent = (change / prices[0]) * 100
        direction = "Rising" if change > 0 else "Falling" if change < 0 else "Stable"

        return jsonify({
            "coin": coin_id.capitalize(),
            "mode": mode.upper(),
            "direction": direction,
            "change": f"{change:.2f}",
            "percent": f"{percent:.2f}"
        })

    except Exception as e:
        print(f"Error fetching trend data: {e}")
        return jsonify({"error": "Couldn't fetch data. Check the coin name and try again."}), 500

@app.route('/api/top_coins', methods=['GET'])
@cache.cached(timeout=300) # Cache this route for 300 seconds (5 minutes)
def get_top_coins():
    try:
        top_coins = cg.get_coins_markets(vs_currency='usd', order='market_cap_desc', per_page=10, page=1, sparkline=False)

        simplified_coins = []
        for coin in top_coins:
            simplified_coins.append({
                "id": coin['id'],
                "name": coin['name'],
                "symbol": coin['symbol'].upper(),
                "current_price": coin['current_price'],
                "price_change_percentage_24h": coin['price_change_percentage_24h']
            })
        return jsonify(simplified_coins)
    except Exception as e:
        print(f"Error fetching top coins: {e}")
        return jsonify({"error": "Couldn't fetch top cryptocurrencies."}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)