import os
import base64
import io
import sys
import traceback
import json
import logging
from flask import Flask, render_template, request, jsonify, send_file
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

# Loglama yapılandırması
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

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
CORS(app)  # CORS desteği ekle
logger.info("Flask uygulaması ve CORS yapılandırıldı.")

@app.route('/')
def index():
    logger.debug("Ana sayfa isteği alındı.")
    return render_template('index.html')

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
        else:
            # Form verilerini al
            character_name = request.form.get('character_name', '')
            character_type = request.form.get('character_type', '')
            setting = request.form.get('setting', '')
            theme = request.form.get('theme', '')
            
            # word_limit ve image_api değerleri için hata kontrolü
            try:
                word_limit = int(request.form.get('word_limit', 200))
            except ValueError:
                logger.warning("Kelime sayısı geçersiz, varsayılan değer kullanılıyor.")
                word_limit = 200
                
            image_api = request.form.get('image_api', 'dalle')
        
        logger.info(f"Alınan form verileri: Karakter Adı: {character_name}, Karakter Türü: {character_type}, Ortam: {setting}, Tema: {theme}, Kelime Sayısı: {word_limit}, Görsel API: {image_api}")
        
        # Veri doğrulama
        if not character_name or not character_type or not setting or not theme:
            logger.error("Eksik form verileri")
            return jsonify({"error": "Lütfen tüm alanları doldurunuz."}), 400
        
        # Masal oluşturma
        logger.info("Masal metni oluşturuluyor...")
        tale_text = generate_tale_text(character_name, character_type, setting, theme, word_limit)
        
        # Başlık oluştur
        tale_title = f"{character_name}'nin {setting} Macerası"
        logger.info(f"Masal başlığı oluşturuldu: {tale_title}")
        
        # Görsel oluştur
        logger.info(f"{image_api} API kullanarak görsel oluşturuluyor...")
        image_prompt = f"{character_name} adlı {character_type} karakteri {setting} ortamında, {theme} temalı bir masal için çocuk kitabı tarzında illüstrasyon"
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
        
        # Ses dosyası oluştur
        audio_path = create_audio(text)
        
        # Ses dosyasını gönder
        return send_file(audio_path, as_attachment=True, download_name='masal.mp3')
    except Exception as e:
        logger.error(f"Ses oluşturma hatası: {str(e)}")
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
    """Metinden ses dosyası oluşturur"""
    try:
        # Geçici ses dosyası oluştur
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            audio_path = f.name
        
        # Metni sese dönüştür
        tts = gTTS(text=text, lang='tr', slow=False)
        tts.save(audio_path)
        
        return audio_path
    except Exception as e:
        logger.error(f"Ses oluşturma hatası: {e}")
        logger.error(traceback.format_exc())
        raise

def generate_tale_text(character_name, character_type, setting, theme, word_limit):
    """Gemini API kullanarak masal metni oluşturur"""
    try:
        # Güncel model adı formatı
        logger.info("Gemini API ile masal metni oluşturuluyor...")
        
        # Desteklenen modelleri listele
        try:
            models = genai.list_models()
            logger.info(f"Kullanılabilir modeller: {[model.name for model in models]}")
        except Exception as e:
            logger.warning(f"Model listesi alınamadı: {str(e)}")
        
        # Doğru model adını kullan (güncel API'ye göre)
        try:
            model = genai.GenerativeModel("models/gemini-1.5-pro")
        except Exception as e1:
            logger.warning(f"models/gemini-1.5-pro modeli yüklenemedi: {str(e1)}")
            try:
                model = genai.GenerativeModel("models/gemini-pro")
            except Exception as e2:
                logger.warning(f"models/gemini-pro modeli yüklenemedi: {str(e2)}")
                try:
                    model = genai.GenerativeModel("gemini-pro")
                except Exception as e3:
                    logger.error(f"Hiçbir Gemini modeli yüklenemedi: {str(e3)}")
                    raise ValueError("Gemini API modeli başlatılamadı")
        
        prompt = f"""
        Çocuklar için {word_limit} kelimelik bir masal yaz. Masal şu özelliklere sahip olmalı:
        - Ana karakter: {character_name} adında bir {character_type}
        - Ortam: {setting}
        - Tema: {theme}
        - Masal eğitici ve çocuk dostu olmalı
        - Karmaşık kelimeler kullanma, 7-10 yaş arası çocukların anlayabileceği dilde olsun
        - Türkçe olarak yaz
        - Sadece masal metnini döndür, başlık veya açıklama ekleme
        """
        
        response = model.generate_content(prompt)
        tale_text = response.text.strip()
        
        # Kelime sayısı kontrolü
        words = tale_text.split()
        if len(words) > word_limit * 1.2:  # %20 tolerans
            tale_text = ' '.join(words[:word_limit])
        
        return tale_text
    
    except Exception as e:
        logger.error(f"Masal metni oluşturulurken hata: {str(e)}")
        logger.error(traceback.format_exc())
        return f"Masal oluşturulamadı. Hata: {str(e)}"

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
    """Gemini API kullanarak görsel oluşturur (deneysel)"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        Lütfen aşağıdaki metne uygun, çocuk kitabı tarzında, renkli ve sevimli bir illüstrasyon oluştur:
        
        {section_text}
        
        İllüstrasyon 2-3 yaş arası çocuklar için uygun olmalı.
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
    app.run(debug=True)
