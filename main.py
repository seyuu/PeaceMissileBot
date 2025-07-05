import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask
import telebot
from telebot.types import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
from collections import defaultdict
import time

# Ortam değişkenleri
BOT_TOKEN = os.environ.get("TELEGRAM_TOKEN")
WEB_APP_URL = os.environ.get("WEB_APP_URL")
SERVER_URL = os.environ.get("SERVER_URL")

# Flask ve bot başlat
app = Flask(__name__)
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_TOKEN ortam değişkeni eksik!")
bot = telebot.TeleBot(BOT_TOKEN)
user_last_command = defaultdict(float)
RATE_LIMIT_SECONDS = 2

# Firebase başlatma ve log
try:
    print("[LOG] Firebase başlatılıyor...")
    cred = credentials.Certificate("firebase-key.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("[LOG] Firebase başarıyla başlatıldı.")
except Exception as e:
    print(f"[LOG] Firebase başlatılamadı: {e}")
    db = None

def check_rate_limit(user_id: str) -> bool:
    current_time = time.time()
    last_time = user_last_command.get(str(user_id), 0)
    if current_time - last_time < RATE_LIMIT_SECONDS:
        return False
    user_last_command[str(user_id)] = current_time
    return True

@bot.message_handler(commands=['start'])
def start_handler(message):
    try:
        if not check_rate_limit(message.from_user.id):
            return
        user_id = str(message.from_user.id)
        username = message.from_user.username or message.from_user.first_name or "Player"
        print(f"[LOG] /start: user_id={user_id}, username={username}")
        print(f"[LOG] /start: message.from_user.id (int) = {message.from_user.id}")
        print(f"[LOG] /start: message.from_user.id (str) = {str(message.from_user.id)}")

        if db is not None:
            try:
                ref = db.collection("users").document(user_id)
                doc = ref.get()
                if not doc.exists:
                    print(f"[LOG] Yeni kullanıcı oluşturuluyor: {user_id} - {username}")
                    ref.set({"username": username, "score": 0, "total_score": 0, "total_pmno_coins": 0})
                else:
                    print(f"[LOG] Mevcut kullanıcı: {doc.to_dict()}")
            except Exception as e:
                print(f"[LOG] Firestore kullanıcı kaydı/okuma hatası: {e}")
        else:
            print("[LOG] Firebase mevcut değil, kullanıcı verisi kaydedilmiyor")

        markup = ReplyKeyboardMarkup(resize_keyboard=True)
        webapp_url_with_user = f"{WEB_APP_URL}?user_id={user_id}"
        markup.add(KeyboardButton("🚀 Play Peace Missile!", web_app=WebAppInfo(url=webapp_url_with_user)))
        message_text = (
            "🚀🕊️☮️ <b>PEACE MISSILE</b> ☮️🕊️🚀\n\n"
            "welcome to peace missile!\n\n"
            "Turn missiles into doves and bring peace to the world!\n\n"
            "Tap the button below to start your mission.\n\n"
            "<b>Commands:</b>\n"
            "📊 /score - View your scores\n"
            "❓ /help - Get help\n"
            "🔒 /privacy - Privacy policy"
        )
        bot.send_message(message.chat.id, message_text, reply_markup=markup, parse_mode="HTML")
    except Exception as e:
        print(f"[LOG] HATA (/start): {e}")

@bot.message_handler(commands=['score'])
def score_handler(message):
    try:
        user_id = str(message.from_user.id)
        print(f"[LOG] /score: user_id={user_id}")
        if db is not None:
            try:
                user_doc = db.collection("users").document(user_id).get()
                print(f"[LOG] Firestore: users/{user_id} exists={user_doc.exists}")
                if user_doc.exists:
                    user = user_doc.to_dict()
                    print(f"[LOG] Kullanıcı verisi: {user}")
                    score_message = (
                        f"🚀🕊️☮️ <b>PEACE MISSILE BOT</b> ☮️🕊️🚀\n\n"
                        f"🏆 <b>Your Score</b> 🏆\n\n"
                        f"📈 <b>High Score:</b> {user.get('score', 0) if user else 0}\n"
                        f"📊 <b>Total Score:</b> {user.get('total_score', 0) if user else 0}\n"
                        f"🪙 <b>PMNOFO Coins:</b> {user.get('total_pmno_coins', 0) if user else 0}"
                    )
                    bot.send_message(message.chat.id, score_message, parse_mode="HTML")
                else:
                    print("[LOG] Kullanıcı dokümanı bulunamadı")
                    bot.send_message(message.chat.id, "You don't have a score yet. Play first!")
            except Exception as e:
                print(f"[LOG] Firestore kullanıcı okuma hatası: {e}")
        else:
            print("[LOG] Firebase mevcut değil, mock veri gönderiliyor")
            bot.send_message(message.chat.id, "Firebase bağlantısı yok.")
    except Exception as e:
        print(f"[LOG] HATA (/score): {e}")

@bot.message_handler(commands=['help'])
def help_handler(message):
    help_text = (
        "🚀🕊️☮️ <b>PEACE MISSILE BOT</b> ☮️🕊️🚀\n\n"
        "🎮🕊️☮️ <b>Commands:</b> ☮️🕊️🎮\n"
        "🚀 /start - Start the game\n"
        "📊 /score - View your scores\n"
        "❓ /help - This help message\n"
        "🔒 /privacy - Privacy policy\n\n"
        "🎯 <b>How to Play:</b>\n"
        "• Convert missiles into doves\n"
        "• Earn points for peace\n"
        "• Beat your high score!\n\n"
        "🔒 <b>Privacy:</b>\n"
        "Only your game scores are saved.\n"
        "Your personal data is not shared."
    )
    bot.send_message(message.chat.id, help_text, parse_mode="HTML")

@bot.message_handler(commands=['privacy'])
def privacy_handler(message):
    privacy_text = (
        "🚀🕊️☮️ <b>PEACE MISSILE BOT</b> ☮️🕊️🚀\n\n"
        "🔒 <b>Privacy Policy</b> 🔒\n\n"
        "✅ Only your game scores are saved\n"
        "✅ Your personal data is not shared\n"
        "✅ Your data is stored securely\n"
        "✅ Not shared with third parties\n\n"
        "For more info: /help"
    )
    bot.send_message(message.chat.id, privacy_text, parse_mode="HTML")

if __name__ == "__main__":
    print("[LOG] Bot başlatılıyor...")
    bot.polling(none_stop=True, timeout=60)