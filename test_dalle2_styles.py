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
            
            # Dosya adına stil bilgisi ekle
            style_tag = prompt.split(':', 1)[0].replace(' ', '_').lower()
            if len(style_tag) > 30:  # Çok uzun olmaması için kısıtlama
                style_tag = style_tag[:30]
            
            image_path = f"static/test_images/dalle2_{style_tag}_{timestamp}.jpg"
            
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
    parser = argparse.ArgumentParser(description='DALL-E 2 farklı stil testleri')
    parser.add_argument('--size', type=str, default="512x512", choices=["256x256", "512x512", "1024x1024"],
                      help='Görsel boyutu (256x256, 512x512, 1024x1024)')
    
    args = parser.parse_args()
    
    # Test için klasörleri oluştur
    os.makedirs("logs", exist_ok=True)
    os.makedirs("static/test_images", exist_ok=True)
    
    logger.info(f"DALL-E 2 Stil Testleri başlatılıyor...")
    logger.info(f"Görsel boyutu: {args.size}")
    
    # Test edilecek farklı prompt stilleri
    character_name = "Luna"
    character_type = "fairy"
    setting = "enchanted forest"
    scene = "finding a magical glowing flower under moonlight"
    
    # Farklı stil tanımlamaları
    style_prompts = [
        f"Fairy tale style: A character named {character_name}, who is a {character_type}, in the setting of {setting}, with the scene: {scene}",
        
        f"Children's book illustration: A character named {character_name}, who is a {character_type}, in the enchanted {setting}, with the scene: {scene}",
        
        f"Dreamy watercolor style: A character named {character_name}, who is a {character_type}, in a magical {setting}, with the scene: {scene}",
        
        f"Fantasy storybook art: A character named {character_name}, who is a {character_type}, in the mystical {setting}, with the scene: {scene}",
        
        f"Whimsical fairytale illustration: A character named {character_name}, who is a {character_type}, in the dreamland of {setting}, with the scene: {scene}",
        
        f"Magical fable artwork: A character named {character_name}, who is a {character_type}, in the tale world of {setting}, with the scene: {scene}",
        
        f"Enchanted story style: A beautiful illustration of {character_name} the {character_type} in the magical {setting}, {scene}"
    ]
    
    results = {}
    
    # Her stil için test yap
    for i, prompt in enumerate(style_prompts):
        style_name = prompt.split(':', 1)[0]  # İlk iki nokta üst üsteye kadar olan kısım
        logger.info(f"Test {i+1}/{len(style_prompts)}: {style_name}")
        logger.info(f"Prompt: {prompt}")
        
        start_time = time.time()
        image_path, image_url = generate_image_with_dalle2(prompt, args.size)
        end_time = time.time()
        
        if image_path:
            logger.info(f"Test başarılı! Görsel oluşturuldu: {image_path}")
            logger.info(f"İşlem süresi: {end_time - start_time:.2f} saniye")
            
            # Test sonuçlarını kaydet
            results[style_name] = {
                "success": True,
                "prompt": prompt,
                "size": args.size,
                "image_path": image_path,
                "image_url": image_url,
                "processing_time": end_time - start_time
            }
        else:
            logger.error(f"Test başarısız! Görsel oluşturulamadı.")
            results[style_name] = {
                "success": False,
                "prompt": prompt,
                "size": args.size
            }
        
        # Rate limit aşımını önlemek için 15 saniye bekle
        if i < len(style_prompts) - 1:
            logger.info("Rate limit aşımını önlemek için 15 saniye bekleniyor...")
            time.sleep(15)
    
    # Sonuçları kaydet
    test_result = {
        "timestamp": datetime.now().isoformat(),
        "results": results
    }
    
    result_path = f"logs/dalle2_styles_test_{int(time.time())}.json"
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(test_result, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Tüm testler tamamlandı. Sonuçlar kaydedildi: {result_path}")
    logger.info(f"Oluşturulan görseller: static/test_images/ klasöründe")

if __name__ == "__main__":
    main()