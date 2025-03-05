import os
import base64
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io

# .env dosyasından API anahtarını yükle
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Lütfen .env dosyasına GOOGLE_API_KEY değerini ekleyin.")
    exit(1)

# Gemini API'yi yapılandır
genai.configure(api_key=api_key)

def test_text_generation():
    """Metin üretimi testi"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("2 yaşındaki bir çocuk için kısa bir masal yazar mısın?")
        print("=== METİN ÜRETİMİ TESTİ ===")
        print(response.text)
        print("\nMetin üretimi başarılı!")
        return True
    except Exception as e:
        print(f"Metin üretimi hatası: {e}")
        return False

def test_image_generation():
    """Resim üretimi testi"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Bir kedi oynarken bir ip ile görüntü oluştur.")
        
        print("=== RESİM ÜRETİMİ TESTİ ===")
        
        # Yanıtı kontrol et
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    # Base64 kodlu görüntüyü çöz
                    image_data = base64.b64decode(part.inline_data.data)
                    
                    # Görüntüyü kaydet
                    with open("test_image.png", "wb") as f:
                        f.write(image_data)
                    
                    # Görüntüyü göster
                    img = Image.open(io.BytesIO(image_data))
                    img.save("test_image.png")
                    
                    print("Görüntü başarıyla oluşturuldu ve 'test_image.png' olarak kaydedildi!")
                    return True
        
        print("Yanıtta görüntü verisi bulunamadı.")
        print("Yanıt içeriği:", response.text)
        return False
    
    except Exception as e:
        print(f"Resim üretimi hatası: {e}")
        return False

if __name__ == "__main__":
    print("Gemini API Test Programı")
    print("-----------------------")
    
    text_success = test_text_generation()
    print("\n")
    image_success = test_image_generation()
    
    if text_success and image_success:
        print("\nTüm testler başarılı! Gemini API hem metin hem de resim üretimi için kullanılabilir.")
    elif text_success:
        print("\nSadece metin üretimi başarılı. Resim üretimi için alternatif bir API kullanmanız gerekebilir.")
    else:
        print("\nTestler başarısız. API anahtarınızı ve bağlantınızı kontrol edin.")
