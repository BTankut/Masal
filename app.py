import os
import base64
import io
import sys
import traceback
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import requests
from openai import OpenAI
import tempfile
from gtts import gTTS
from docx import Document
from docx.shared import Inches

# .env dosyasından API anahtarlarını yükle
load_dotenv()
google_api_key = os.getenv("GOOGLE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not google_api_key:
    raise ValueError("Lütfen .env dosyasına GOOGLE_API_KEY değerini ekleyin.")

# Gemini API'yi yapılandır
genai.configure(api_key=google_api_key)

# OpenAI API'yi yapılandır
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
    print("OpenAI API yapılandırıldı.")
else:
    openai_client = None
    print("UYARI: OpenAI API anahtarı bulunamadı. DALL-E görsel oluşturma devre dışı.")

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_tale', methods=['POST'])
def generate_tale():
    try:
        print("Masal oluşturma isteği alındı.")
        
        # Form verilerini al
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
            theme = data.get('theme', '')
            characters = data.get('characters', '')
            word_limit = int(data.get('word_limit', 500))
            image_api = data.get('image_api', 'dalle')
        else:
            # Form verilerini al
            theme = request.form.get('theme', '')
            characters = request.form.get('characters', '')
            word_limit = int(request.form.get('word_limit', 500))
            image_api = request.form.get('image_api', 'dalle')
        
        print(f"Tema: {theme}, Karakterler: {characters}, Kelime Sayısı: {word_limit}, Görsel API: {image_api}")
        
        # Masal oluşturma
        print("Masal metni oluşturuluyor...")
        tale_text = generate_tale_text(theme, characters, word_limit)
        
        # Metni bölümlere ayır (her 50 kelime için bir bölüm)
        tale_sections = split_text_into_sections(tale_text, 50)
        print(f"{len(tale_sections)} bölüm oluşturuldu.")
        
        # Her bölüm için görsel oluşturma denemesi
        images = []
        print("Görseller oluşturuluyor...")
        for i, section in enumerate(tale_sections):
            print(f"Bölüm {i+1} için görsel oluşturuluyor...")
            image_data = generate_image_for_section(section, image_api)
            if image_data:
                images.append(image_data)
                print(f"Bölüm {i+1} için görsel başarıyla oluşturuldu.")
            else:
                print(f"Bölüm {i+1} için görsel oluşturulamadı.")
        
        # Ses efektleri için anahtar kelimeleri belirle
        sound_effects = identify_sound_effect_keywords(tale_text)
        print(f"{len(sound_effects)} ses efekti belirlendi.")
        
        print("İşlem tamamlandı, yanıt gönderiliyor.")
        return jsonify({
            'tale_text': tale_text,
            'tale_sections': tale_sections,
            'images': images,
            'sound_effects': sound_effects
        })
    except Exception as e:
        print(f"HATA: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'tale_text': 'Masal oluşturulurken bir hata oluştu.',
            'tale_sections': [],
            'images': [],
            'sound_effects': {}
        }), 500

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
        print(f"Word dosyası oluşturma hatası: {str(e)}")
        print(traceback.format_exc())
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
        print(f"Ses oluşturma hatası: {str(e)}")
        print(traceback.format_exc())
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
        print(f"Word dosyası oluşturma hatası: {e}")
        print(traceback.format_exc())
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
        print(f"Ses oluşturma hatası: {e}")
        print(traceback.format_exc())
        raise

def generate_tale_text(theme, characters, word_limit):
    """Gemini API kullanarak masal metni oluşturur"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        2 yaşındaki bir çocuk için bir masal yazar mısın? 
        Tema: {theme}
        Karakterler: {characters}
        Kelime sayısı yaklaşık {word_limit} olsun.
        Masal basit, anlaşılır ve çocuk dostu olmalı.
        """
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Masal oluşturma hatası: {e}")
        print(traceback.format_exc())
        return f"Masal oluşturulamadı: {str(e)}"

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
            print("DALL-E API kullanılıyor...")
            return generate_image_with_dalle(section_text)
        # Diğer durumlarda Gemini API ile dene
        else:
            print("Gemini API kullanılıyor...")
            return generate_image_with_gemini(section_text)
    except Exception as e:
        print(f"Görsel oluşturma hatası: {e}")
        print(traceback.format_exc())
        return create_placeholder_image(section_text)

def generate_image_with_dalle(prompt):
    """OpenAI DALL-E API kullanarak görsel oluşturur"""
    try:
        # Prompt'u çocuk dostu hale getir
        enhanced_prompt = f"Çocuk dostu, renkli, çizgi film tarzında: {prompt}"
        print(f"DALL-E prompt: {enhanced_prompt[:100]}...")
        
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            style="vivid"  # "vivid" veya "natural" olabilir
        )
        image_url = response.data[0].url
        print(f"DALL-E görsel URL'si oluşturuldu: {image_url[:50]}...")
        
        # Resmi indir
        image_response = requests.get(image_url)
        image_data = image_response.content
        
        # Base64 formatına dönüştür
        base64_image = base64.b64encode(image_data).decode('utf-8')
        print("DALL-E görsel başarıyla oluşturuldu ve Base64 formatına dönüştürüldü.")
        return base64_image
    
    except Exception as e:
        print(f"OpenAI ile görsel oluşturma hatası: {e}")
        print(traceback.format_exc())
        # OpenAI hatası durumunda Gemini ile dene
        print("DALL-E hatası nedeniyle Gemini API'ye geçiliyor...")
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
                    print("Gemini görsel başarıyla oluşturuldu.")
                    return part.inline_data.data
        
        # Eğer görüntü oluşturulamazsa, boş bir görüntü oluştur
        print("Gemini görsel oluşturamadı, placeholder görüntü oluşturuluyor.")
        return create_placeholder_image(section_text)
    
    except Exception as e:
        print(f"Görsel oluşturma hatası: {e}")
        print(traceback.format_exc())
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
        
        print("Placeholder görüntü başarıyla oluşturuldu.")
        return base64_image
    except Exception as e:
        print(f"Placeholder görüntü oluşturma hatası: {e}")
        print(traceback.format_exc())
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
