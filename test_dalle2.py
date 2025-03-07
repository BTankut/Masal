#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
import time
import argparse
import requests
from datetime import datetime
import logging
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# Loglama ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"logs/dalle2_test_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log")
    ]
)
logger = logging.getLogger(__name__)

def generate_image_with_dalle2(prompt, size="512x512"):
    """
    DALL-E 2 API ile bir görsel oluşturur
    
    Args:
        prompt (str): Görsel için açıklama
        size (str): Görsel boyutu ("256x256", "512x512", "1024x1024")
    
    Returns:
        str: Oluşturulan görselin URL'si
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY bulunamadı. .env dosyasını kontrol edin.")
    
    logger.info(f"DALL-E 2 ile görsel oluşturuluyor: {prompt[:50]}... - Boyut: {size}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "prompt": prompt,
        "n": 1,  # 1 görsel oluştur
        "size": size,
        "model": "dall-e-2"  # DALL-E 2 modelini belirt
    }
    
    try:
        # API isteği gönder
        response = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers=headers,
            json=data
        )
        
        if response.status_code == 429:
            logger.warning("Rate limit aşıldı. 12 saniye bekleniyor...")
            time.sleep(12)
            return generate_image_with_dalle2(prompt, size)
        
        # Yanıtı kontrol et
        response.raise_for_status()
        result = response.json()
        
        if "data" in result and len(result["data"]) > 0:
            image_url = result["data"][0]["url"]
            logger.info(f"Görsel başarıyla oluşturuldu: {image_url[:50]}...")
            
            # Görseli indir
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            # Görseli kaydet
            timestamp = int(time.time() * 1000)
            os.makedirs("static/test_images", exist_ok=True)
            image_path = f"static/test_images/dalle2_{size}_{timestamp}.jpg"
            
            with open(image_path, "wb") as f:
                f.write(image_response.content)
            
            logger.info(f"Görsel kaydedildi: {image_path}")
            return image_path, image_url
        else:
            logger.error(f"Görsel oluşturulamadı. API yanıtı: {result}")
            return None, None
    
    except Exception as e:
        logger.error(f"Görsel oluşturma hatası: {str(e)}")
        return None, None

def main():
    parser = argparse.ArgumentParser(description='DALL-E 2 görsel oluşturma testi')
    parser.add_argument('--prompt', type=str, default="A cute cat sitting on a windowsill watching birds", 
                        help='Görsel oluşturma için açıklama')
    parser.add_argument('--size', type=str, default="512x512", choices=["256x256", "512x512", "1024x1024"],
                        help='Görsel boyutu (256x256, 512x512, 1024x1024)')
    parser.add_argument('--language', type=str, default="both", choices=["en", "tr", "both"],
                        help='Dil seçimi (en: İngilizce, tr: Türkçe, both: Her ikisi)')
    
    args = parser.parse_args()
    
    # Test için log klasörünü oluştur
    os.makedirs("logs", exist_ok=True)
    os.makedirs("static/test_images", exist_ok=True)
    
    logger.info(f"DALL-E 2 Test başlatılıyor...")
    
    prompts = {}
    
    if args.language == "en" or args.language == "both":
        if args.prompt == "A cute cat sitting on a windowsill watching birds":
            # Varsayılan İngilizce prompt kullanılıyorsa
            prompts["en"] = args.prompt
        else:
            # Kullanıcı özel prompt girdiyse
            prompts["en"] = args.prompt
    
    if args.language == "tr" or args.language == "both":
        if args.prompt == "A cute cat sitting on a windowsill watching birds":
            # Varsayılan Türkçe prompt kullanılıyorsa
            prompts["tr"] = "Pencere kenarında oturup kuşları izleyen sevimli bir kedi"
        else:
            # Kullanıcı özel prompt girdiyse
            prompts["tr"] = args.prompt
    
    results = {}
    
    # Her dil için test yap
    for lang, prompt in prompts.items():
        logger.info(f"Dil: {lang}, Prompt: {prompt}")
        logger.info(f"Boyut: {args.size}")
        
        start_time = time.time()
        image_path, image_url = generate_image_with_dalle2(prompt, args.size)
        end_time = time.time()
        
        if image_path:
            logger.info(f"{lang} testi başarılı! Görsel oluşturuldu: {image_path}")
            logger.info(f"Orijinal URL: {image_url}")
            logger.info(f"İşlem süresi: {end_time - start_time:.2f} saniye")
            
            # Test sonuçlarını kaydet
            results[lang] = {
                "success": True,
                "prompt": prompt,
                "size": args.size,
                "image_path": image_path,
                "image_url": image_url,
                "processing_time": end_time - start_time
            }
        else:
            logger.error(f"{lang} testi başarısız! Görsel oluşturulamadı.")
            results[lang] = {
                "success": False,
                "prompt": prompt,
                "size": args.size
            }
    
    # Sonuçları kaydet
    test_result = {
        "timestamp": datetime.now().isoformat(),
        "results": results
    }
    
    with open(f"logs/dalle2_test_result_{int(time.time())}.json", "w", encoding="utf-8") as f:
        json.dump(test_result, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()