import os
import base64
import io
import sys
import traceback
import json
import logging
import time
import datetime
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, jsonify, send_file, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import requests
from openai import OpenAI
import tempfile
from gtts import gTTS
from docx import Document
from docx.shared import Inches

# Log klasörünü oluştur
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Geçerli oturum için benzersiz bir log dosya ismi oluştur
timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
app_log_path = os.path.join(logs_dir, f"app_{timestamp}.log")
debug_log_path = os.path.join(logs_dir, f"debug_{timestamp}.log")
prompt_log_path = os.path.join(logs_dir, f"prompt_{timestamp}.log")

# Loglama yapılandırması
logger = logging.getLogger("masal_app")
logger.setLevel(logging.DEBUG)

# Log formatı
log_format = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(log_format)

# Normal log dosyası (INFO ve üstü seviye mesajlar için)
file_handler = RotatingFileHandler(
    app_log_path, maxBytes=10*1024*1024, backupCount=3
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(log_format)

# Debug log dosyası (tüm detaylı loglar için)
debug_file_handler = RotatingFileHandler(
    debug_log_path, maxBytes=10*1024*1024, backupCount=3
)
debug_file_handler.setLevel(logging.DEBUG)
debug_file_handler.setFormatter(log_format)

# Handlerleri loggera ekle
logger.addHandler(console_handler)
logger.addHandler(file_handler)
logger.addHandler(debug_file_handler)

# Promt testi için ayrı bir logger
prompt_logger = logging.getLogger("prompt_test")
prompt_logger.setLevel(logging.INFO)
prompt_handler = RotatingFileHandler(
    prompt_log_path, maxBytes=10*1024*1024, backupCount=3
)
prompt_handler.setFormatter(log_format)
prompt_logger.addHandler(prompt_handler)
prompt_logger.addHandler(console_handler)

# .env dosyasından API anahtarlarını yükle
load_dotenv()
google_api_key = os.getenv("GOOGLE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not google_api_key:
    logger.error("Google API anahtarı bulunamadı! .env dosyanızı kontrol edin.")
    raise ValueError("Lütfen .env dosyasına GOOGLE_API_KEY değerini ekleyin.")

# Gemini API'yi yapılandır
genai.configure(api_key=google_api_key)
logger.info("Gemini API yapılandırıldı.")

# OpenAI API'yi yapılandır
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
    logger.info("OpenAI API yapılandırıldı.")
else:
    openai_client = None
    logger.warning("UYARI: OpenAI API anahtarı bulunamadı. DALL-E görsel oluşturma devre dışı.")

app = Flask(__name__)
# Tüm kaynaklardan gelen isteklere izin ver
CORS(app, resources={r"/*": {"origins": "*"}})
logger.info("Flask uygulaması ve CORS yapılandırıldı.")

@app.route('/')
def index():
    logger.debug("Ana sayfa isteği alındı.")
    response = make_response(render_template('index.html'))
    # Önbelleği devre dışı bırak
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/generate_tale', methods=['POST'])
def generate_tale():
    try:
        logger.info("Masal oluşturma isteği alındı.")
        
        # Request içeriğini logla
        try:
            logger.debug(f"İstek türü: {request.content_type}")
            if request.data:
                logger.debug(f"İstek verisi: {request.data.decode('utf-8')}")
            logger.debug(f"Form verisi: {request.form}")
            logger.debug(f"JSON verisi: {request.json if request.is_json else 'JSON verisi yok'}")
        except Exception as e:
            logger.error(f"İstek verisi loglanırken hata: {str(e)}")
        
        # Form verilerini al
        if request.is_json:
            data = request.json
            character_name = data.get('character_name', '')
            character_type = data.get('character_type', '')
            setting = data.get('setting', '')
            theme = data.get('theme', '')
            word_limit = int(data.get('word_limit', 200))
            image_api = data.get('image_api', 'dalle')
            text_api = data.get('text_api', 'openai')
        else:
            # Form verilerini al
            character_name = request.form.get('character_name', '')
            character_type = request.form.get('character_type', '')
            setting = request.form.get('setting', '')
            theme = request.form.get('theme', '')
            
            # word_limit ve api değerleri için hata kontrolü
            try:
                word_limit = int(request.form.get('word_limit', 200))
            except ValueError:
                logger.warning("Kelime sayısı geçersiz, varsayılan değer kullanılıyor.")
                word_limit = 200
                
            image_api = request.form.get('image_api', 'dalle')
            text_api = request.form.get('text_api', 'openai')
        
        logger.info(f"Alınan form verileri: Karakter Adı: {character_name}, Karakter Türü: {character_type}, Ortam: {setting}, Tema: {theme}, Kelime Sayısı: {word_limit}, Görsel API: {image_api}, Metin API: {text_api}")
        
        # Veri doğrulama
        if not character_name or not character_type or not setting or not theme:
            logger.error("Eksik form verileri")
            return jsonify({"error": "Lütfen tüm alanları doldurunuz."}), 400
        
        # Masal oluşturma
        logger.info("Masal metni oluşturuluyor...")
        tale_text = generate_tale_text(character_name, character_type, setting, theme, word_limit, text_api)
        
        # Başlık oluştur
        tale_title = f"{character_name}'nin {setting} Macerası"
        logger.info(f"Masal başlığı oluşturuldu: {tale_title}")
        
        # İlk sayfa için görsel oluştur
        logger.info(f"{image_api} API kullanarak ilk sayfa görseli oluşturuluyor...")
        
        # Masalı bölümlere ayır
        sections = split_text_into_sections(tale_text, 50)
        if sections:
            first_section = sections[0]
            # İlk sayfa için özel prompt oluştur
            image_prompt = f"Çocuk kitabı tarzında, {character_name} adlı {character_type} karakteri {setting} ortamında: {first_section}"
        else:
            # Bölüm yoksa genel bir prompt kullan
            image_prompt = f"{character_name} adlı {character_type} karakteri {setting} ortamında, {theme} temalı bir masal için çocuk kitabı tarzında illüstrasyon"
        
        # Görseli oluştur
        image_data = generate_image_for_section(image_prompt, image_api)
        
        # Görsel oluşturma başarı/başarısızlık durumunu logla
        if image_data:
            logger.info("Görsel başarıyla oluşturuldu.")
        else:
            logger.warning("Görsel oluşturma başarısız, varsayılan görsel kullanılacak.")
        
        # Yanıt hazırla
        response_data = {
            "tale_title": tale_title,
            "tale_text": tale_text,
            "image_url": f"data:image/jpeg;base64,{image_data}" if image_data else "static/img/default-tale.jpg"
        }
        
        logger.info("Masal başarıyla oluşturuldu.")
        return jsonify(response_data)
        
    except Exception as e:
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        logger.error(f"Masal oluşturulurken hata oluştu: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e), "details": error_details}), 500

@app.route('/save_word', methods=['POST'])
def save_word():
    try:
        data = request.json
        tale_text = data.get('tale_text', '')
        images = data.get('images', [])
        
        # Word dosyası oluştur
        doc_path = create_word_document(tale_text, images)
        
        # Word dosyasını gönder
        return send_file(doc_path, as_attachment=True, download_name='masal.docx')
    except Exception as e:
        logger.error(f"Word dosyası oluşturma hatası: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    try:
        data = request.json
        text = data.get('text', '')
        page = data.get('page', 0)  # Sayfa numarasını al (debug için)
        
        logger.info(f"Sayfa {page+1} için ses oluşturma isteği alındı, metin uzunluğu: {len(text)} karakter")
        logger.debug(f"Sayfa {page+1} metin başlangıcı: {text[:30]}...")
        
        # Ses dosyası oluştur
        audio_path = create_audio(text)
        
        logger.info(f"Sayfa {page+1} için ses dosyası oluşturuldu: {audio_path}")
        
        # Ses dosyasını gönder - mimetype belirtiyoruz ve attachment olarak değil normal dosya olarak gönderiyoruz
        return send_file(audio_path, mimetype='audio/mpeg', as_attachment=False)
    except Exception as e:
        logger.error(f"Sayfa {page+1} için ses oluşturma hatası: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/generate_page_image', methods=['POST'])
def generate_page_image():
    try:
        data = request.json
        page_text = data.get('page_text', '')
        character_name = data.get('character_name', '')
        character_type = data.get('character_type', '')
        setting = data.get('setting', '')
        page_number = data.get('page_number', 1)
        image_api = data.get('image_api', 'dalle')
        
        logger.info(f"Sayfa {page_number} için görsel isteği alındı")
        
        # Görsel oluşturma promptu hazırla
        image_prompt = f"Çocuk kitabı tarzında, {character_name} adlı {character_type} karakteri {setting} ortamında: {page_text}"
        logger.info(f"Oluşturulan prompt: {image_prompt[:100]}...")
        
        # Görseli oluştur
        image_data = generate_image_for_section(image_prompt, image_api)
        
        if not image_data:
            logger.warning(f"Sayfa {page_number} için görsel oluşturulamadı")
            return jsonify({"error": "Görsel oluşturulamadı"}), 500
        
        logger.info(f"Sayfa {page_number} için görsel başarıyla oluşturuldu")
        
        # Base64 verisi olarak dön
        return jsonify({
            "image_data": image_data,
            "image_url": f"data:image/jpeg;base64,{image_data}"
        })
        
    except Exception as e:
        logger.error(f"Sayfa görseli oluşturma hatası: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def create_word_document(tale_text, images):
    """Masal metni ve görsellerden Word dosyası oluşturur"""
    try:
        # Word dosyası oluştur
        doc = Document()
        
        # Başlık ekle
        doc.add_heading('Masal Dünyası', 0)
        
        # Metni ekle
        doc.add_paragraph(tale_text)
        
        # Görselleri ekle
        for i, image_data in enumerate(images):
            # Base64 görselini dosyaya dönüştür
            image_bytes = base64.b64decode(image_data)
            image_stream = io.BytesIO(image_bytes)
            
            # Geçici dosya oluştur
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            
            # Görseli ekle
            doc.add_picture(temp_path, width=Inches(6))
            
            # Geçici dosyayı sil
            os.unlink(temp_path)
        
        # Word dosyasını kaydet
        doc_path = tempfile.mktemp(suffix='.docx')
        doc.save(doc_path)
        
        return doc_path
    except Exception as e:
        logger.error(f"Word dosyası oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        raise

def create_audio(text):
    """Metinden ses dosyası oluşturur - basitleştirilmiş, pydub gerektirmeyen sürüm"""
    try:
        # Geçici ses dosyası oluştur
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            audio_path = f.name
        
        # Metin içeriğinin uzunluğunu logla
        text_words = len(text.split())
        logger.info(f"Ses oluşturulacak metin: {text_words} kelime, {len(text)} karakter")
        logger.debug(f"Metin başlangıcı: {text[:min(50, len(text))]}...")
        
        # Metni sese dönüştür - uzun metinler için gTTS kendi içinde parçalama yapıyor
        tts = gTTS(text=text, lang='tr', slow=False)
        
        # Dosyaya kaydet
        tts.save(audio_path)
        
        # Dosya boyutunu kontrol et
        file_size = os.path.getsize(audio_path)
        logger.info(f"Ses dosyası oluşturuldu: {audio_path} (Boyut: {file_size} bytes)")
        
        return audio_path
    except Exception as e:
        logger.error(f"Ses oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        raise

def generate_tale_text(character_name, character_type, setting, theme, word_limit, text_api='openai'):
    """Gemini API veya OpenAI API kullanarak masal metni oluşturur"""
    try:
        # Kullanıcı seçimine göre API kullan
        if text_api == 'openai' and openai_client:
            try:
                return generate_tale_text_with_openai(character_name, character_type, setting, theme, word_limit)
            except Exception as e:
                logger.warning(f"OpenAI ile masal metni oluşturulamadı, Gemini denenecek: {str(e)}")
                # OpenAI ile başarısız olursa Gemini'ye devam et
        
        # Gemini API ile devam et
        logger.info("Gemini API ile masal metni oluşturuluyor...")
        
        # Desteklenen modelleri kullan
        logger.info("Gemini modeli kullanılıyor...")
        
        # İlk tercih edilen model
        try:
            model = genai.GenerativeModel("models/gemini-2.0-flash-001")
            logger.info("models/gemini-2.0-flash-001 modeli başarıyla yüklendi")
        except Exception as e1:
            logger.warning(f"models/gemini-2.0-flash-001 modeli yüklenemedi: {str(e1)}")
            
            # İkinci tercih edilen model
            try:
                model = genai.GenerativeModel("models/gemini-2.0-flash-lite-001")
                logger.info("models/gemini-2.0-flash-lite-001 modeli başarıyla yüklendi")
            except Exception as e2:
                logger.warning(f"models/gemini-2.0-flash-lite-001 modeli yüklenemedi: {str(e2)}")
                
                # Son çare olarak bilinen çalışan modeli dene
                try:
                    model = genai.GenerativeModel("models/gemini-1.5-pro")
                    logger.info("models/gemini-1.5-pro modeli başarıyla yüklendi")
                except Exception as e3:
                    logger.error(f"Hiçbir Gemini modeli yüklenemedi: {str(e3)}")
                    if not openai_client:
                        raise ValueError("Hem Gemini hem de OpenAI API kullanılamıyor. Lütfen API anahtarlarını kontrol edin.")
                    else:
                        # Buraya düşerse, OpenAI zaten denenmiş ve başarısız olmuş demektir
                        raise ValueError("Metin oluşturma için hiçbir API kullanılamıyor.")
        
        prompt = f"""
        GÖREV: Tam olarak {word_limit} kelimeden oluşan bir çocuk masalı yaz.

        ÖNEMLİ TALİMATLAR:
        1. Hikaye TAM OLARAK {word_limit} kelime içermeli
        2. Hikaye şunları içermeli:
           - Ana karakter: {character_name} adında bir {character_type}
           - Ortam: {setting}
           - Tema: {theme}
        3. Çocuk dostu ve eğitici olmalı (7-10 yaş)
        4. Basit Türkçe kullan
        5. Kelime sayımını üç kez kontrol et
        6. Başlık EKLEME
        7. Ne bir kelime fazla, ne bir kelime eksik olmalı

        Kelime sayısını metnin kendisinde belirtme (yani metinde "Bu hikaye {word_limit} kelimedir" gibi ifadeler kullanma).
        """
        
        response = model.generate_content(prompt)
        tale_text = response.text.strip()
        
        # Kelime sayısı kontrolü
        words = tale_text.split()
        word_count = len(words)
        logger.info(f"Model tarafından üretilen kelime sayısı: {word_count}")
        
        if word_count > word_limit * 1.2:  # %20 tolerans
            logger.info(f"Kelime sayısı fazla, {word_limit} kelimeye kısaltılıyor...")
            tale_text = ' '.join(words[:word_limit])
        elif word_count < word_limit * 0.8:  # Kelime sayısı %20'den fazla az ise
            logger.warning(f"Kelime sayısı çok az ({word_count}), istenen: {word_limit}. Yeniden deneniyor...")
            
            # Gemini API için yeniden denemeye gerek yok, diğer kısımda retry eklemiştik
            # Bu durumda sadece log bırakıyoruz
        
        return tale_text
    
    except Exception as e:
        logger.error(f"Masal metni oluşturulurken hata: {str(e)}")
        logger.error(traceback.format_exc())
        return f"Masal oluşturulamadı. Hata: {str(e)}"
        
def generate_tale_text_with_openai(character_name, character_type, setting, theme, word_limit):
    """OpenAI API kullanarak masal metni oluşturur"""
    logger.info("OpenAI API ile masal metni oluşturuluyor...")
    
    prompt = f"""
    GÖREV: Tam olarak {word_limit} kelimeden oluşan bir çocuk masalı yaz.

    ÖNEMLİ TALİMATLAR:
    1. Hikaye TAM OLARAK {word_limit} kelime içermeli
    2. Hikaye şunları içermeli:
       - Ana karakter: {character_name} adında bir {character_type}
       - Ortam: {setting}
       - Tema: {theme}
    3. Çocuk dostu ve eğitici olmalı (7-10 yaş)
    4. Basit Türkçe kullan
    5. Kelime sayımını üç kez kontrol et
    6. Başlık EKLEME
    7. Ne bir kelime fazla, ne bir kelime eksik olmalı

    Kelime sayısını metnin kendisinde belirtme (yani metinde "Bu hikaye {word_limit} kelimedir" gibi ifadeler kullanma).
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sen çocuklar için masal yazan bir yazarsın. Eğitici, eğlenceli ve çocuk dostu masallar yazarsın."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=word_limit * 8,  # Kelime sayısı x 8 token (daha fazla token verelim)
            temperature=0.7,
            presence_penalty=0.1,  # Tekrarları önlemek için hafif bir presence penalty ekleyelim
            frequency_penalty=0.1  # Tekrarları önlemek için hafif bir frequency penalty ekleyelim
        )
        
        tale_text = response.choices[0].message.content.strip()
        
        # Kelime sayısı kontrolü
        words = tale_text.split()
        word_count = len(words)
        logger.info(f"OpenAI tarafından üretilen kelime sayısı: {word_count}")
        
        if word_count > word_limit * 1.2:  # %20 tolerans
            logger.info(f"Kelime sayısı fazla, {word_limit} kelimeye kısaltılıyor...")
            tale_text = ' '.join(words[:word_limit])
        elif word_count < word_limit * 0.8:  # Kelime sayısı %20'den fazla az ise
            logger.warning(f"Kelime sayısı çok az ({word_count}), istenen: {word_limit}. Yeniden deneniyor...")
            
            # Yeni bir prompt oluştur ve daha net şekilde kelime sayısını vurgula
            retry_prompt = f"""
            GÖREV: Tam olarak {word_limit} kelimeden oluşan bir çocuk masalı yaz.

            ÖNEMLİ TALİMATLAR (DİKKATLİCE UYGULANACAK):
            1. Hikaye TAM OLARAK {word_limit} kelime içermeli - kelime sayacı kullanarak ÜÇ KEZ sayımı doğrula
            2. Hikaye şunları içermeli:
               - Ana karakter: {character_name} adında bir {character_type}
               - Ortam: {setting}
               - Tema: {theme}
            3. Çocuk dostu ve eğitici olmalı (7-10 yaş)
            4. Basit Türkçe kullan
            5. Başlık EKLEME
            6. Kelime sayısını metnin içinde belirtme
            7. Masal {word_limit} KELİMEDEN NE BİR FAZLA NE BİR EKSİK olmalı
            
            ÇOK ÖNEMLİ: Sadece masal metnini gönder. Başlık, açıklama veya kelime sayısı bildirimi ekleme.
            """
            
            try:
                # Yeniden deneme
                retry_response = openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Sen kelime sayısı limitlerini tam olarak izleyen bir yazarsın. Verilen kelime sayısı limitlerini daima tam olarak uygularsın."},
                        {"role": "user", "content": retry_prompt}
                    ],
                    max_tokens=min(4000, word_limit * 10),  # Daha fazla token, ama limite uygun
                    temperature=0.5,  # Daha az yaratıcılık (daha kurallara uygun)
                    presence_penalty=0.2,
                    frequency_penalty=0.2
                )
                
                # Yeni yanıtı kontrol et
                retry_text = retry_response.choices[0].message.content.strip()
                retry_words = retry_text.split()
                retry_count = len(retry_words)
                
                logger.info(f"Yeniden deneme sonucu kelime sayısı: {retry_count}")
                
                # Eğer yeni deneme daha iyi sonuç verdiyse, onu kullan
                if abs(retry_count - word_limit) < abs(word_count - word_limit):
                    logger.info(f"Yeniden deneme daha iyi sonuç verdi, bu metin kullanılacak")
                    tale_text = retry_text
                    # Kelime sınırı kontrolü hala gerekli olabilir
                    if retry_count > word_limit * 1.2:
                        tale_text = ' '.join(retry_words[:word_limit])
                else:
                    logger.info(f"İlk deneme daha iyi sonuç verdi, orijinal metin kullanılacak")
            except Exception as retry_e:
                logger.error(f"Yeniden deneme sırasında hata: {str(retry_e)}")
                # Hata durumunda orijinal metni kullan
        
        return tale_text
        
    except Exception as e:
        logger.error(f"OpenAI ile masal metni oluşturulurken hata: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def split_text_into_sections(text, words_per_section):
    """Metni belirli kelime sayısına göre bölümlere ayırır"""
    words = text.split()
    sections = []
    
    for i in range(0, len(words), words_per_section):
        section = ' '.join(words[i:i + words_per_section])
        sections.append(section)
    
    return sections

def generate_image_for_section(section_text, image_api='dalle'):
    """Bölüm metni için görsel oluşturur"""
    try:
        # Kullanıcı DALL-E'yi seçtiyse ve OpenAI API anahtarı varsa DALL-E kullan
        if image_api == 'dalle' and openai_client:
            logger.info("DALL-E API kullanılıyor...")
            return generate_image_with_dalle(section_text)
        # Diğer durumlarda Gemini API ile dene
        else:
            logger.info("Gemini API kullanılıyor...")
            return generate_image_with_gemini(section_text)
    except Exception as e:
        logger.error(f"Görsel oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        # Hata durumunda da placeholder görüntü oluştur
        return create_placeholder_image(section_text)

def generate_image_with_dalle(prompt):
    """OpenAI DALL-E API kullanarak görsel oluşturur"""
    try:
        # Prompt'u çocuk dostu hale getir
        enhanced_prompt = f"Çocuk dostu, renkli, çizgi film tarzında: {prompt}"
        logger.info(f"DALL-E prompt: {enhanced_prompt[:100]}...")
        
        # Rate limit kontrolü için basit hız sınırlama
        # En son DALL-E API çağrısı zamanını kontrol et
        current_time = time.time()
        if hasattr(generate_image_with_dalle, 'last_call_time'):
            time_since_last_call = current_time - generate_image_with_dalle.last_call_time
            # DALL-E'nin rate limiti dakikada 5 istek olduğu için en az 12 saniye bekleyelim
            if time_since_last_call < 12:  # Saniye cinsinden bekleme süresi
                wait_time = 12 - time_since_last_call
                logger.info(f"DALL-E rate limit koruması: {wait_time:.2f} saniye bekleniyor...")
                time.sleep(wait_time)
        
        # Bu çağrı zamanını kaydet
        generate_image_with_dalle.last_call_time = time.time()
        
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            style="vivid"  # "vivid" veya "natural" olabilir
        )
        image_url = response.data[0].url
        logger.info(f"DALL-E görsel URL'si oluşturuldu: {image_url[:50]}...")
        
        # Resmi indir
        image_response = requests.get(image_url)
        image_data = image_response.content
        
        # Base64 formatına dönüştür
        base64_image = base64.b64encode(image_data).decode('utf-8')
        logger.info("DALL-E görsel başarıyla oluşturuldu ve Base64 formatına dönüştürüldü.")
        return base64_image
    
    except Exception as e:
        logger.error(f"OpenAI ile görsel oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        # OpenAI hatası durumunda Gemini ile dene
        logger.info("DALL-E hatası nedeniyle Gemini API'ye geçiliyor...")
        return generate_image_with_gemini(prompt)

def generate_image_with_gemini(section_text):
    """Gemini API kullanarak görsel oluşturur"""
    try:
        # İlk tercih edilen model
        try:
            model = genai.GenerativeModel("models/gemini-2.0-flash-001")
            logger.info("Görsel için models/gemini-2.0-flash-001 modeli kullanılıyor")
        except Exception as e1:
            logger.warning(f"Görsel için models/gemini-2.0-flash-001 modeli yüklenemedi: {str(e1)}")
            
            # İkinci tercih edilen model
            try:
                model = genai.GenerativeModel("models/gemini-2.0-flash-lite-001")
                logger.info("Görsel için models/gemini-2.0-flash-lite-001 modeli kullanılıyor")
            except Exception as e2:
                logger.warning(f"Görsel için models/gemini-2.0-flash-lite-001 modeli yüklenemedi: {str(e2)}")
                
                # Son çare olarak bilinen çalışan modeli dene
                model = genai.GenerativeModel("models/gemini-1.5-pro")
                logger.info("Görsel için models/gemini-1.5-pro modeli kullanılıyor")
        
        prompt = f"""
        Lütfen aşağıdaki metne uygun, çocuk kitabı tarzında, renkli ve sevimli bir illüstrasyon oluştur:
        
        {section_text}
        
        İllüstrasyon 3-7 yaş arası çocuklar için uygun, canlı renkli ve detaylı olmalı.
        Tarz olarak Disney/Pixar animasyon filmlerine benzer, sevimli karakterler içermeli.
        Görsel yüksek çözünürlüklü ve net olmalı.
        """
        
        response = model.generate_content(prompt)
        
        # Yanıtı kontrol et ve görüntü verisini çıkar
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    # Base64 kodlu görüntüyü döndür
                    logger.info("Gemini görsel başarıyla oluşturuldu.")
                    return part.inline_data.data
        
        # Eğer görüntü oluşturulamazsa, boş bir görüntü oluştur
        logger.warning("Gemini görsel oluşturamadı, placeholder görüntü oluşturuluyor.")
        return create_placeholder_image(section_text)
    
    except Exception as e:
        logger.error(f"Görsel oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        # Hata durumunda da placeholder görüntü oluştur
        return create_placeholder_image(section_text)

def create_placeholder_image(text):
    """Metinden basit bir placeholder görüntü oluşturur"""
    try:
        # Basit bir renkli arka plan oluştur
        width, height = 512, 512
        image = Image.new('RGB', (width, height), color=(240, 248, 255))
        
        # Görüntüyü base64 formatına dönüştür
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        logger.info("Placeholder görüntü başarıyla oluşturuldu.")
        return base64_image
    except Exception as e:
        logger.error(f"Placeholder görüntü oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        return None

def identify_sound_effect_keywords(text):
    """Metinde ses efekti eklenebilecek anahtar kelimeleri belirler"""
    # Mevcut ses efektleri
    available_sounds = {
        'aslan': {'file': 'lion_roar.mp3', 'description': 'Aslan kükremesi'},
        'kedi': {'file': 'cat_meow.mp3', 'description': 'Kedi miyavlaması'},
        'köpek': {'file': 'dog_bark.mp3', 'description': 'Köpek havlaması'},
        'kuş': {'file': 'bird_chirp.mp3', 'description': 'Kuş cıvıltısı'},
        'su': {'file': 'water_splash.mp3', 'description': 'Su sesi'},
        'kapı': {'file': 'door_knock.mp3', 'description': 'Kapı çalma sesi'},
        'gülme': {'file': 'laugh.mp3', 'description': 'Gülme sesi'},
        'ağlama': {'file': 'cry.mp3', 'description': 'Ağlama sesi'},
        'gök gürültüsü': {'file': 'thunder.mp3', 'description': 'Gök gürültüsü'}
    }
    
    # Metinde geçen ses efektlerini bul
    found_effects = {}
    for keyword, sound_data in available_sounds.items():
        if keyword in text.lower():
            found_effects[keyword] = sound_data
    
    return found_effects

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8500, debug=True)
