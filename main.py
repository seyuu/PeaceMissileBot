import os
import base64
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
import hmac
import hashlib
import json
from urllib.parse import unquote, parse_qs
import telebot
from telebot.types import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup

# --- 1. AYARLAR VE KONFİGÜRASYON ---
# Google Cloud Run'a eklediğin ortam değişkenleri buradan okunacak.
BOT_TOKEN = os.environ.get("TELEGRAM_TOKEN")
WEB_APP_URL = os.environ.get("WEB_APP_URL") 
SERVER_URL = os.environ.get("SERVER_URL")  

# Değişkenlerin varlığını kontrol et, yoksa hata vererek programı durdur.
if not all([BOT_TOKEN, WEB_APP_URL, SERVER_URL]):
    raise ValueError("HATA: Ortam değişkenleri eksik! Lütfen Google Cloud Run servisinize TELEGRAM_TOKEN, WEB_APP_URL ve SERVER_URL değişkenlerini eklediğinizden emin olun.")

# --- 2. UYGULAMA VE VERİTABANI BAŞLATMA ---
app = Flask(__name__)
bot = telebot.TeleBot(BOT_TOKEN)

# Firebase bağlantısı
try:
    # Base64 olarak kodlanmış anahtarı çöz
    creds_str = base64.b64decode(os.environ["FIREBASE_CREDS_BASE64"]).decode()
    creds_json = json.loads(creds_str)
    cred = credentials.Certificate(creds_json)
    # Firebase uygulamasını sadece bir kez başlat
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    raise ValueError(f"Firebase başlatılırken kritik bir hata oluştu: {e}")

# --- 3. TELEGRAM BOT KOMUTLARI ---
@bot.message_handler(commands=['start'])
def start_handler(message):
    """/start komutunu işler, kullanıcıyı veritabanına kaydeder ve oyun butonunu gönderir."""
    try:
        user_id = str(message.from_user.id)
        username = message.from_user.username or message.from_user.first_name or "Player"
        ref = db.collection("users").document(user_id)
        if not ref.get().exists:
            ref.set({"username": username, "score": 0, "total_score": 0, "total_pmno_coins": 0})
        
        markup = ReplyKeyboardMarkup(resize_keyboard=True)
        markup.add(KeyboardButton("🚀 Play Peace Missile!", web_app=WebAppInfo(url=WEB_APP_URL)))
        bot.send_message(message.chat.id, "Welcome to Peace Missile! Tap the button below to start your mission.", reply_markup=markup)
    except Exception as e:
        print(f"Hata (/start): {e}")

# --- 4. WEB API ENDPOINT'LERİ (FLASK) ---
def validate_telegram_data(init_data: str) -> dict | None:
    """Telegram'dan gelen verinin sahte olup olmadığını doğrular."""
    try:
        parsed_data = parse_qs(init_data)
        received_hash = parsed_data.pop('hash', [None])[0]
        if not received_hash: return None
        data_check_string = "\n".join(f"{k}={unquote(v[0])}" for k, v in sorted(parsed_data.items()))
        secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if calculated_hash == received_hash:
            user_data_str = unquote(parsed_data.get('user', ['{}'])[0])
            return json.loads(user_data_str)
    except Exception as e:
        print(f"Doğrulama hatası: {e}")
        return None
    return None

@app.route("/save_score", methods=["POST"])
def save_score():
    """Oyundan gelen skorları güvenli bir şekilde kaydeder."""
    telegram_init_data = request.headers.get("X-Telegram-Init-Data")
    if not telegram_init_data: return jsonify({"error": "Authentication failed"}), 403
    validated_user = validate_telegram_data(telegram_init_data)
    if not validated_user: return jsonify({"error": "Invalid hash"}), 403

    user_id = str(validated_user.get("id"))
    username = validated_user.get("username", "Player")
    data = request.json or {}
    score = int(data.get("score", 0))

    user_ref = db.collection("users").document(user_id)
    user_snapshot = user_ref.get()
    
    if not user_snapshot.exists:
        user_data = {"username": username, "score": score, "total_score": score, "total_pmno_coins": score}
    else:
        user_data = user_snapshot.to_dict()
        user_data["username"] = username
        user_data["score"] = max(user_data.get("score", 0), score)
        user_data["total_score"] = user_data.get("total_score", 0) + score
        user_data["total_pmno_coins"] = user_data.get("total_pmno_coins", 0) + score
    
    user_ref.set(user_data, merge=True)
    return jsonify({"status": "OK"}), 200

# --- 5. TELEGRAM WEBHOOK ROUTE'U ---
# Telegram, bot'a gelen mesajları bu adrese POST isteği olarak gönderecek.
@app.route(f"/{BOT_TOKEN}", methods=['POST'])
def webhook_handler():
    if request.headers.get('content-type') == 'application/json':
        json_string = request.get_data().decode('utf-8')
        update = telebot.types.Update.de_json(json_string)
        bot.process_new_updates([update])
        return '', 200
    else:
        return 'Bad Request', 400

# --- 6. KONTROL ENDPOINT'LERİ ---
# Bu endpoint, webhook'u ayarlamak için sadece 1 kez deploy sonrası ziyaret edilecek.
@app.route("/set_webhook")
def set_webhook():
    webhook_url = f"{SERVER_URL}/{BOT_TOKEN}"
    bot.remove_webhook()
    bot.set_webhook(url=webhook_url)
    return f"Webhook set to {webhook_url}", 200

# Bu endpoint, servisin çalışıp çalışmadığını kontrol etmek için.
@app.route("/")
def index():
    return "Backend is running!", 200

# Cloud Run gibi platformlar Gunicorn kullandığı için bu bloğa gerek yoktur,
# ama lokal test için kalabilir.
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
