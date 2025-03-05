#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Masal AI için Kelime Sayısı Testi
Bu script OpenAI ve Gemini API'lerini farklı prompt formülleriyle test eder ve doğru kelime sayısı
elde etmek için en iyi yöntemi bulmaya çalışır.
"""

import os
import re
import time
import logging
import argparse
from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI

# Loglama ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler("prompt_test.log")]
)
logger = logging.getLogger(__name__)

# .env dosyasından API anahtarlarını yükle
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# API istemcilerini oluştur
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None
    logger.warning("OpenAI API anahtarı bulunamadı.")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("Gemini API anahtarı bulunamadı.")

# Test edilen prompt formülleri
PROMPT_FORMULAS = [
    # Standart prompt
    """
    Çocuklar için {word_count} kelimelik bir masal yaz. Masal şu özelliklere sahip olmalı:
    - Ana karakter: Mila adında bir bilim insanı
    - Ortam: uzay
    - Tema: keşif
    - Masal eğitici ve çocuk dostu olmalı
    - Karmaşık kelimeler kullanma, 7-10 yaş arası çocukların anlayabileceği dilde olsun
    - Türkçe olarak yaz
    - Sadece masal metnini döndür, başlık veya açıklama ekleme
    """,
    
    # Kesin kelime sayısını vurgulayan
    """
    Çocuklar için TAM OLARAK {word_count} KELİMELİK bir masal yaz. Kelime sayısı {word_count} olmalı.
    - Ana karakter: Mila adında bir bilim insanı
    - Ortam: uzay
    - Tema: keşif
    - Masal eğitici ve çocuk dostu olmalı
    - Karmaşık kelimeler kullanma
    - Türkçe olarak yaz
    - Sadece masal metnini döndür, başlık veya açıklama ekleme
    - ÖNEMLİ: Masal tam olarak {word_count} kelime içermeli, daha fazla veya daha az değil
    """,
    
    # Zorlayıcı öğretici prompt
    """
    Çocuklar için bir masal yaz. Masal ŞU KURALLARI TAM OLARAK takip etmeli:
    1. Tam olarak {word_count} kelime içermeli, kelime sayacı kullanarak kontrol et
    2. Ana karakter: Mila adında bir bilim insanı olmalı
    3. Ortam: Uzay gemisi ve gezegenler
    4. Tema: Keşif ve bilim
    5. Eğitici ve çocuk dostu olmalı
    7. Türkçe yazılmalı
    8. Başlık veya kelime sayısı bildirimi içermemeli
    
    Kesinlikle {word_count} kelime kullan. Daha fazla veya daha az değil.
    """,
    
    # Sistem prompt + tematik prompt
    # Bu OpenAI'da sistem promptu + kullanıcı promptu olarak kullanılacak
    """
    [SİSTEM] Sen kelime sayısı kısıtlamalarına tam olarak uyan bir çocuk hikayesi yazarısın. 
    Tam olarak istenen kelime sayısında hikayeler üretirsin - kelime sayacı kullanırsın.
    
    [KULLANICI] Tam olarak {word_count} kelimeden oluşan bir uzay macerası yaz. 
    Mila adında bir bilim insanı hakkında olsun. 
    Uzayda geçsin ve keşif teması içersin.
    Çocuk dostu ve eğitici olsun. 
    Basit dil kullan.
    Türkçe yaz.
    Kelime sayısı: {word_count} (Lütfen tam bu sayıda kel. kullan, daha fazla/az değil)
    """,
    
    # Test 5: Daha katı uyarılarla birlikte
    """
    GÖREV: Tam olarak {word_count} kelimeden oluşan bir çocuk masalı yaz.

    ÖNEMLİ TALİMATLAR:
    1. Hikaye TAM OLARAK {word_count} kelime içermeli
    2. Hikaye şunları içermeli:
       - Ana karakter: Mila adında bir bilim insanı
       - Ortam: Uzay
       - Tema: Keşif ve bilim
    3. Çocuk dostu ve eğitici olmalı (7-10 yaş)
    4. Basit Türkçe kullan
    5. Kelime sayımını üç kez kontrol et
    6. Başlık EKLEME
    7. Ne bir kelime fazla, ne bir kelime eksik olmalı

    Kelime sayısını metnin kendisinde belirtme (yani metinde "Bu hikaye {word_count} kelimedir" gibi ifadeler kullanma).
    """
]

def count_words(text):
    """Metindeki kelime sayısını hesaplar."""
    # Temizleme: başlık/altbaşlık gibi ekstra metin içerebilir
    # Sadece ana metni almaya çalışalım
    cleaned_text = re.sub(r'^\s*[\w\s]*?:\s*\n+', '', text, flags=re.MULTILINE)  # Başlıkları temizle
    cleaned_text = re.sub(r'\n+Kelime sayısı:.*$', '', cleaned_text, flags=re.MULTILINE)  # Kelime sayısı bildirimini temizle
    
    # Kelime sayısı
    words = cleaned_text.split()
    return len(words)

def test_openai_prompt(prompt_template, target_word_count, model="gpt-3.5-turbo"):
    """OpenAI API ile belirli bir prompt şablonunu test eder."""
    if not openai_client:
        logger.error("OpenAI API anahtarı bulunamadı, test atlanıyor.")
        return None, None, 0

    # Sistem ve kullanıcı mesajlarını ayır
    if "[SİSTEM]" in prompt_template and "[KULLANICI]" in prompt_template:
        parts = prompt_template.split("[KULLANICI]")
        system_content = parts[0].replace("[SİSTEM]", "").strip()
        user_content = parts[1].strip().format(word_count=target_word_count)
        
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]
    else:
        # Normal prompt
        messages = [
            {"role": "system", "content": "Sen çocuklar için hikayeler yazan bir yazarsın."},
            {"role": "user", "content": prompt_template.format(word_count=target_word_count)}
        ]
        
        logger.debug(f"OpenAI için kullanılan tam prompt: {prompt_template.format(word_count=target_word_count)}")
    
    try:
        start_time = time.time()
        response = openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=min(4000, target_word_count * 10),  # Bol bol token ama limitle
            temperature=0.7,
            presence_penalty=0.1,
            frequency_penalty=0.1
        )
        elapsed_time = time.time() - start_time
        
        generated_text = response.choices[0].message.content.strip()
        actual_word_count = count_words(generated_text)
        
        return generated_text, actual_word_count, elapsed_time
    
    except Exception as e:
        logger.error(f"OpenAI API hatası: {str(e)}")
        return None, None, 0

def test_gemini_prompt(prompt_template, target_word_count, model="models/gemini-1.5-pro"):
    """Gemini API ile belirli bir prompt şablonunu test eder."""
    if not GOOGLE_API_KEY:
        logger.error("Gemini API anahtarı bulunamadı, test atlanıyor.")
        return None, None, 0

    # Sistem ve kullanıcı mesajlarını birleştir (Gemini farklı format kullanır)
    if "[SİSTEM]" in prompt_template and "[KULLANICI]" in prompt_template:
        parts = prompt_template.split("[KULLANICI]")
        system_content = parts[0].replace("[SİSTEM]", "").strip()
        user_content = parts[1].strip()
        
        full_prompt = f"{system_content}\n\n{user_content}".format(word_count=target_word_count)
    else:
        # Normal prompt
        full_prompt = prompt_template.format(word_count=target_word_count)
    
    logger.debug(f"Gemini için kullanılan tam prompt: {full_prompt}")
    
    try:
        try:
            gemini_model = genai.GenerativeModel(model)
        except:
            # Alternatif model adlarını dene
            try:
                gemini_model = genai.GenerativeModel("gemini-1.5-pro")
            except:
                gemini_model = genai.GenerativeModel("gemini-pro")
        
        start_time = time.time()
        response = gemini_model.generate_content(full_prompt)
        elapsed_time = time.time() - start_time
        
        generated_text = response.text.strip()
        actual_word_count = count_words(generated_text)
        
        return generated_text, actual_word_count, elapsed_time
    
    except Exception as e:
        logger.error(f"Gemini API hatası: {str(e)}")
        return None, None, 0

def run_tests(target_word_counts=[100, 300, 500], api="both"):
    """Belirtilen hedef kelime sayıları için tüm prompt şablonlarını test eder."""
    results = []
    
    # Test edilen prompt'ları içeriğiyle birlikte logla
    logger.info("\n--- TEST EDİLECEK PROMPT ŞABLONLARI ---")
    for i, prompt in enumerate(PROMPT_FORMULAS):
        logger.info(f"Prompt {i+1}:\n{prompt}\n{'-'*50}")
    
    for word_count in target_word_counts:
        logger.info(f"\n{'='*80}\nHEDEF KELİME SAYISI: {word_count}\n{'='*80}")
        
        for i, prompt in enumerate(PROMPT_FORMULAS):
            prompt_name = f"Prompt {i+1}"
            logger.info(f"\n--- Test ediliyor: {prompt_name} ---")
            
            # OpenAI testi
            if api in ["both", "openai"]:
                logger.info("OpenAI API testi...")
                openai_text, openai_count, openai_time = test_openai_prompt(prompt, word_count)
                
                if openai_text:
                    accuracy = abs(openai_count - word_count) / word_count * 100
                    logger.info(f"OpenAI Sonucu: {openai_count} kelime (Hedef: {word_count}, Sapma: %{accuracy:.2f}, Süre: {openai_time:.2f}s)")
                    
                    results.append({
                        "API": "OpenAI",
                        "Prompt": prompt_name,
                        "Hedef": word_count,
                        "Gerçek": openai_count,
                        "Sapma %": f"%{accuracy:.2f}",
                        "Süre": f"{openai_time:.2f}s"
                    })
                    
                    # İlk birkaç kelimeyi göster
                    preview = " ".join(openai_text.split()[:20]) + "..."
                    logger.info(f"Önizleme: {preview}")
                    
                    # Dosyaya kaydet
                    with open(f"openai_{word_count}_{i+1}.txt", "w", encoding="utf-8") as f:
                        f.write(openai_text)
                
                # API limit aşımını önlemek için bekleme
                time.sleep(2)
            
            # Gemini testi
            if api in ["both", "gemini"]:
                logger.info("Gemini API testi...")
                gemini_text, gemini_count, gemini_time = test_gemini_prompt(prompt, word_count)
                
                if gemini_text:
                    accuracy = abs(gemini_count - word_count) / word_count * 100
                    logger.info(f"Gemini Sonucu: {gemini_count} kelime (Hedef: {word_count}, Sapma: %{accuracy:.2f}, Süre: {gemini_time:.2f}s)")
                    
                    results.append({
                        "API": "Gemini",
                        "Prompt": prompt_name,
                        "Hedef": word_count,
                        "Gerçek": gemini_count,
                        "Sapma %": f"%{accuracy:.2f}",
                        "Süre": f"{gemini_time:.2f}s"
                    })
                    
                    # İlk birkaç kelimeyi göster
                    preview = " ".join(gemini_text.split()[:20]) + "..."
                    logger.info(f"Önizleme: {preview}")
                    
                    # Dosyaya kaydet
                    with open(f"gemini_{word_count}_{i+1}.txt", "w", encoding="utf-8") as f:
                        f.write(gemini_text)
                
                # API limit aşımını önlemek için bekleme
                time.sleep(2)
    
    # Sonuçları tablo olarak göster
    logger.info("\n\n--- SONUÇLAR ---")
    
    # Tablo başlığı
    header = "{:<10} {:<10} {:<10} {:<10} {:<10} {:<10}".format(
        "API", "Prompt", "Hedef", "Gerçek", "Sapma", "Süre"
    )
    logger.info("\n" + header)
    logger.info("-" * 60)
    
    # En başarılı promptları bul
    best_openai = {"sapma": float('inf'), "prompt": ""}
    best_gemini = {"sapma": float('inf'), "prompt": ""}
    
    # Sonuç satırları
    for result in results:
        row = "{:<10} {:<10} {:<10} {:<10} {:<10} {:<10}".format(
            result["API"],
            result["Prompt"],
            result["Hedef"],
            result["Gerçek"],
            result["Sapma %"],
            result["Süre"]
        )
        logger.info(row)
        
        # En iyi sonuçları izle
        sapma = float(result["Sapma %"].replace("%", ""))
        if result["API"] == "OpenAI" and sapma < best_openai["sapma"]:
            best_openai["sapma"] = sapma
            best_openai["prompt"] = result["Prompt"]
        
        if result["API"] == "Gemini" and sapma < best_gemini["sapma"]:
            best_gemini["sapma"] = sapma
            best_gemini["prompt"] = result["Prompt"]
    
    # En iyi sonuçları göster
    logger.info("\n--- EN İYİ PROMPTLAR ---")
    logger.info(f"OpenAI için en iyi prompt: {best_openai['prompt']} (Sapma: %{best_openai['sapma']:.2f})")
    logger.info(f"Gemini için en iyi prompt: {best_gemini['prompt']} (Sapma: %{best_gemini['sapma']:.2f})")
    
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI API kelime sayısı test aracı")
    parser.add_argument("--counts", type=int, nargs="+", default=[100, 300, 500], 
                      help="Test edilecek kelime sayıları (örn: 100 300 500)")
    parser.add_argument("--api", type=str, choices=["openai", "gemini", "both"], default="both",
                      help="Test edilecek API")
    
    args = parser.parse_args()
    
    logger.info(f"Kelime sayısı testi başlatılıyor: {args.counts} kelime, API: {args.api}")
    run_tests(args.counts, args.api)