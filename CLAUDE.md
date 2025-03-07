# Masal Uygulaması - Geliştirici Kılavuzu

## Uygulama Özellikleri

### Ana Özellikler
- AI destekli çocuk masalı üretimi (OpenAI GPT-4o-mini/GPT-4-turbo ve Gemini)
- Parametrik hikaye oluşturma (karakter, ortam, tema)
- Kapsamlı karakter özellikleri (yaş, cinsiyet, saç rengi/tipi, ten rengi)
- DALL-E 3 ile otomatik görsel oluşturma
- Sayfa düzeninde metin ve görsel görüntüleme
- Hikaye sesli okuma ve gelişmiş ses kontrolleri
- Hikayeyi Word belgesi olarak kaydetme
- Son 5 hikayenin otomatik kaydedilmesi
- 5 favori masalın kaydedilmesi

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
- DALL-E 2 testi: `python test_dalle2.py --size 512x512 --language both`
- DALL-E 2 stil testi: `python test_dalle2_styles.py --size 512x512`
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
  - Ayrı log dosyaları: app (INFO ve üstü), debug (tüm loglar), prompt_test
  - Gelişmiş loglama ve hata izleme: `logger.error/debug/info/warning` 
  - Detaylı hata bilgileri ve stack trace kayıtları
  - Otomatik log rotasyonu: Dosya başına 10MB ve maksimum 3 yedek
  - AI işlemlerinin detaylı loglanması: Model yükleme, prompt gönderme, yanıt alma, retry
  - Kelime sayısı değerlendirmelerinin loglanması: Hedef, gerçekleşen, sapma oranı
  - Rate limit korumasının loglanması: Özellikle DALL-E için bekleme süreleri
- **Hatalar**: Spesifik except bloklarını kullan
- **Güvenlik**: API anahtarları sadece .env dosyasında
- **Frontend**: Modüler JS, responsive design, `window.log()`
- **Veri Saklama**:
  - LocalStorage API ile masal geçmişi ve favori masallar (tarayıcı tarafı)
  - `/static/tales/all/` klasöründe sunucu tarafında tüm masallar (offline kullanım için)
  - Hibrit önbellek stratejisi: Hem client-side hem server-side veri saklama
  - JSON meta verileri ile masalların tipinin belirlenmesi (geçmiş/favori)
- **AI İçerik**: Daima çocuk dostu ve yaşa uygun
- **API Limitleri**: 
  - OpenAI `max_tokens`: `max_tokens=min(4000, word_limit * 10)` kullanarak sınır aşımını önle
  - DALL-E: Dakikada 5 istek limiti (generate_image_with_dalle'de 12sn bekleme)
  - DALL-E görsel boyutları: 
    - DALL-E 3: Sadece 1024x1024 veya 1792x1024 çözünürlükleri destekliyor (512x512 desteklenmiyor)
    - DALL-E 2: 256x256, 512x512, 1024x1024 çözünürlükleri destekliyor
  - **GPT Modelleri**:
    - İlk deneme: `gpt-4o-mini-2024-07-18` (versiyon 18.07.2024)
    - Yeniden deneme: `gpt-4-turbo-2024-04-09` (versiyon 09.04.2024)
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

  ÇOK ÖNEMLİ:
  - Kelime sayısını metnin kendisinde belirtme
  - "Bu masal X kelimedir" veya "Unutmayın bu masal tam olarak X kelime içeriyor" gibi ifadeler kullanma
  - Sadece masal içeriğini yaz, başka açıklama ekleme
  ```
- **Yeniden Deneme Stratejisi**: 
  - Kelime sayısı çok az olduğunda (%20'den fazla sapma) daha katı uyarılarla tekrar dene
  - OpenAI ve Gemini için farklı retry stratejileri:
    - OpenAI: Daha ayrıntılı ve vurgulu prompt ile retry
    - Gemini: Açık talimatlarla yeniden deneme ve sonuçların karşılaştırmalı değerlendirmesi
  - Sonuçların detaylı loglanması: İlk ve ikinci deneme sonuçları, iyileşme oranı
- **API Token Limitleri**: `max_tokens=min(4000, word_limit * 10)` kullanarak sınır aşımını önle

## Proje Yapısı
- `app.py`: Ana Flask sunucusu ve AI entegrasyonu
- `static/`: Frontend varlıkları (CSS, JS, ses/görüntüler)
  - `static/tales/all/`: Tüm masallar tek klasörde depolanır
  - `static/tales/history/`: (Eski sistem) Geçmiş masallar için klasör
  - `static/tales/favorites/`: (Eski sistem) Favori masallar için klasör
  - `static/test_images/`: Test için oluşturulan görseller
- `templates/`: HTML şablonları
- `logs/`: Her oturumda oluşturulan tarih-saat damgalı log dosyaları
- `test_prompt_length.py`: Kelime sayısı prompt testleri
- `test_gemini.py`, `test_openai.py`: API test modülleri
- `test_dalle2.py`: DALL-E 2 görsel üretim testi
- `test_dalle2_styles.py`: DALL-E 2 stil prompt testi
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
  - Veri Saklama ve Önbellekleme:
    - **LocalStorage Anahtarları**:
      - Tema tercihleri: `theme` anahtarı ile saklanır
      - Masal geçmişi: `taleHistory` anahtarı ile son 5 masal saklanır
      - Favori masallar: `taleFavorites` anahtarı ile en fazla 5 favori masal saklanır
    - **Fiziksel Dosya Depolama**:
      - Sunucu: `/static/tales/all/` klasöründe tüm masallar (geçmiş ve favoriler) için JSON, görsel ve ses dosyaları
      - Dosya organizasyonu: Her masal için ID bazlı JSON, görsel ve sayfa dosyaları
      - Masalların tipi (geçmiş/favori) JSON içinde 'type' ve 'isFavorite' alanları ile belirlenir
    - **Offline Erişim**:
      - Masallar hem tarayıcıda hem sunucuda saklanır
      - Offline kullanım için önbellekleme mekanizması
      - Hibrit yükleme: Önce lokalden hızlı yükleme, sonra sunucudan veri senkronizasyonu