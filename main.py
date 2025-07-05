import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import hmac
import hashlib
import json
from urllib.parse import unquote, parse_qs
import telebot
from telebot.types import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup

# --- 1. AYARLAR VE KONFİGÜRASYON ---
BOT_TOKEN = os.environ.get("TELEGRAM_TOKEN")
WEB_APP_URL = os.environ.get("WEB_APP_URL")
SERVER_URL = os.environ.get("SERVER_URL")

if not all([BOT_TOKEN, WEB_APP_URL, SERVER_URL]):
    raise ValueError("HATA: Ortam değişkenleri eksik! Lütfen TELEGRAM_TOKEN, WEB_APP_URL ve SERVER_URL değişkenlerini ayarlayın.")

# BOT_TOKEN artık kesinlikle string olacak
assert BOT_TOKEN is not None

# --- 2. UYGULAMA VE VERİTABANI BAŞLATMA ---
app = Flask(__name__)
bot = telebot.TeleBot(BOT_TOKEN)  # type: ignore
CORS(app) 

# Firebase başlatma (opsiyonel - geliştirme için)
db = None
try:
    # Önce FIREBASE_CREDS_BASE64'i dene
    if "FIREBASE_CREDS_BASE64" in os.environ:
        creds_str = base64.b64decode(os.environ["FIREBASE_CREDS_BASE64"]).decode()
        creds_json = json.loads(creds_str)
        cred = credentials.Certificate(creds_json)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase başarıyla başlatıldı (production).")
    else:
        # Geliştirme için test Firebase konfigürasyonu
        print("FIREBASE_CREDS_BASE64 bulunamadı, test modu kullanılıyor...")
        # Test için basit bir mock Firebase client oluştur
        class MockFirestore:
            def collection(self, name):
                return MockCollection()
        
        class MockCollection:
            def document(self, doc_id):
                return MockDocument()
        
        class MockDocument:
            def get(self):
                return MockDocumentSnapshot()
            def set(self, data, merge=False):
                print(f"Mock Firebase: Veri kaydedildi - {data}")
                return True
        
        class MockDocumentSnapshot:
            def exists(self):
                return False
            def to_dict(self):
                return {"username": "TestUser", "score": 0, "total_score": 0, "total_pmno_coins": 0}
        
        db = MockFirestore()
        print("Mock Firebase başlatıldı (geliştirme modu).")
        
except Exception as e:
    print(f"UYARI: Firebase başlatılamadı: {e}")
    print("Bot Firebase olmadan çalışacak (sadece test için)")

def escape_markdown(text: str) -> str:
    """
    Telegram MarkdownV2 formatına göre özel karakterleri kaçırır.
    """
    if not text:
        return ""
    # Telegram'ın dokümantasyonunda belirtilen özel karakterler:
    escape_chars = r"\_*[]()~`>#+-=|{}.!"
    for char in escape_chars:
        text = text.replace(char, "\\" + char)
    return text


# --- 3. TELEGRAM BOT KOMUTLARI ---
@bot.message_handler(commands=['start'])
def start_handler(message):
    try:
        print(f"/start komutu alındı: user_id={message.from_user.id}, chat_id={message.chat.id}")
        user_id = str(message.from_user.id)
        first_name = message.from_user.first_name or ""
        last_name = message.from_user.last_name or ""
        username = (
            message.from_user.username or
            (first_name + (" " + last_name if last_name else "")) or
            "Player"
        )

        print(f"Kullanıcı bilgileri: user_id={user_id}, username={username}")

        # Firebase kontrolü
        if db is not None:
            # Escape username for MarkdownV2
            safe_username = escape_markdown(username)

            ref = db.collection("users").document(user_id)
            if not ref.get().exists:
                print(f"Yeni kullanıcı oluşturuluyor: {user_id} - {username}")
                ref.set({"username": username, "score": 0, "total_score": 0, "total_pmno_coins": 0})
            else:
                print(f"Mevcut kullanıcı: {user_id} - {username}")
        else:
            print("Firebase mevcut değil, kullanıcı verisi kaydedilmiyor")
        
        markup = ReplyKeyboardMarkup(resize_keyboard=True)
        markup.add(KeyboardButton("🚀 Play Peace Missile!", web_app=WebAppInfo(url=WEB_APP_URL)))
        
        # Basit ve temiz hoş geldin mesajı
        message_text = "Welcome to Peace Missile\\! 🚀\n\nTap the button below to start your mission\\!"
        
        print(f"Mesaj gönderiliyor: chat_id={message.chat.id}")
        bot.send_message(message.chat.id, message_text, reply_markup=markup, parse_mode="MarkdownV2")
        print("Mesaj başarıyla gönderildi")
        
    except Exception as e:
        print(f"HATA (/start): {e}")
        import traceback
        traceback.print_exc()
        # Hata durumunda basit bir mesaj gönder
        try:
            bot.send_message(message.chat.id, "Welcome to Peace Missile! 🚀")
        except:
            pass

@bot.message_handler(commands=['score'])
def score_handler(message):
    """/score komutunu işler ve kullanıcının skor bilgilerini gönderir."""
    try:
        print(f"/score komutu alındı: user_id={message.from_user.id}")
        
        if db is None:
            bot.send_message(message.chat.id, "Veritabanı mevcut değil. Firebase kimlik bilgilerini kontrol edin.")
            return
            
        user_id = str(message.from_user.id)
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists:
            user = user_doc.to_dict()
            if user is not None:  # None kontrolü eklendi
                score_message = (
                    f"🏆 <b>Your Score</b> 🏆\n\n"
                    f"<b>High Score:</b> {user.get('score', 0)}\n"
                    f"<b>Total Score:</b> {user.get('total_score', 0)}\n"
                    f"<b>PMNOFO Coins:</b> {user.get('total_pmno_coins', 0)}"
                )
                bot.send_message(message.chat.id, score_message, parse_mode="HTML")
            else:
                bot.send_message(message.chat.id, "Kullanıcı verisi bulunamadı.")
        else:
            bot.send_message(message.chat.id, "You don't have a score yet. Play first!")
    except Exception as e:
        print(f"HATA (/score): {e}")

# --- 4. WEB API ENDPOINT'LERİ (FLASK) ---
def validate_telegram_data(init_data: str) -> dict | None:
    # ... (Bu fonksiyon aynı kalıyor)
    try:
        parsed_data = parse_qs(init_data)
        received_hash = parsed_data.pop('hash', [None])[0]
        if not received_hash: return None
        data_check_string = "\n".join(f"{k}={unquote(v[0])}" for k, v in sorted(parsed_data.items()))
        if BOT_TOKEN is None:  # None kontrolü eklendi
            return None
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
    print("/save_score adresine istek geldi.")
    telegram_init_data = request.headers.get("X-Telegram-Init-Data")
    if not telegram_init_data: 
        print("HATA: İstekte X-Telegram-Init-Data başlığı bulunamadı.")
        return jsonify({"error": "Authentication failed"}), 403
    
    validated_user = validate_telegram_data(telegram_init_data)
    if not validated_user: 
        print("HATA: initData doğrulaması başarısız oldu.")
        return jsonify({"error": "Invalid hash"}), 403

    try:
        if db is None:
            print("HATA: Firebase veritabanı mevcut değil")
            return jsonify({"error": "Database not available"}), 500
            
        user_id = str(validated_user.get("id"))
        first_name = validated_user.get("first_name", "")
        last_name = validated_user.get("last_name", "")
        username = (
            validated_user.get("username") or
            (first_name + (" " + last_name if last_name else "")) or
            "Player"
        )
        data = request.json or {}
        score = int(data.get("score", 0))
        print(f"Skor kaydediliyor: user_id={user_id}, username={username}, score={score}")

        user_ref = db.collection("users").document(user_id)
        user_snapshot = user_ref.get()
        
        if not user_snapshot.exists:
            user_data = {"username": username, "score": score, "total_score": score, "total_pmno_coins": score}
        else:
            user_data = user_snapshot.to_dict()
            if user_data is not None:  # None kontrolü eklendi
                user_data["username"] = username
                user_data["score"] = max(user_data.get("score", 0), score)
                user_data["total_score"] = user_data.get("total_score", 0) + score
                user_data["total_pmno_coins"] = user_data.get("total_pmno_coins", 0) + score
            else:
                user_data = {"username": username, "score": score, "total_score": score, "total_pmno_coins": score}
        
        user_ref.set(user_data, merge=True)
        print("Skor başarıyla kaydedildi.")
        return jsonify({"status": "OK"}), 200
    except Exception as e:
        print(f"HATA (save_score): {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- 5. TELEGRAM WEBHOOK ROUTE'U ---
@app.route(f"/{BOT_TOKEN}", methods=['POST'])
def webhook_handler():
    if request.headers.get('content-type') == 'application/json':
        json_string = request.get_data().decode('utf-8')
        update = telebot.types.Update.de_json(json_string)
        if update is not None:  # None kontrolü eklendi
            bot.process_new_updates([update])
        return '', 200
    else:
        return 'Bad Request', 400

# --- 6. KONTROL ENDPOINT'LERİ ---
@app.route("/set_webhook")
def set_webhook():
    # ... (Bu fonksiyon aynı kalıyor)
    webhook_url = f"{SERVER_URL}/{BOT_TOKEN}"
    bot.remove_webhook()
    bot.set_webhook(url=webhook_url)
    return f"Webhook set to {webhook_url}", 200

@app.route("/")
def index():
    return "Backend is running!", 200

if __name__ == "__main__":
    print("Bot başlatılıyor...")
    print(f"BOT_TOKEN: {'***' if BOT_TOKEN else 'None'}")
    print(f"WEB_APP_URL: {WEB_APP_URL}")
    print(f"SERVER_URL: {SERVER_URL}")
    
    try:
        # Bot bilgilerini kontrol et
        bot_info = bot.get_me()
        print(f"Bot başarıyla bağlandı: @{bot_info.username}")
        
        # Production için webhook modu
        webhook_url = f"{SERVER_URL}/{BOT_TOKEN}"
        bot.remove_webhook()
        bot.set_webhook(url=webhook_url)
        print(f"Webhook ayarlandı: {webhook_url}")
        
        # Flask uygulamasını başlat (webhook için)
        print("Flask uygulaması başlatılıyor (webhook modu)...")
        app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=False)
        
    except Exception as e:
        print(f"Bot başlatılırken hata: {e}")
        import traceback
        traceback.print_exc()