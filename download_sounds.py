import os
import requests

# Ses efektlerinin indirileceği klasör
SOUNDS_DIR = 'static/sounds'

# Klasörü oluştur (eğer yoksa)
os.makedirs(SOUNDS_DIR, exist_ok=True)

# İndirilecek ses efektleri listesi - daha güvenilir URL'ler
sound_effects = {
    'lion_roar.mp3': 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3',  # Aslan kükremesi
    'cat_meow.mp3': 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',  # Kedi miyavlaması
    'dog_bark.mp3': 'https://assets.mixkit.co/active_storage/sfx/122/122-preview.mp3',  # Köpek havlaması
    'bird_chirp.mp3': 'https://assets.mixkit.co/active_storage/sfx/2618/2618-preview.mp3',  # Kuş cıvıltısı
    'water_splash.mp3': 'https://assets.mixkit.co/active_storage/sfx/1992/1992-preview.mp3',  # Su sesi
    'rain.mp3': 'https://assets.mixkit.co/active_storage/sfx/149/149-preview.mp3',  # Yağmur sesi
    'thunder.mp3': 'https://assets.mixkit.co/active_storage/sfx/1236/1236-preview.mp3',  # Gök gürültüsü
    'wind.mp3': 'https://assets.mixkit.co/active_storage/sfx/157/157-preview.mp3',  # Rüzgar sesi
    'door_knock.mp3': 'https://assets.mixkit.co/active_storage/sfx/2685/2685-preview.mp3',  # Kapı sesi
    'laugh.mp3': 'https://assets.mixkit.co/active_storage/sfx/2099/2099-preview.mp3',  # Gülme sesi
    'cry.mp3': 'https://assets.mixkit.co/active_storage/sfx/2698/2698-preview.mp3'  # Ağlama sesi
}

def download_sound(url, filename):
    """Belirtilen URL'den ses dosyasını indir ve kaydet"""
    try:
        response = requests.get(url)
        response.raise_for_status()  # HTTP hatalarını kontrol et
        
        filepath = os.path.join(SOUNDS_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"İndirildi: {filename}")
        return True
    except Exception as e:
        print(f"Hata - {filename} indirilemedi: {e}")
        return False

def main():
    """Tüm ses efektlerini indir"""
    print("Ses efektleri indiriliyor...")
    
    success_count = 0
    for filename, url in sound_effects.items():
        if download_sound(url, filename):
            success_count += 1
    
    print(f"\nToplam {success_count}/{len(sound_effects)} ses efekti başarıyla indirildi.")
    print(f"Dosyalar '{SOUNDS_DIR}' klasörüne kaydedildi.")

if __name__ == "__main__":
    main()
