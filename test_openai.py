import os
import base64
from dotenv import load_dotenv
import openai
import requests
from PIL import Image
import io

# .env dosyasından API anahtarını yükle
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("Lütfen .env dosyasına OPENAI_API_KEY değerini ekleyin.")
    exit(1)

# OpenAI API'yi yapılandır
openai.api_key = api_key

def test_image_generation():
    """OpenAI DALL-E ile resim üretimi testi"""
    try:
        prompt = "Bir kedi oynarken bir ip ile, çocuk dostu, renkli, çizgi film tarzında"
        
        # OpenAI API'nin sürümüne göre doğru çağrı yöntemini kullan
        try:
            # Yeni OpenAI API (1.0.0+)
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
                style="vivid"  # "vivid" veya "natural" olabilir
            )
            image_url = response.data[0].url
            
        except (ImportError, AttributeError):
            # Eski OpenAI API (0.27.x)
            response = openai.Image.create(
                prompt=prompt,
                n=1,
                size="1024x1024",
                response_format="url"
            )
            image_url = response['data'][0]['url']
        
        print("=== RESİM ÜRETİMİ TESTİ ===")
        print(f"Resim URL: {image_url}")
        
        # Resmi indir
        image_response = requests.get(image_url)
        image_data = image_response.content
        
        # Resmi kaydet
        with open("test_image_openai.png", "wb") as f:
            f.write(image_data)
        
        # Resmi göster
        img = Image.open(io.BytesIO(image_data))
        img.save("test_image_openai.png")
        
        print("Görüntü başarıyla oluşturuldu ve 'test_image_openai.png' olarak kaydedildi!")
        return True
    
    except Exception as e:
        print(f"Resim üretimi hatası: {e}")
        return False

if __name__ == "__main__":
    print("OpenAI DALL-E Test Programı")
    print("-----------------------")
    
    image_success = test_image_generation()
    
    if image_success:
        print("\nTest başarılı! OpenAI DALL-E API'si resim üretimi için kullanılabilir.")
    else:
        print("\nTest başarısız. API anahtarınızı ve bağlantınızı kontrol edin.")
