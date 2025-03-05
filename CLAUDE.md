# Masal Uygulaması - Geliştirici Kılavuzu

## Komutlar
- Uygulamayı çalıştırma: `python app.py` (Adres: http://localhost:8500)
- Port değiştirme: `python app.py --port=XXXX`
- API testleri: `python test_gemini.py` veya `python test_openai.py`
- Bağımlılıkları yükleme: `pip install -r requirements.txt`
- Ses dosyalarını indirme: `python download_sounds.py`
- Uygulamayı durdurma: Terminalde `Ctrl+C`
- Debug log'u: `app.log` ve `app_debug.log` dosyalarına bakın
- Tarayıcı debug modu: `Alt+D` tuş kombinasyonu (tarayıcı arayüzünde)

## Geliştirme Standartları
- **İsimlendirme**: snake_case (dosya/fonksiyon/değişken), PascalCase (sınıflar)
- **Yazım**: 4 boşluk girinti, max 120 karakter satır uzunluğu
- **İçe aktarma düzeni**: 
  1. Standart kütüphane (os, sys, json)
  2. Üçüncü parti paketler (Flask, requests, openai)
  3. Yerel modüller
- **Dokümantasyon**: Tüm fonksiyon/sınıflar için docstring kullanın: """Fonksiyon açıklaması"""
- **Hata yönetimi**: try/except içinde spesifik exception'lar yakalayın, `logger.error/debug/info` kullanın
- **API anahtarları**: Sadece .env dosyasında saklanmalı, kod içine gömülmemeli
- **Frontend**: JS dosyalarını modüler tutun, debug için `window.log()` kullanın
- **Test**: Yeni işlevler eklerken test_*.py dosyalarıyla test edin

## Proje Yapısı
- `app.py`: Ana uygulama dosyası (Flask server)
- `static/`: CSS, JS ve medya dosyaları
- `templates/`: HTML şablonları
- `test_*.py`: API test dosyaları

Masal, çocuklar için yapay zeka destekli bir masal oluşturma platformudur. Tüm içerik çocuk dostu ve eğitici olmalıdır.