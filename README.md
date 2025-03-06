# Masal - Yapay Zeka Destekli Çocuk Masalları Platformu

## Genel Bakış

Masal, çocuklar için yapay zeka destekli bir hikaye oluşturma platformudur. Uygulama, kullanıcı tarafından belirlenen karakterler, ortamlar ve temalar doğrultusunda özgün ve eğitici masallar üretir, bu masalları görsellerle zenginleştirir ve sesli olarak çocuklara anlatır.

## Özellikler

### Ana İşlevler
- **Yapay Zeka ile Masal Üretimi**: OpenAI (GPT-4o-mini, GPT-4-turbo) veya Google Gemini tarafından desteklenen çocuk dostu metinler 
- **Özgün Görseller**: DALL-E 3 tarafından üretilen, masala özel illüstrasyonlar
- **Sesli Anlatım**: Google Text-to-Speech ile Türkçe sesli anlatım
- **Ses Kontrolü**: Durdurma, devam ettirme, hız kontrolü ve ilerleme çubuğu
- **Kolay Kayıt**: Masalları Word dosyası olarak kaydetme imkanı

### Kullanıcı Deneyimi
- **Çocuk Dostu Arayüz**: Kolay kullanılabilir, renkli ve sezgisel tasarım
- **Sayfalama Sistemi**: Masalları sayfalara bölme ve kolay navigasyon
- **Sayfa Başına Görsel**: Her sayfa için ayrı, içeriğe özel görseller
- **Tema Özelleştirme**: Aydınlık/Karanlık mod seçeneği
- **Kelime Sayısı Kontrolü**: Kısa, orta veya uzun masal seçeneği
- **Debug Modu**: Geliştirici odaklı test ve hata ayıklama özellikleri

## Teknik Yapı

### Backend
- **Framework**: Flask 2.3.3 (Python)
- **AI Entegrasyonu**:
  - Google Gemini (metin ve görsel üretimi)
  - OpenAI GPT ve DALL-E (metin ve görsel üretimi)
- **Ses İşleme**: gTTS (Google Text-to-Speech)
- **Dokümantasyon**: python-docx

### Frontend
- **Teknolojiler**: HTML5, CSS3, JavaScript
- **UI Bileşenleri**: Font Awesome, Google Fonts
- **Veri Saklama**: Browser localStorage (tema tercihleri ve masal geçmişi)

## Kurulum

1. Depoyu klonlayın:
```bash
git clone https://github.com/yourusername/masal.git
cd masal
```

2. Gerekli Python paketlerini yükleyin:
```bash
pip install -r requirements.txt
```

3. Proje kök dizininde bir `.env` dosyası oluşturun ve API anahtarlarınızı ekleyin:
```
GOOGLE_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```
## Kullanım

1. Uygulamayı başlatın:
```bash
python app.py
```

2. Tarayıcınızı açın ve `http://localhost:8500` adresine gidin

3. Masal tercihlerinizi girin:
   - Karakter Adı (örn. Mila, Ayşe, Ali)
   - Karakter Türü (örn. prenses, kahraman, gezgin)
   - Masal Ortamı (örn. orman, uzay, deniz)
   - Masal Teması (örn. dostluk, macera, keşif)
   - Kelime Sayısı (200 veya 500 kelime)
   - Kullanılacak API'ler (Gemini veya OpenAI, hem metin hem görsel için)

4. "Masal Oluştur" düğmesine tıklayın ve yapay zekanın masalınızı oluşturmasını bekleyin

5. Masalı keşfedin:
   - Sayfa geçiş düğmeleriyle hikayede ilerleyin
   - Her sayfadaki özel görselleri inceleyin
   - Sesli anlatımı dinleyin ve ses kontrollerini kullanın
   - Masalı Word olarak kaydedin
   - Yeni masal oluşturmak için ayarlar sayfasına dönün

## Geliştirme Kılavuzu

### Proje Yapısı
```
masal/
├── app.py                  # Ana Flask uygulaması 
├── requirements.txt        # Python bağımlılıkları
├── CLAUDE.md               # Geliştirici kılavuzu ve notlar
├── test_gemini.py          # Gemini API test dosyası
├── test_openai.py          # OpenAI API test dosyası
├── test_prompt_length.py   # Prompt formülü test aracı
├── logs/                   # Log dosyaları klasörü (otomatik oluşturulur)
│   ├── app_*.log           # Uygulama logları (INFO ve üstü)
│   ├── debug_*.log         # Detaylı debug logları
│   └── prompt_test_*.log   # Prompt testi logları
├── static/
│   ├── css/
│   │   └── style.css       # Uygulama stil dosyası
│   ├── js/
│   │   └── main.js         # Frontend fonksiyonları
│   └── img/                # Statik görseller ve üretilen resimler
└── templates/
    └── index.html          # Ana uygulama şablonu
```

### Sayfalama ve Sesli Anlatım Sistemi

Uygulama, masalları sayfalar halinde gösterir ve her sayfa için özel görsel ve sesli anlatım içeriği sunar:

- **Sayfa Başına İçerik**: Her sayfa yaklaşık 50 kelime içerir
- **Sayfa Başına Özel Görsel**: Her sayfa için ayrı AI görsel üretilir
- **Sayfa Başına Özel Sesli Anlatım**: Her sayfa için ayrı gTTS ses dosyası oluşturulur
- **Tamamlanma İlerleme Göstergesi**: Masal metni, görseller ve ses dosyaları oluşturulurken ayrıntılı durum göstergeleri
- **Tam İçerik Hazırlığı**: Tüm içerikler (metin, görseller ve sesler) hazır olduğunda masal görüntülenir
- **Sayfa Gezinme**: İleri/geri butonlarıyla sayfalar arası geçiş yapılabilir
- **Gelişmiş Ses Kontrolleri**: Oynat/duraklat, durdur, yeniden başlat ve ilerleme çubuğu
- **Ses Önbelleği**: Tüm ses dosyaları önceden oluşturulup saklanır, sayfa geçişlerinde anında çalınabilir

### Test

API bağlantılarını test etmek için:
```bash
python test_openai.py  # OpenAI bağlantısını test et
python test_gemini.py  # Gemini bağlantısını test et
```

Prompt formüllerini test etmek için:
```bash
python test_prompt_length.py --counts 200 500 --api both  # Her iki API için belirli kelime sayılarını test et
```

### Debug Modu

Tarayıcıda hata ayıklama konsolunu açmak için:
- `Alt+D` tuş kombinasyonunu kullanın
- Konsolda yapılan işlemleri ve hataları görebilirsiniz

## Performans Hususları

- **API Kullanımı**: API sınırlamalarına ve maliyetlerine dikkat edin
  - DALL-E 3: Dakikada 5 görsel istek limiti (uygulama otomatik olarak hız sınırlaması yapar)
  - OpenAI modelleri: GPT-4o-mini-2024-07-18 (ilk deneme), GPT-4-turbo-2024-04-09 (yeniden deneme)
  - Token limiti: max_tokens = min(4000, word_limit * 10)
- **Görsel Oluşturma**: Sayfa görsellerinin oluşturulması için 5-15 saniye bekleyin
- **Ses Oluşturma**: Her sayfa için ilk ziyarette ses dosyası oluşturulur (2-5 saniye)
- **Kelime Sayısı**: AI modelleri tam kelime sayısını üretmekte zorlanabilir (%25-40 sapma olabilir)
- **Tarayıcı Depolama**: Masal geçmişi maksimum 10 giriş ile sınırlıdır
- **Ses Önbelleği**: Sayfa başına oluşturulan sesler tarayıcı oturumu boyunca saklanır
- **Gelişmiş Loglama Sistemi**: Tüm oturum logları `logs/` klasöründe tarih-saat damgalı dosyalarda saklanır
  - Uygulama logları: `app_YYYY-MM-DD_HH-MM-SS.log` (INFO ve üstü seviye mesajlar)
  - Debug logları: `debug_YYYY-MM-DD_HH-MM-SS.log` (DEBUG ve üstü tüm detaylı mesajlar)
  - Prompt test logları: `prompt_YYYY-MM-DD_HH-MM-SS.log` (Prompt testleri için özel loglar)
  - Otomatik log rotasyonu: 10MB boyut sınırı ve maksimum 3 yedek dosya
  - Detaylı AI modeli yanıtları: Retry mekanizması, kelime sayısı kontrolü, model karşılaştırmaları

## Gelecek Geliştirmeler

- Daha doğru kelime sayısı üretimi için prompt optimizasyonu
- Çoklu dil desteği
- Kelime sayacı algoritması iyileştirmeleri
- Ek illüstrasyon stilleri ve görsel stillendirme
- Kullanıcı hesapları ve bulut tabanlı masal depolama
- Masallar içinde daha fazla etkileşimli unsur
- Mobil uygulama versiyonu

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için LICENSE dosyasına bakın.

---

Genç hikaye anlatıcıları için ❤️ ile geliştirilmiştir.
