import requests
import os

# Ses dosyasını indirme URL'si
url = "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3"  # download_sounds.py'den alındı

# Kaydedilecek dosya yolu
save_path = "static/sounds/cat_meow.mp3"

# Hedef dizini kontrol et
os.makedirs(os.path.dirname(save_path), exist_ok=True)

# Dosyayı indir
print(f"Kedi sesi indiriliyor: {url}")
response = requests.get(url)

if response.status_code == 200:
    with open(save_path, 'wb') as f:
        f.write(response.content)
    print(f"Dosya başarıyla kaydedildi: {save_path}")
else:
    print(f"Hata: {response.status_code}")

print("İşlem tamamlandı.")