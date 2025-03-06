# Masal Uygulaması - Geliştirici Kılavuzu

## Uygulama Özellikleri

### Ana Özellikler
- AI destekli çocuk masalı üretimi (OpenAI ve Gemini)
- Parametrik hikaye oluşturma (karakter, ortam, tema)
- DALL-E ve Gemini ile otomatik görsel oluşturma
- Sayfa düzeninde metin ve görsel görüntüleme
- Hikaye sesli okuma ve ses efektleri
- Hikayeyi Word belgesi olarak kaydetme

### Sayfalama Sistemi
- Her sayfada 50 kelime gösteriliyor
- Her sayfa için özel görsel oluşturuluyor
- Tüm sayfaların ses dosyaları önceden oluşturuluyor ve önbellekleniyor
- Kullanıcı arayüzünde ilerleme göstergeleri (metin, görsel, ses üretimi için)
- Tüm içerikler hazır olduğunda masal sayfası gösteriliyor
- Sayfa navigasyon butonları (ileri, geri)
- Sayfa değişikliklerinde ses dosyası otomatik olarak değişiyor

## Çalıştırma & Test Komutları
- Başlat: `python app.py` (http://localhost:8500)
- Özel port: `python app.py --port=XXXX`
- Yeniden başlat: `pkill -f "python app.py" && python app.py`
- Prompt testi: `python test_prompt_length.py --counts 200 500 --api both`
- API testleri: `python test_gemini.py` veya `python test_openai.py`
- Ses dosyaları: `python download_sounds.py`
- Log dosyaları: `logs/` klasöründe tarih-saat damgalı dosyalar oluşturulur (örn: `app_YYYY-MM-DD_HH-MM-SS.log`)
- Debug modu: Tarayıcıda `Alt+D`

## Kod Standartları
- **İsimlendirme**: snake_case (dosya/fonk/değişken), PascalCase (sınıflar)
- **Format**: 4 boşluk, max 120 karakter/satır
- **İmport Sırası**: 1)std lib 2)3rd party 3)local modules
- **Dokümantasyon**: Tüm fonksiyon/sınıflar için docstring
- **Loglama**:
  - Her oturum için benzersiz log dosyaları (tarih-saat damgalı)
  - Farklı log seviyeleri: `logger.error/debug/info`
  - Detaylı hata bilgileri ve stack trace kayıtları
- **Hatalar**: Spesifik except bloklarını kullan
- **Güvenlik**: API anahtarları sadece .env dosyasında
- **Frontend**: Modüler JS, responsive design, `window.log()`
- **AI İçerik**: Daima çocuk dostu ve yaşa uygun
- **API Limitleri**: 
  - OpenAI `max_tokens`: `max_tokens=min(4000, word_limit * 10)` kullanarak sınır aşımını önle
  - DALL-E: Dakikada 5 istek limiti (generate_image_with_dalle'de 12sn bekleme)
- **Gemini Modelleri**:
  - Öncelikli modeller: `models/gemini-2.0-flash-001`, `models/gemini-2.0-flash-lite-001`
  - Yedek model: `models/gemini-1.5-pro`
  - Model isimleri her zaman "models/" prefixi ile kullanılmalı
  - İleri düzey prompt detayları görsel oluşturma için

## AI Prompt Optimizasyonu
- **En İyi Prompt Stili**: 
  ```
  GÖREV: Tam olarak X kelimeden oluşan bir çocuk masalı yaz.

  ÖNEMLİ TALİMATLAR:
  1. Hikaye TAM OLARAK X kelime içermeli
  2. Hikaye şunları içermeli:
     - Ana karakter: {karakter_adı} adında bir {karakter_türü}
     - Ortam: {ortam}
     - Tema: {tema}
  3. Çocuk dostu ve eğitici olmalı (7-10 yaş)
  4. Basit Türkçe kullan
  5. Kelime sayımını üç kez kontrol et
  6. Başlık EKLEME
  7. Ne bir kelime fazla, ne bir kelime eksik olmalı
  ```
- **Yeniden Deneme Stratejisi**: Kelime sayısı çok az olduğunda daha katı uyarılarla tekrar dene
- **API Token Limitleri**: `max_tokens=min(4000, word_limit * 10)` kullanarak sınır aşımını önle

## Proje Yapısı
- `app.py`: Ana Flask sunucusu ve AI entegrasyonu
- `static/`: Frontend varlıkları (CSS, JS, ses/görüntüler)
- `templates/`: HTML şablonları
- `logs/`: Her oturumda oluşturulan tarih-saat damgalı log dosyaları
- `test_prompt_length.py`: Kelime sayısı prompt testleri
- `test_gemini.py`, `test_openai.py`: API test modülleri
- `download_sounds.py`: Ses dosyalarını indirme scripti

## Araştırma Bulguları
- **Kelime Doğruluğu**: 
  - OpenAI ve Gemini, istenen kelime sayısının genellikle %25-40 altında metin üretiyor
  - En iyi prompt (OpenAI): "GÖREV+ÖNEMLİ TALİMATLAR" formatı (%25 sapma)
  - En iyi prompt (Gemini): Sistem+kullanıcı kombinasyonu (%30 sapma)
  - Kesin sayıları vurgulamak için rakamsal ve yazıyla ifade etkili

- **Görsel Üretimi**:
  - DALL-E (OpenAI): Daha tutarlı, sanatsal görseller
  - Gemini: Daha hızlı ama daha az tutarlı
  - API sınırı: DALL-E için dakikada 5 istek limiti

- **Uygulama Yapısı**:
  - Sayfalama: 50 kelime/sayfa optimum
  - Görsel-metin paralelliği: 450px yükseklikte containerlar
  - Word belgesi oluşturma: Görsel-metin bütünlüğü
  - İlerleme Göstergeleri: Metin, görsel ve ses üretimi için detaylı durum bilgisi
  - Tam Hazırlık: İçeriklerin tamamen hazır olmasını bekleyerek kesintisiz kullanıcı deneyimi
  - Ses Önbelleği: Tüm sayfaların ses dosyaları başlangıçta üretilip tarayıcıda saklanır
  - Medya Senkronizasyonu: Sayfa değişikliklerinde görsel ve ses dosyaları otomatik olarak güncellenir