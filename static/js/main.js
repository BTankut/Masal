document.addEventListener('DOMContentLoaded', function() {
    // Sayfa elemanları
    const settingsPage = document.getElementById('settings-page');
    const talePage = document.getElementById('tale-page');
    const generateForm = document.getElementById('generate-form');
    const taleContainer = document.getElementById('tale-container');
    const taleTextElement = document.getElementById('tale-text');
    const taleImageElement = document.getElementById('tale-image');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const saveButton = document.getElementById('save-tale');
    const favoriteButton = document.getElementById('favorite-button');
    const newTaleButton = document.getElementById('new-tale');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const backToSettingsButton = document.getElementById('back-to-settings');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleTale = document.getElementById('theme-toggle-tale');
    const taleHistoryContainer = document.getElementById('tale-history-container');
    const taleFavoritesContainer = document.getElementById('tale-favorites-container');
    const returnToTaleBtn = document.getElementById('return-to-tale');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    
    let currentPage = 0;
    window.taleData = null;
    let talePages = [];
    let taleImages = [];
    let taleAudios = {}; // Sayfa ses dosyalarını saklamak için obje
    let totalPages = 0;
    let taleHistory = [];
    let taleFavorites = []; // Favori masallar dizisi
    const MAX_HISTORY = 5;
    const MAX_FAVORITES = 5;
    const WORDS_PER_PAGE = 50;
    
    // Debug fonksiyonları
    window.debugMode = false;
    
    window.log = function(message, data = null) {
        console.log(message, data);
        if (window.debugMode) {
            const logElement = document.getElementById('debug-logs');
            if (logElement) {
                const timestamp = new Date().toTimeString().split(' ')[0];
                let logText = `<div class="log-item"><span class="log-time">[${timestamp}]</span> ${message}</div>`;
                if (data) {
                    try {
                        logText += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                    } catch (e) {
                        logText += `<pre>[Veri gösterilemiyor: ${e.message}]</pre>`;
                    }
                }
                logElement.innerHTML += logText;
                logElement.scrollTop = logElement.scrollHeight;
            }
        }
    };
    
    window.showDebug = function() {
        const debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
            debugConsole.style.display = 'block';
        }
    };
    
    window.toggleDebug = function() {
        window.debugMode = !window.debugMode;
        log(window.debugMode ? 'Debug modu aktif' : 'Debug modu devre dışı');
        showDebug();
    };
    
    // Hata yakalamak için global hata dinleyicisi
    window.addEventListener('error', function(event) {
        log(`HATA: ${event.message} (${event.filename}:${event.lineno})`);
        showDebug();
    });
    
    // Debug modu için kısayol ekle (Alt+D)
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'd') {
            toggleDebug();
        }
    });
    
    // Sayfa yüklendiğinde geçmiş masalları ve favorileri yükle
    loadTaleHistory();
    loadTaleFavorites();
    
    // Tema yönetimi
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        
        // Tema butonlarını güncelle
        updateThemeButtons(newTheme);
        
        // Tema tercihini kaydet
        localStorage.setItem('theme', newTheme);
    }
    
    function updateThemeButtons(theme) {
        // Ana sayfa tema butonu
        const themeIcon = themeToggleBtn.querySelector('i');
        const themeText = themeToggleBtn.querySelector('span');
        
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Aydınlık Mod';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Karanlık Mod';
        }
        
        // Masal sayfası tema butonu
        const taleThemeIcon = themeToggleTale.querySelector('i');
        if (theme === 'dark') {
            taleThemeIcon.className = 'fas fa-sun';
        } else {
            taleThemeIcon.className = 'fas fa-moon';
        }
    }
    
    // Kayıtlı tema tercihini kontrol et
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeButtons(savedTheme);
        }
    }
    
    // Tema butonlarına tıklama olayları
    themeToggleBtn.addEventListener('click', toggleTheme);
    themeToggleTale.addEventListener('click', toggleTheme);
    
    // Sayfa geçişleri
    function showSettingsPage() {
        log('Ayarlar sayfasına geçiliyor...');
        settingsPage.classList.add('active');
        talePage.classList.remove('active');
        
        // Eğer aktif bir masal varsa, masala dön butonunu göster
        if (taleData) {
            const returnToTaleBtn = document.getElementById('return-to-tale');
            if (returnToTaleBtn) {
                returnToTaleBtn.style.display = 'inline-flex';
            }
        } else {
            const returnToTaleBtn = document.getElementById('return-to-tale');
            if (returnToTaleBtn) {
                returnToTaleBtn.style.display = 'none';
            }
        }
    }
    
    function showTalePage() {
        log('Masal sayfasına geçiliyor...');
        settingsPage.classList.remove('active');
        talePage.classList.add('active');
        
        // İçeriklerin doğru gösterilmesini sağla
        setTimeout(() => {
            // İlk sayfayı görüntüle
            displayPage(0);
            
            // Mevcut masal favori mi kontrol et ve favori butonunu güncelle
            if (taleData) {
                const currentTale = taleHistory.find(tale => tale.data && tale.data.tale_title === taleData.tale_title);
                if (currentTale) {
                    const isFavorite = taleFavorites.some(fav => fav.id === currentTale.id);
                    favoriteTaleButton.innerHTML = isFavorite ? 
                        '<i class="fas fa-heart"></i> Favorilerden Çıkar' : 
                        '<i class="fas fa-heart"></i> Favorilere Ekle';
                    
                    // Favori butonunun sınıfını güncelle
                    if (isFavorite) {
                        favoriteTaleButton.classList.add('active');
                    } else {
                        favoriteTaleButton.classList.remove('active');
                    }
                }
            }
            
            // Debug için konsola yazdır
            log('settingsPage sınıfları:', settingsPage.className);
            log('talePage sınıfları:', talePage.className);
        }, 50);
    }
    
    // Ayarlar sayfasına dönme butonu
    backToSettingsButton.addEventListener('click', showSettingsPage);
    
    // Masala dönme butonu
    returnToTaleBtn.addEventListener('click', function() {
        showTalePage();
    });
    
    // Ses efekti özellikleri kaldırıldı
    
    // İlerleme durumlarını takip etmek için değişkenler
    let textGenerationComplete = false;
    let imageGenerationComplete = false;
    let audioGenerationComplete = false;
    
    // İlerleme durumlarını güncelleme fonksiyonu
    function updateProgressStatus(type, status) {
        const statusElement = document.getElementById(`${type}-status`);
        
        // Mevcut sınıfları temizle
        statusElement.classList.remove('status-pending', 'status-loading', 'status-complete', 'status-error');
        
        let icon, text;
        
        switch(status) {
            case 'pending':
                statusElement.classList.add('status-pending');
                icon = 'fa-circle';
                text = 'Bekliyor';
                break;
            case 'loading':
                statusElement.classList.add('status-loading');
                icon = 'fa-spinner fa-spin';
                text = 'Oluşturuluyor...';
                break;
            case 'complete':
                statusElement.classList.add('status-complete');
                icon = 'fa-check-circle';
                text = 'Tamamlandı';
                break;
            case 'error':
                statusElement.classList.add('status-error');
                icon = 'fa-times-circle';
                text = 'Hata';
                break;
        }
        
        statusElement.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        
        // Tüm işlemler tamamlandıysa masal sayfasına geç
        checkAllComplete();
    }
    
    // Tüm işlemlerin tamamlanıp tamamlanmadığını kontrol et
    function checkAllComplete() {
        if (textGenerationComplete && imageGenerationComplete && audioGenerationComplete) {
            setTimeout(() => {
                // Sayfanın ilk kez doğru şekilde görüntülenmesi için
                // Önce içeriklerin doğru şekilde yüklendiğinden emin olalım
                displayPage(0);
                
                // Önce sayfayı gösterelim
                showTalePage();
                
                // Kısa bir gecikme sonra yükleme ekranını gizleyelim
                setTimeout(() => {
                    showLoading(false);
                    
                    // Ekstra güvenlik için birkaç milisaniye sonra tekrar displayPage çağıralım
                    setTimeout(() => {
                        displayPage(0);
                        // Sayfa için ses dosyasını hazırla ama otomatik oynatma yapma
                        prepareAudioForCurrentPage();
                    }, 100);
                }, 500);
            }, 500); // Kullanıcının tamamlandığını görmesi için kısa bir bekleme
        }
    }
    
    // Tüm sayfaların ses dosyalarını önceden oluştur
    function preloadAllAudio(pages) {
        log('Tüm sayfalar için ses dosyaları önceden yükleniyor...');
        updateProgressStatus('audio', 'loading');
        
        // Her sayfa için ses oluşturma promise'lerini bir diziye topla
        const audioPromises = pages.map((pageText, pageIndex) => {
            return new Promise((resolve) => {
                log(`Sayfa ${pageIndex + 1} için ses dosyası yükleniyor...`);
                
                fetch('/generate_audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: pageText, page: pageIndex })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Ses oluşturma hatası: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    log(`Sayfa ${pageIndex + 1} için ses dosyası başarıyla oluşturuldu (${blob.size} bytes)`);
                    taleAudios[pageIndex] = { blob: blob };
                    resolve(true);
                })
                .catch(error => {
                    log(`Sayfa ${pageIndex + 1} ses oluşturma hatası: ${error.message}`);
                    resolve(false); // Hataya rağmen devam et
                });
            });
        });
        
        // Tüm ses dosyaları oluşturulduğunda
        return Promise.all(audioPromises)
            .then(results => {
                const successCount = results.filter(success => success).length;
                log(`Ses dosyaları yükleme tamamlandı: ${successCount}/${pages.length} başarılı`);
                
                if (successCount === 0 && pages.length > 0) {
                    // Hiçbir ses dosyası oluşturulamadıysa hata durumu göster
                    updateProgressStatus('audio', 'error');
                } else {
                    updateProgressStatus('audio', 'complete');
                }
                
                audioGenerationComplete = true;
                return successCount;
            });
    }
    
    // Form gönderildiğinde AJAX ile işlem yapma
    generateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Önce hata mesajlarını temizle
        hideError();
        
        // Form verilerini al
        const characterName = document.getElementById('character-name').value.trim();
        const characterType = document.getElementById('character-type').value.trim();
        const setting = document.getElementById('setting').value.trim();
        const theme = document.getElementById('theme').value.trim();
        const wordLimit = document.getElementById('word-limit').value.trim();
        const imageApi = document.getElementById('image-api').value.trim();
        const textApi = document.getElementById('text-api').value.trim();
        
        // Form doğrulama
        if (!characterName || !characterType || !setting || !theme) {
            showError('Lütfen tüm alanları doldurun.');
            log('Form doğrulama hatası: Boş alanlar var');
            return;
        }
        
        // Masal oluşturma sırasında favori butonunu düzenle
        const favBtn = document.getElementById('favorite-button');
        if (favBtn) {
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
        }
        
        try {
            // İlerleme durumlarını sıfırla
            textGenerationComplete = false;
            imageGenerationComplete = false;
            audioGenerationComplete = false;
            
            // Tüm durum göstergelerini bekliyor durumuna getir
            updateProgressStatus('text', 'pending');
            updateProgressStatus('image', 'pending');
            updateProgressStatus('audio', 'pending');
            
            // Yükleme göstergesini göster
            showLoading(true, 'Masal oluşturuluyor, lütfen bekleyin...');
            
            // API isteği için veri hazırla
            const formData = new FormData();
            formData.append('character_name', characterName);
            formData.append('character_type', characterType);
            formData.append('setting', setting);
            formData.append('theme', theme);
            formData.append('word_limit', wordLimit);
            formData.append('image_api', imageApi);
            formData.append('text_api', textApi);
            
            log('API isteği gönderiliyor...', {
                character_name: characterName,
                character_type: characterType,
                setting: setting,
                theme: theme,
                word_limit: wordLimit,
                image_api: imageApi,
                text_api: textApi
            });
            
            // Metin oluşturma durumunu güncelle
            updateProgressStatus('text', 'loading');
            
            // API isteği gönder
            showDebug(); // Debug konsolunu göster
            log('Fetch isteği gönderiliyor: /generate_tale');
            const response = await fetch('/generate_tale', {
                method: 'POST',
                body: formData
            });
            
            // Yanıt kontrolü
            if (!response.ok) {
                const errorText = await response.text();
                log('API yanıtı hatalı', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText
                });
                throw new Error(`API yanıtı başarısız (${response.status}): ${errorText}`);
            }
            
            // Yanıtı JSON olarak işle
            const data = await response.json();
            log('API yanıtı alındı', data);
            
            // Veri kontrolü
            if (!data || !data.tale_text || !data.tale_title || !data.image_url) {
                log('API yanıtında eksik veriler', data);
                throw new Error('API yanıtında eksik veriler var.');
            }
            
            // Metin oluşturma tamamlandı
            updateProgressStatus('text', 'complete');
            textGenerationComplete = true;
            
            // Masal verilerini kaydet
            window.taleData = data;
            
            // Gerçek kelime sayısını kontrol et
            const wordCount = data.tale_text.split(/\s+/).length;
            log('Masal verileri kaydedildi', {...taleData, wordCount});
            console.log(`Gerçek kelime sayısı: ${wordCount}, beklenen: ${wordLimit}`);
            
            // Gerçek sayfa sayısını hesapla ve konsola yazdır
            const expectedPages = Math.ceil(wordCount / WORDS_PER_PAGE);
            console.log(`Kelime başına ${WORDS_PER_PAGE} kelime ile beklenen sayfa sayısı: ${expectedPages}`);
            
            // Masal başlığını güncelle
            document.getElementById('tale-title').textContent = data.tale_title;
            
            // Masalı sayfalara böl
            preparePagedContent(data.tale_text, data.tale_title);
            
            // İlk sayfanın görüntüsü zaten var
            updateProgressStatus('image', 'loading');
            
            // Tüm sayfaların ses dosyalarını önceden oluşturalım
            if (talePages.length > 0) {
                preloadAllAudio(talePages);
            }
            
            // Her sayfa için kendi resmi olacak şekilde düzenleme yapalım
            const imagePromises = [];
            
            if (talePages.length > 0) {
                console.log(`${talePages.length} sayfa için görseller oluşturuluyor...`);
                
                // İlk sayfa resmi zaten var, onu kaydedelim
                taleImages[0] = {
                    page: 0,
                    url: data.image_url,
                    alt: `${data.tale_title} - Sayfa 1`,
                    loaded: true
                };
                
                // Diğer sayfalar için resimler oluşturalım (1. indeksten başlayarak)
                if (talePages.length > 1) {
                    for (let i = 1; i < talePages.length; i++) {
                        // Her sayfa için resim oluşturma promise'ini ekle
                        imagePromises.push(
                            new Promise((resolve) => {
                                setTimeout(() => {
                                    console.log(`Sayfa ${i+1} resmi için API çağrısı yapılıyor...`);
                                    // generateImageForPage fonksiyonunu modifiye edelim
                                    generateImageForPage(i, talePages[i], data.tale_title, {
                                        character_name: characterName,
                                        character_type: characterType, 
                                        setting: setting,
                                        image_api: imageApi
                                    })
                                    .then(() => resolve())
                                    .catch(() => resolve()); // Hata olsa da devam et
                                }, i * 2000); // Her bir sayfa için 2 saniye gecikme 
                            })
                        );
                    }
                } else {
                    // Tek sayfa var, görsel oluşturma tamamlandı
                    updateProgressStatus('image', 'complete');
                    imageGenerationComplete = true;
                }
                
                // Tüm görsel oluşturma işlemleri tamamlandığında
                Promise.all(imagePromises)
                .then(() => {
                    log('Tüm görseller oluşturuldu');
                    updateProgressStatus('image', 'complete');
                    imageGenerationComplete = true;
                    
                    // Masalı geçmişe ekle - ekledikten sonra UI'ı güncellesin diye true parametresi eklendi
                    addTaleToHistory(data, true);
                    
                    // Favori butonunu ayarla
                    const favBtn = document.getElementById('favorite-button');
                    if (favBtn) {
                        try {
                            // Bu masal favorilerde mi kontrol et
                            const favs = localStorage.getItem('favorites');
                            if (favs) {
                                const favorites = JSON.parse(favs);
                                const isFavorite = favorites.some(fav => fav.title === data.tale_title);
                                
                                favBtn.innerHTML = isFavorite ? 
                                    '<i class="fas fa-heart"></i> Favorilerden Çıkar' : 
                                    '<i class="fas fa-heart"></i> Favorilere Ekle';
                            } else {
                                favBtn.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
                            }
                        } catch (e) {
                            console.error("Favori kontrol hatası:", e);
                            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
                        }
                    }
                    
                    // Yüklü olduğunu işaretle
                    displayPage(0);
                    
                    // Tüm işlemler tamam mı diye kontrol et
                    checkAllComplete();
                })
                .catch(error => {
                    log('Görsel oluşturma hatası', error);
                    // Hata durumunda bile ilerle
                    updateProgressStatus('image', 'error');
                    imageGenerationComplete = true;
                    checkAllComplete();
                });
            }
        } catch (error) {
            log('Masal oluşturma hatası', { error: error.message, stack: error.stack });
            
            // Hata durumunda tüm durumları hata olarak işaretle
            updateProgressStatus('text', 'error');
            updateProgressStatus('image', 'error');
            updateProgressStatus('audio', 'error');
            
            showLoading(false);
            showError(`Masal oluşturulurken bir hata oluştu: ${error.message}`);
            showDebug(); // Hata durumunda debug konsolunu göster
            
            // İlerlemeli değişkenleri güncelle
            textGenerationComplete = true;
            imageGenerationComplete = true;
            audioGenerationComplete = true;
        }
    });
    
    // Masalı geçmişe ekle
    function addTaleToHistory(tale, updateUI = false) {
        console.log("addTaleToHistory çağrıldı:", tale.tale_title);
        
        // Geçmiş verilerini al
        let historyTales = [];
        try {
            const savedHistory = localStorage.getItem('taleHistory');
            if (savedHistory) {
                historyTales = JSON.parse(savedHistory);
                console.log("Mevcut geçmiş masalları yüklendi:", historyTales.length);
            }
        } catch (e) {
            console.error("Geçmiş yüklenirken hata:", e);
            historyTales = [];
        }
        
        // Benzersiz bir ID oluştur
        const taleId = Date.now().toString();
        
        // Yeni masalı ekle (en başa)
        const newTale = {
            id: taleId,
            title: tale.tale_title,
            text: tale.tale_text,
            image: tale.image_url,
            characterName: document.getElementById('character-name').value || '',
            characterType: document.getElementById('character-type').value || '',
            setting: document.getElementById('setting').value || '',
            theme: document.getElementById('theme').value || '',
            data: tale,
            date: new Date().toISOString(),
            type: 'history',
            isFavorite: false // Yeni oluşturulan hikayeler favorilere başlangıçta eklenmiş değil
        };
        
        console.log("Yeni masal geçmişe ekleniyor:", newTale.title);
        
        // Eğer aynı başlıklı bir masal varsa önce onu kaldır
        historyTales = historyTales.filter(item => item.title !== newTale.title);
        
        // Yeni masalı en başa ekle
        historyTales.unshift(newTale);
        
        // Maksimum MAX_HISTORY (5) masal sakla
        if (historyTales.length > MAX_HISTORY) {
            historyTales = historyTales.slice(0, MAX_HISTORY);
        }
        
        // Geçmişi kaydet
        try {
            localStorage.setItem('taleHistory', JSON.stringify(historyTales));
            console.log("Geçmiş localStorage'a kaydedildi");
        } catch (e) {
            console.error("Geçmiş kaydetme hatası:", e);
        }
        
        // Global değişkeni güncelle
        taleHistory = historyTales;
        
        // UI'ı hemen güncelle - eğer isteniyorsa
        if (updateUI) {
            // Geçmiş listesini direk güncelle, sunucu istekleri beklemeden
            const historyContainer = document.getElementById('tale-history-list');
            if (historyContainer) {
                if (historyTales.length === 0) {
                    historyContainer.innerHTML = '<p class="empty-history">Henüz masal geçmişi yok.</p>';
                } else {
                    let html = '';
                    historyTales.forEach((tale, index) => {
                        // Favorilerde mi kontrol et
                        let isFavorite = false;
                        if (window.taleFavorites && window.taleFavorites.length > 0) {
                            isFavorite = window.taleFavorites.some(fav => 
                                (fav.id && tale.id && fav.id === tale.id) || 
                                (fav.title && tale.title && fav.title === tale.title)
                            );
                        }
                        
                        const favoriteButtonClass = isFavorite ? 'btn-primary' : 'btn-secondary';
                        const tarih = new Date(tale.date).toLocaleDateString('tr-TR');
                        
                        html += `
                        <div class="history-item" data-id="${tale.id || ''}" data-index="${index}">
                            <div class="history-item-info">
                                <h4>${tale.title || 'Masal ' + (index + 1)}</h4>
                                <p>${tale.characterName || ''} ${tale.characterType || ''}</p>
                                <p class="history-date">${tarih}</p>
                            </div>
                            <div class="history-buttons">
                                <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                                    <i class="fas fa-book-open"></i>
                                </button>
                                <button class="btn ${favoriteButtonClass} history-favorite-btn" title="${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                        </div>`;
                    });
                    
                    historyContainer.innerHTML = html;
                    
                    // Geçmiş masalların butonlarına event listener ekle
                    addHistoryButtonListeners();
                }
            }
            
            // Sunucudan da çağırmak için updateTaleHistoryUI fonksiyonunu gecikmeyle çağır
            setTimeout(() => updateTaleHistoryUI(), 500);
        }
        
        // Sunucuya da kaydet
        saveTaleToServer(newTale, 'history');
        
        console.log(`Masal geçmişe eklendi: ${newTale.title}`);
        return newTale;
    }
    
    // Masalı sunucuya kaydet
    function saveTaleToServer(tale, type = 'history') {
        // Metin, görsel, ses dosyalarını kaydetmek için taleData ve talePages kullan
        const saveData = {
            id: tale.id,
            title: tale.title || tale.data?.tale_title,
            text: tale.text || tale.data?.tale_text,
            image: tale.image || tale.data?.image_url,
            date: tale.date,
            characterName: tale.characterName || '',
            characterType: tale.characterType || '',
            setting: tale.setting || '',
            theme: tale.theme || '',
            type: type,
            pages: []
        };
        
        // Sayfa verilerini ekle
        if (talePages && talePages.length > 0) {
            saveData.pages = talePages.map((text, index) => {
                return {
                    text: text,
                    image: taleImages[index] ? taleImages[index].url : null
                };
            });
        }
        
        // Ses verilerini ekle
        if (taleAudios && Object.keys(taleAudios).length > 0) {
            saveData.audios = {};
            for (const [pageIdx, audioData] of Object.entries(taleAudios)) {
                if (audioData.blob) {
                    // Blob verisini base64'e çevir
                    const reader = new FileReader();
                    reader.readAsDataURL(audioData.blob);
                    reader.onloadend = function() {
                        const base64data = reader.result.split(',')[1];
                        saveData.audios[pageIdx] = { blob: base64data };
                    };
                }
            }
        }
        
        // Sunucuya gönder
        fetch('/save_tale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`Masal sunucuya kaydedildi (${type}):`, data);
            } else {
                console.error('Sunucu hatası:', data.error);
            }
        })
        .catch(error => {
            console.error('Sunucuya kaydetme hatası:', error);
        });
    }
    
    // Masal içeriğini sayfalara bölme
    function preparePagedContent(taleText, title) {
        // Metni kelime sayısına göre böl
        const words = taleText.split(/\s+/);
        totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
        
        // Sayfaları temizle
        talePages = [];
        taleImages = [];
        
        log(`Toplam ${words.length} kelime, ${totalPages} sayfa oluşturulacak`);
        
        // Her sayfa için metin oluştur
        for (let i = 0; i < totalPages; i++) {
            const startIdx = i * WORDS_PER_PAGE;
            const endIdx = Math.min(startIdx + WORDS_PER_PAGE, words.length);
            const pageText = words.slice(startIdx, endIdx).join(' ');
            
            // Sayfayı kaydet
            talePages.push(pageText);
            
            // Başlangıçta yüklenmemiş görsel kalıpları oluştur
            taleImages.push({
                page: i,
                url: 'static/img/default-tale.jpg',  // Varsayılan resim
                alt: `${title} - Sayfa ${i+1}`,
                loaded: false
            });
        }
        
        // Sayfa göstergeleri ve butonlarını ayarla
        updatePageNavigation();
    }
    
    // Sayfa için görsel oluşturma (Promise döndüren versiyonu)
    function generateImageForPage(pageIndex, pageText, title, characterInfo) {
        console.log(`Sayfa ${pageIndex + 1} için görsel oluşturuluyor...`);
        
        // API isteği için veri hazırla
        const requestData = {
            page_text: pageText,
            character_name: characterInfo.character_name,
            character_type: characterInfo.character_type,
            setting: characterInfo.setting,
            page_number: pageIndex + 1,
            image_api: characterInfo.image_api || 'dalle'
        };
        
        // Promise döndür
        return new Promise((resolve, reject) => {
            // API isteği gönder
            fetch('/generate_page_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Görsel isteği başarısız: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.image_url) {
                    console.log(`Sayfa ${pageIndex + 1} için görsel başarıyla oluşturuldu`);
                    
                    // Görseli kaydet
                    taleImages[pageIndex] = {
                        page: pageIndex,
                        url: data.image_url,
                        alt: `${title} - Sayfa ${pageIndex + 1}`,
                        loaded: true
                    };
                    
                    // Eğer şu anda gösterilen sayfa bu ise, görseli güncelle
                    if (currentPage === pageIndex) {
                        displayPage(currentPage);
                    }
                    
                    resolve(data.image_url);
                } else {
                    console.warn(`Sayfa ${pageIndex + 1} için görsel oluşturulamadı, varsayılan resim kullanılacak`);
                    reject(new Error('Görsel URL alınamadı'));
                }
            })
            .catch(error => {
                console.error(`Sayfa ${pageIndex + 1} görseli oluşturma hatası:`, error);
                
                // Hata durumunda varsayılan resim kullanılmaya devam eder
                console.log(`Sayfa ${pageIndex + 1} için varsayılan görsel kullanılacak`);
                taleImages[pageIndex].url = 'static/img/default-tale.jpg';
                // Hataya rağmen işlemi başarılı kabul ederek devam et
                resolve('static/img/default-tale.jpg');
            });
        });
    }
    
    // Sayfa navigasyon butonlarını güncelle
    function updatePageNavigation() {
        document.getElementById('current-page').textContent = currentPage + 1;
        document.getElementById('total-pages').textContent = totalPages;
        
        // Önceki/sonraki sayfa butonlarını aktif/deaktif yap
        document.getElementById('prev-page').disabled = currentPage === 0;
        document.getElementById('next-page').disabled = currentPage >= totalPages - 1;
    }
    
    // Debug fonksiyonu - "Alt+C" kısayolu ile masal önbelleğini temizleme
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'c') {
            if (confirm('Tüm masal geçmişi ve favorileri temizlenecek. Emin misiniz?')) {
                console.log("Masal geçmişi ve favorileri temizleniyor...");
                
                // Önce lokaldeki verileri temizle
                localStorage.removeItem('taleHistory');
                localStorage.removeItem('taleFavorites');
                
                // Değişkenleri temizle
                taleHistory = [];
                taleFavorites = [];
                
                // Arayüzü güncelle
                updateTaleHistoryUI();
                displayFavorites();
                
                // Sunucudan da temizle
                fetch('/clear_tales', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type: 'all' })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showError("Tüm masallar temizlendi!", "success");
                    } else {
                        showError("Sunucudaki masallar temizlenirken hata: " + data.error);
                    }
                })
                .catch(error => {
                    console.error("Masalları temizleme hatası:", error);
                    showError("Sunucu ile iletişim hatası: " + error.message);
                });
            }
        }
    });
    
    // İstenen sayfayı göster
    function displayPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= totalPages) {
            log('Geçersiz sayfa numarası:', pageIndex);
            return;
        }
        
        // Sayfa mevcut mu kontrol et
        if (!talePages || !talePages[pageIndex]) {
            log('HATA: sayfa verisi bulunamadı:', pageIndex);
            return;
        }
        
        // Görsel mevcut mu kontrol et
        if (!taleImages || !taleImages[pageIndex]) {
            log('HATA: sayfa görseli bulunamadı:', pageIndex);
            return;
        }
        
        currentPage = pageIndex;
        log(`Sayfa gösteriliyor: ${pageIndex + 1}/${totalPages}`);
        
        // Sayfadaki metni göster (innerHTML yerine textContent kullan)
        const taleTextElement = document.getElementById('tale-text');
        if (taleTextElement) {
            // Sayfanın metnini direkt göster
            taleTextElement.textContent = talePages[pageIndex];
        } else {
            log('HATA: tale-text elementi bulunamadı');
        }
        
        // Sayfanın resmini göster
        const taleImage = document.getElementById('tale-image');
        if (taleImage) {
            // Yeni görsel yüklenmeden önce kullanıcıya göstermek için yükleniyor mesajını engelle
            // Görsel yüklenmesi aynı sayfa içinde kalacak, sayfa değişmeyecek
            showLoading(false);
            
            // Görsel URL'si varsa kullan
            if (taleImages[pageIndex] && taleImages[pageIndex].url) {
                taleImage.src = taleImages[pageIndex].url;
                taleImage.alt = taleImages[pageIndex].alt;
                log(`Görsel yüklendi: ${taleImages[pageIndex].url.substring(0, 30)}...`);
            } else {
                log('UYARI: Görsel URL bulunamadı, varsayılan görsel kullanılıyor');
                taleImage.src = 'static/img/default-tale.jpg';
                taleImage.alt = `${pageIndex + 1}. sayfa görseli yüklenemedi`;
            }
        } else {
            log('HATA: tale-image elementi bulunamadı');
        }
        
        // Sayfa göstergelerini güncelle
        updatePageNavigation();
    }
    
    // Ses efekti özellikleri kaldırıldı
    
    // Sayfa değiştirme butonlarına tıklama olayları
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 0) {
            // Yükleme göstergesini engelle
            showLoading(false);
            
            // Önce mevcut sesi durdur
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer = null;
                if (audioURL) {
                    URL.revokeObjectURL(audioURL);
                    audioURL = null;
                }
                document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-play"></i>';
                isPlaying = false;
                clearInterval(audioProgressInterval);
            }
            
            // Sonra sayfayı değiştir
            const newPage = currentPage - 1;
            
            // Yükleme göstergesini gizleyerek sayfayı görüntüle
            displayPage(newPage);
            
            // Ses dosyasını otomatik oynatma yapmadan hazırla
            setTimeout(() => prepareAudioForCurrentPage(), 10);
        }
    });
    
    document.getElementById('next-page').addEventListener('click', function() {
        if (currentPage < totalPages - 1) {
            // Yükleme göstergesini engelle
            showLoading(false);
            
            // Önce mevcut sesi durdur
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer = null;
                if (audioURL) {
                    URL.revokeObjectURL(audioURL);
                    audioURL = null;
                }
                document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-play"></i>';
                isPlaying = false;
                clearInterval(audioProgressInterval);
            }
            
            // Sonra sayfayı değiştir
            const newPage = currentPage + 1;
            
            // Yükleme göstergesini gizleyerek sayfayı görüntüle
            displayPage(newPage);
            
            // Ses dosyasını otomatik oynatma yapmadan hazırla
            setTimeout(() => prepareAudioForCurrentPage(), 10);
        }
    });
    
    // Yeni masal butonuna tıklama
    newTaleButton.addEventListener('click', function() {
        showSettingsPage();
    });
    
    // Favorilere ekleme işlevi
    if (favoriteButton) {
        favoriteButton.addEventListener('click', function() {
            console.log("Favorilere ekle butonuna tıklandı");
            
            // Masal var mı kontrol et
            if (!taleData) {
                showError("Kaydedilecek masal bulunamadı");
                return;
            }
            
            try {
                console.log("Favori işlemi başlıyor - Masal:", taleData);
                
                // localStorage'dan mevcut favorileri al
                let favorites = [];
                try {
                    const savedFavs = localStorage.getItem('taleFavorites');
                    if (savedFavs) {
                        favorites = JSON.parse(savedFavs);
                        console.log("Mevcut favoriler yüklendi:", favorites.length);
                    } else {
                        console.log("Kayıtlı favori bulunamadı, boş dizi kullanılacak");
                    }
                } catch (localStorageError) {
                    console.error("localStorage okuma hatası:", localStorageError);
                    favorites = [];
                }
                
                // Bu masal zaten favorilerde mi?
                const favoriteExists = Array.isArray(favorites) && favorites.some(fav => 
                    fav && fav.title && fav.title === taleData.tale_title
                );
                
                console.log("Masal favori mi?", favoriteExists);
                
                if (favoriteExists) {
                    // Favorilerden çıkar
                    console.log("Masal favorilerden çıkarılıyor");
                    favorites = favorites.filter(fav => fav.title !== taleData.tale_title);
                    localStorage.setItem('taleFavorites', JSON.stringify(favorites));
                    favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
                    showError("Favorilerden çıkarıldı", "success");
                    
                    // Güncellenen favori listesini göster
                    window.taleFavorites = favorites;
                    
                    // Sunucudaki favori masalı sil
                    removeFavoriteFromServer(taleData.tale_title);
                } else {
                    // Favori sınırı kontrolü 
                    if (Array.isArray(favorites) && favorites.length >= 5) {
                        showError("En fazla 5 favori ekleyebilirsiniz", "error");
                        return;
                    }
                    
                    // Favorilere ekle
                    console.log("Masal favorilere ekleniyor");
                    const newFavorite = {
                        id: Date.now().toString(),
                        title: taleData.tale_title,
                        text: taleData.tale_text,
                        image: taleData.image_url,
                        characterName: document.getElementById('character-name') ? document.getElementById('character-name').value : '',
                        characterType: document.getElementById('character-type') ? document.getElementById('character-type').value : '',
                        setting: document.getElementById('setting') ? document.getElementById('setting').value : '',
                        theme: document.getElementById('theme') ? document.getElementById('theme').value : '',
                        date: new Date().toISOString()
                    };
                    
                    console.log("Eklenecek yeni favori:", newFavorite);
                    
                    if (!Array.isArray(favorites)) {
                        console.log("favorites dizisi bozuk, sıfırlanıyor");
                        favorites = [];
                    }
                    
                    favorites.push(newFavorite);
                    
                    try {
                        localStorage.setItem('taleFavorites', JSON.stringify(favorites));
                        console.log("Favoriler localStorage'a kaydedildi");
                    } catch (saveError) {
                        console.error("localStorage kaydetme hatası:", saveError);
                    }
                    
                    favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorilerden Çıkar';
                    showError("Favorilere eklendi", "success");
                    
                    // Güncellenen favori listesini bellekte tut
                    window.taleFavorites = favorites;
                    
                    // Sunucuya da kaydet
                    saveFavoriteToServer(newFavorite);
                }
                
                // Favori listesini güncelle
                console.log("Favori listesi UI güncellemesi başlatılıyor");
                
                // Favorileri doğrudan güncelleyerek hemen gösterelim, sunucudan çekme yapmadan
                const favContainer = document.getElementById('tale-favorites-list');
                if (favContainer) {
                    try {
                        if (favorites.length === 0) {
                            favContainer.innerHTML = '<p class="empty-history">Henüz favori masal eklenmemiş.</p>';
                        } else {
                            let html = '';
                            favorites.forEach((favori, index) => {
                                const tarih = new Date(favori.date).toLocaleDateString('tr-TR');
                                
                                html += `
                                <div class="history-item" data-id="${favori.id}" data-index="${index}">
                                    <div class="history-thumbnail">
                                        <img src="/${favori.image || 'static/img/default-tale.jpg'}" alt="${favori.title || 'Favori Masal ' + (index + 1)}" class="history-image">
                                    </div>
                                    <div class="history-item-info">
                                        <h4>${favori.title || 'Favori Masal ' + (index + 1)}</h4>
                                        <p>${favori.characterName || ''} ${favori.characterType || ''}</p>
                                        <p class="history-date">${tarih}</p>
                                    </div>
                                    <div class="history-buttons">
                                        <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                                            <i class="fas fa-book-open"></i>
                                        </button>
                                        <button class="btn btn-danger history-remove-btn" title="Favorilerden Çıkar">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                                `;
                            });
                            
                            favContainer.innerHTML = html;
                            
                            // Butonlara event listener ekle
                            addFavoriteButtonListeners();
                        }
                    } catch (e) {
                        console.error("Favori listesi güncellenirken hata:", e);
                    }
                }
                
                // Yine de tam olarak güncellemek için sunucudan çekme de yapalım
                setTimeout(() => displayFavorites(), 500);
            } catch (e) {
                console.error("Favori işlemi hatası:", e);
                console.error("Hata stack:", e.stack);
                showError("Favori işlemi sırasında hata oluştu: " + e.message);
            }
        });
    }
    
    // Masalı sunucuya kaydetme işlevi
    function saveFavoriteToServer(favorite) {
        // Metin, görsel, ses dosyalarını kaydetmek için taleData ve talePages kullan
        const saveData = {
            id: favorite.id,
            title: favorite.title,
            text: favorite.text || taleData.tale_text,
            image: favorite.image || taleData.image_url,
            date: favorite.date,
            characterName: favorite.characterName || '',
            characterType: favorite.characterType || '',
            setting: favorite.setting || '',
            theme: favorite.theme || '',
            type: 'favorites',
            isFavorite: true,
            pages: []
        };
        
        // Sayfa verilerini ekle
        if (talePages && talePages.length > 0) {
            saveData.pages = talePages.map((text, index) => {
                return {
                    text: text,
                    image: taleImages[index] ? taleImages[index].url : null
                };
            });
        }
        
        // Ses verilerini ekle
        if (taleAudios && Object.keys(taleAudios).length > 0) {
            saveData.audios = {};
            for (const [pageIdx, audioData] of Object.entries(taleAudios)) {
                if (audioData.blob) {
                    // Blob verisini base64'e çevir
                    const reader = new FileReader();
                    reader.readAsDataURL(audioData.blob);
                    reader.onloadend = function() {
                        const base64data = reader.result.split(',')[1];
                        saveData.audios[pageIdx] = { blob: base64data };
                    };
                }
            }
        }
        
        // Sunucuya gönder
        fetch('/save_tale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Masal sunucuya kaydedildi:', data);
            } else {
                console.error('Sunucu hatası:', data.error);
            }
        })
        .catch(error => {
            console.error('Sunucuya kaydetme hatası:', error);
        });
    }
    
    // Favoriyi sunucudan silme işlevi
    function removeFavoriteFromServer(title) {
        const favorites = JSON.parse(localStorage.getItem('taleFavorites') || '[]');
        const favorite = favorites.find(f => f.title === title);
        
        if (favorite && favorite.id) {
            // API endpoint ile sunucudan sil (gelecekte eklenecek)
            console.log('Favori sunucudan silinecek:', favorite.id);
        }
    }
    
    // Bu eski fonksiyonu kaldırıyoruz çünkü yeni favorilere ekleme fonksiyonu kullanıyoruz
    
    // Favori butonlarına event listener ekleyen yardımcı fonksiyon
    function addFavoriteButtonListeners() {
        const favoritesContainer = document.getElementById('tale-favorites-list');
        if (!favoritesContainer) return;
        
        // Masalı yükleme butonlarına tıklama olaylarını ekle
        const loadButtons = favoritesContainer.querySelectorAll('.history-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const item = this.closest('.history-item');
                const index = parseInt(item.getAttribute('data-index'));
                const id = item.getAttribute('data-id');
                
                if (index >= 0 && index < taleFavorites.length) {
                    const favori = taleFavorites[index];
                    
                    // Önce localden yüklemeyi dene
                    console.log('Favori masalını yükleme:', favori);
                    
                    if (favori) {
                        // Lokal verilerle hemen yüklemeye başla
                        loadTaleFromHistory(favori);
                        
                        // Paralel olarak sunucudan da çekmeyi dene
                        if (id || favori.id) {
                            fetch(`/load_tale/${id || favori.id}?type=favorites`)
                            .then(response => response.json())
                            .then(serverData => {
                                console.log('Sunucudan masal detayları alındı:', serverData);
                                // Zaten yüklendiyse tekrar yüklemeye gerek yok
                            })
                            .catch(error => {
                                console.error('Sunucudan masal yükleme hatası:', error);
                                // Zaten localden yüklenmiş olduğu için bir şey yapmaya gerek yok
                            });
                        }
                    }
                }
            });
        });
        
        // Silme butonlarına tıklama olaylarını ekle
        const removeButtons = favoritesContainer.querySelectorAll('.history-remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const item = this.closest('.history-item');
                const index = parseInt(item.getAttribute('data-index'));
                const id = item.getAttribute('data-id');
                
                if (index >= 0 && index < taleFavorites.length) {
                    const favori = taleFavorites[index];
                    
                    // Favoriden çıkar
                    taleFavorites.splice(index, 1);
                    
                    // localStorage'ı güncelle
                    localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
                    
                    // Arayüzü güncelle
                    displayFavorites();
                    
                    // Eğer görüntülenen masal silindiyse butonu güncelle
                    if (taleData) {
                        const favoriteButton = document.getElementById('favorite-button');
                        if (favoriteButton && favori.title === taleData.tale_title) {
                            favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
                        }
                    }
                    
                    // Sunucudan da sil
                    removeFavoriteFromServer(favori.title);
                    
                    // Bildirim ver
                    showError("Masal favorilerden çıkarıldı", "success");
                }
            });
        });
    }
    
    // Favori masalların ekranda gösterilmesi
    function displayFavorites() {
        console.log("displayFavorites çağrıldı (sunucudan yüklüyor...)");
        const favoritesContainer = document.getElementById('tale-favorites-list');
        
        if (!favoritesContainer) {
            console.error("Favoriler listesi elementi bulunamadı");
            return;
        }
        
        // Eğer container boş değilse ve "yükleniyor" içermiyorsa, durumunu koruyalım
        if (favoritesContainer.innerHTML.trim() !== '' && !favoritesContainer.innerHTML.includes('loading-history')) {
            console.log("Favori listesi zaten dolu, güncelleme yapılacak");
        } else {
            // Yükleniyor göstergesi
            favoritesContainer.innerHTML = '<p class="loading-history">Favoriler yükleniyor...</p>';
        }
        
        // Önce sunucudan favori masalları yükle
        fetch('/list_tales?type=favorites')
        .then(response => response.json())
        .then(serverFavorites => {
            console.log('Sunucudan favoriler yüklendi:', serverFavorites);
            
            // Sonra localStorage'daki favori masalları yükle
            let localFavorites = [];
            try {
                const savedFavorites = localStorage.getItem('taleFavorites');
                if (savedFavorites) {
                    localFavorites = JSON.parse(savedFavorites);
                }
            } catch (e) {
                console.error("Lokalden favoriler yüklenemedi:", e);
                localFavorites = [];
            }
            
            // Sunucu ve lokalden gelen verileri birleştir
            // Aynı ID'ye sahip olanlar için lokaldeki verileri kullan
            let mergedFavorites = [];
            
            // Önce sunucudan gelen verileri ekle
            serverFavorites.forEach(serverFav => {
                const localFav = localFavorites.find(localFav => localFav.id === serverFav.id);
                if (localFav) {
                    // Sunucuda ve lokalde varsa, lokalden al
                    mergedFavorites.push(localFav);
                } else {
                    // Sadece sunucuda varsa, sunucudan al
                    mergedFavorites.push(serverFav);
                }
            });
            
            // Lokalde olup sunucuda olmayan verileri ekle
            localFavorites.forEach(localFav => {
                const exists = mergedFavorites.some(fav => fav.id === localFav.id);
                if (!exists) {
                    mergedFavorites.push(localFav);
                }
            });
            
            // Favoriler boşsa mesaj göster
            if (mergedFavorites.length === 0) {
                favoritesContainer.innerHTML = '<p class="empty-history">Henüz favori masal eklenmemiş.</p>';
                return;
            }
            
            // En yeni tarihli masallar önce gelecek şekilde sırala
            mergedFavorites.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // En fazla 5 favori göster
            mergedFavorites = mergedFavorites.slice(0, MAX_FAVORITES);
            
            // Güncel taleFavorites değişkenini ayarla
            taleFavorites = mergedFavorites;
            
            // localStorage'ı güncelle
            localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
            
            // Favorileri listele
            let html = '';
            taleFavorites.forEach((favori, index) => {
                const tarih = new Date(favori.date).toLocaleDateString('tr-TR');
                
                html += `
                <div class="history-item" data-id="${favori.id}" data-index="${index}">
                    <div class="history-thumbnail">
                        <img src="/${favori.image || 'static/img/default-tale.jpg'}" alt="${favori.title || 'Favori Masal ' + (index + 1)}" class="history-image">
                    </div>
                    <div class="history-item-info">
                        <h4>${favori.title || 'Favori Masal ' + (index + 1)}</h4>
                        <p>${favori.characterName || ''} ${favori.characterType || ''}</p>
                        <p class="history-date">${tarih}</p>
                    </div>
                    <div class="history-buttons">
                        <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                            <i class="fas fa-book-open"></i>
                        </button>
                        <button class="btn btn-danger history-remove-btn" title="Favorilerden Çıkar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                `;
            });
            
            // HTML'i ekrana yaz
            favoritesContainer.innerHTML = html;
            
            // Masalı yükleme butonlarına tıklama olaylarını ekle
            const loadButtons = favoritesContainer.querySelectorAll('.history-load-btn');
            loadButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const item = this.closest('.history-item');
                    const index = parseInt(item.getAttribute('data-index'));
                    const favori = taleFavorites[index];
                    
                    if (favori) {
                        // Önce localden yüklemeyi dene
                        console.log('Favori masalını yükleme:', favori);
                        
                        // Sunucudan tam detayları getir
                        fetch(`/load_tale/${favori.id}?type=favorites`)
                        .then(response => response.json())
                        .then(serverData => {
                            console.log('Sunucudan masal detayları alındı:', serverData);
                            loadTaleFromServer(serverData);
                        })
                        .catch(error => {
                            console.error('Sunucudan masal yükleme hatası:', error);
                            // Sunucudan alınamazsa lokalden yükle
                            loadTaleFromHistory(favori);
                        });
                    }
                });
            });
            
            // Silme butonlarına tıklama olaylarını ekle
            const removeButtons = favoritesContainer.querySelectorAll('.history-remove-btn');
            removeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const item = this.closest('.history-item');
                    const index = parseInt(item.getAttribute('data-index'));
                    const id = item.getAttribute('data-id');
                    
                    if (index >= 0 && index < taleFavorites.length) {
                        const favori = taleFavorites[index];
                        
                        // Favoriden çıkar
                        taleFavorites.splice(index, 1);
                        
                        // localStorage'ı güncelle
                        localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
                        
                        // Arayüzü güncelle
                        displayFavorites();
                        
                        // Eğer görüntülenen masal silindiyse butonu güncelle
                        if (taleData) {
                            const favoriteButton = document.getElementById('favorite-button');
                            if (favoriteButton && favori.title === taleData.tale_title) {
                                favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorilere Ekle';
                            }
                        }
                        
                        // Sunucudan da sil
                        removeFavoriteFromServer(favori.title);
                        
                        // Bildirim ver
                        showError("Masal favorilerden çıkarıldı", "success");
                    }
                });
            });
        })
        .catch(error => {
            console.error('Sunucudan favoriler yüklenirken hata:', error);
            
            // Sunucu hatası durumunda sadece lokalden yükle
            let localFavorites = [];
            try {
                const savedFavorites = localStorage.getItem('taleFavorites');
                if (savedFavorites) {
                    localFavorites = JSON.parse(savedFavorites);
                    
                    // Güncel taleFavorites değişkenini ayarla
                    taleFavorites = localFavorites;
                    
                    // Favorileri göster
                    updateTaleFavoritesUI();
                } else {
                    favoritesContainer.innerHTML = '<p class="empty-history">Henüz favori masal eklenmemiş.</p>';
                }
            } catch (e) {
                console.error("Lokalden favoriler yüklenemedi:", e);
                favoritesContainer.innerHTML = '<p class="error-history">Favoriler yüklenemedi, lütfen sayfayı yenileyin.</p>';
            }
        });
    }
    
    // Word olarak kaydet
    function saveWord() {
        if (!taleData || !talePages || talePages.length === 0) {
            showError('Kaydedilecek masal bulunamadı.');
            return;
        }
        
        showLoading(true);
        
        // Tüm sayfaları birleştir
        const fullText = talePages.join('\n\n');
        
        fetch('/save_word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tale_text: fullText,
                images: taleImages.map(img => {
                    // Base64 görüntü verisi çıkarılıyor
                    if (img.url && img.url.startsWith('data:image/')) {
                        // data:image/jpeg;base64,/9j/... formatından sadece base64 kısmını al
                        return img.url.split(',')[1];
                    }
                    return null; // Geçersiz URL'leri filtrele
                }).filter(img => img !== null) || []
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Sunucu hatası: ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'masal.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showLoading(false);
        })
        .catch(error => {
            log('Hata:', { error: error.message, stack: error.stack });
            showError('Masal kaydedilirken bir hata oluştu: ' + error.message);
            showLoading(false);
        });
    }
    
    // Kaydet butonuna tıklama
    saveButton.addEventListener('click', function() {
        // Bu aksiyon için log kaydı
        console.log("Word olarak kaydet butonuna tıklandı");
        // Uyarı göster
        showLoading(true, "Word belgesi hazırlanıyor...");
        // Word dosyasını kaydet
        saveWord();
    });
    
    // Sesli oku
    // Ses çalma için global değişkenler
    let audioPlayer = null;
    let audioURL = null;
    let isPlaying = false;
    let audioProgressInterval = null;
    
    // Tüm ses çalar kontrollerini ayarla
    function setupAudioPlayerControls() {
        const playerContainer = document.getElementById('audio-player-container');
        const playPauseBtn = document.getElementById('audio-play-pause');
        const stopBtn = document.getElementById('audio-stop');
        const restartBtn = document.getElementById('audio-restart');
        const progressSlider = document.getElementById('audio-progress');
        const speedSelect = document.getElementById('audio-speed');
        
        // Oynat/Duraklat butonuna tıklandığında
        playPauseBtn.addEventListener('click', function() {
            if (!audioPlayer) return;
            
            if (isPlaying) {
                // Şu an çalıyorsa duraklat
                audioPlayer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                isPlaying = false;
                clearInterval(audioProgressInterval);
            } else {
                // Şu an duraklatılmışsa oynat
                audioPlayer.play().then(() => {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    isPlaying = true;
                    
                    // İlerleme çubuğunu güncelle
                    updateProgressBar();
                }).catch(e => {
                    log("Ses oynatma hatası", e);
                    showError("Ses oynatma başlatılamadı: " + e.message);
                });
            }
        });
        
        // Durdur butonuna tıklandığında
        stopBtn.addEventListener('click', function() {
            if (!audioPlayer) return;
            
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            clearInterval(audioProgressInterval);
            progressSlider.value = 0;
        });
        
        // Yeniden başlat butonuna tıklandığında
        restartBtn.addEventListener('click', function() {
            if (!audioPlayer) return;
            
            audioPlayer.currentTime = 0;
            if (!isPlaying) {
                audioPlayer.play().then(() => {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    isPlaying = true;
                    updateProgressBar();
                }).catch(e => {
                    log("Ses oynatma hatası", e);
                });
            }
        });
        
        // İlerleme çubuğu değiştiğinde
        progressSlider.addEventListener('input', function() {
            if (!audioPlayer) return;
            
            const seekTime = (audioPlayer.duration * (progressSlider.value / 100)) || 0;
            audioPlayer.currentTime = seekTime;
        });
        
        // Hız değiştiğinde
        speedSelect.addEventListener('change', function() {
            if (!audioPlayer) return;
            
            audioPlayer.playbackRate = parseFloat(speedSelect.value);
            log(`Oynatma hızı: ${speedSelect.value}x`);
        });
    }
    
    // İlerleme çubuğunu güncelleme
    function updateProgressBar() {
        const progressSlider = document.getElementById('audio-progress');
        
        if (audioProgressInterval) {
            clearInterval(audioProgressInterval);
        }
        
        audioProgressInterval = setInterval(function() {
            if (audioPlayer && audioPlayer.duration) {
                const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressSlider.value = percentage;
            }
        }, 100);
    }
    
    // Sesli oku fonksiyonu - ana fonksiyon
    function readTaleAloud(autoPlay = true) {
        if (!taleData || !talePages || talePages.length === 0) {
            showError('Okunacak masal bulunamadı.');
            return;
        }
        
        // Konsola debug bilgisi yazdır
        console.log("------------------------------");
        console.log(`readTaleAloud() çağrıldı - Şu anki sayfa: ${currentPage + 1}, autoPlay: ${autoPlay}`);
        console.log(`Mevcut sayfanın metni: ${talePages[currentPage].substring(0, 30)}...`);
        console.log("Önbellekteki ses dosyaları:", Object.keys(taleAudios).map(page => `Sayfa ${parseInt(page) + 1}`));
        
        // Şu anki sayfadaki metni oku
        const text = talePages[currentPage];
        
        // Öncelikle, bu sayfa için zaten oluşturulmuş bir ses dosyası var mı kontrol et
        if (taleAudios[currentPage] && taleAudios[currentPage].blob) {
            console.log(`Sayfa ${currentPage + 1} için önbellekte ses dosyası bulundu, ${autoPlay ? 'otomatik oynatılıyor' : 'oynatma için hazırlanıyor'}`);
            // Yükleme göstergesini gizle
            showLoading(false);
            
            if (autoPlay) {
                playAudioFromBlob(taleAudios[currentPage].blob);
            } else {
                prepareAudioBlob(taleAudios[currentPage].blob);
            }
            return;
        }
        
        console.log(`Sayfa ${currentPage + 1} için önbellekte ses dosyası bulunamadı, yeni oluşturuluyor`);
        
        // Kullanıcıya küçük bir gösterge gösterebiliriz, ama bu opsiyonel
        // Burada kullanıcı zaten ses UI'ında olacak, sayfa değişmeyecek
        // Minimalist bir yaklaşım olsun
        const audioStatus = document.getElementById('audio-play-pause');
        if (audioStatus) {
            // Yükleniyor göstergesini kaldır, bunun yerine ses butonunu güncelle
            showLoading(false);
            audioStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            // Yükleme göstergesini yine de gizle
            showLoading(false);
        }
        
        // Daha önce bir ses çalıyorsa durdur ve temizle
        stopAudioPlayback();
        
        // İsteği hazırla
        fetch('/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text, page: currentPage })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Sunucu hatası: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            console.log(`Sayfa ${currentPage + 1} için ses dosyası alındı (${blob.size} bytes)`);
            
            // Ses blob'unu kaydet
            taleAudios[currentPage] = { blob: blob };
            console.log("Güncellenmiş ses dosyaları:", Object.keys(taleAudios).map(page => `Sayfa ${parseInt(page) + 1}`));
            
            // Oynatma fonksiyonunu çağır
            if (autoPlay) {
                playAudioFromBlob(blob);
            } else {
                prepareAudioBlob(blob);
            }
        })
        .catch(error => {
            log("Ses oluşturma hatası", error);
            showError("Ses oluşturma hatası: " + error.message);
            showLoading(false);
        });
    }
    
    // Ses dosyasını hazırla ama otomatik oynatma yapma
    function prepareAudioBlob(blob) {
        // Daha önce bir ses çalıyorsa durdur ve temizle
        stopAudioPlayback();
        
        console.log(`prepareAudioBlob çağrıldı - Şu anki sayfa: ${currentPage + 1}, blob boyutu: ${blob.size} bytes`);
        
        // Audio elementini oluştur
        audioURL = URL.createObjectURL(blob);
        audioPlayer = new Audio(audioURL);
        
        // Audio nesnesinin sayfa bilgisini kaydet - bu daha sonra debug için yararlı olacak
        audioPlayer.dataset.page = currentPage;
        
        console.log(`Ses URL'si oluşturuldu: ${audioURL}`);
        
        // Ses çalar kontrol panelini göster
        document.getElementById('audio-player-container').style.display = 'block';
        
        // Oynatma butonunu güncelle - play ikonu göster
        document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-play"></i>';
        
        // Durumları izle
        audioPlayer.onplay = () => {
            console.log(`Sayfa ${currentPage + 1} için ses çalmaya başladı`);
            isPlaying = true;
            showLoading(false);
        };
        
        audioPlayer.onpause = () => {
            console.log("Ses duraklatıldı");
            isPlaying = false;
        };
        
        audioPlayer.onended = () => {
            console.log("Ses çalma tamamlandı");
            isPlaying = false;
            document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-play"></i>';
            clearInterval(audioProgressInterval);
        };
        
        audioPlayer.onerror = (e) => {
            console.error("Ses çalma hatası", e);
            // Hata mesajını göstermeyi kaldırıyoruz çünkü kullanıcı deneyimini bozuyor
            showLoading(false);
            isPlaying = false;
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
                audioURL = null;
            }
        };
        
        // Ses dosyasının yüklendiğinden emin olmak için
        audioPlayer.onloadeddata = () => {
            console.log(`Ses verisi yüklendi, çalınmaya hazır. Süre: ${audioPlayer.duration} sn`);
            showLoading(false);
        };
        
        // İlerleme çubuğunu sıfırla
        document.getElementById('audio-progress').value = 0;
    }

    // Ses blobu üzerinden oynatma
    function playAudioFromBlob(blob) {
        // Önce hazırla
        prepareAudioBlob(blob);
        
        console.log(`playAudioFromBlob çağrıldı - Şu anki sayfa: ${currentPage + 1}, blob boyutu: ${blob.size} bytes`);
        
        // Oynatma butonunu güncelle
        document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-pause"></i>';
        
        // Oynatmayı başlat
        audioPlayer.play().then(() => {
            console.log(`Sayfa ${currentPage + 1} için ses çalma başladı`);
        }).catch(e => {
            console.error("Ses oynatma hatası", e);
            showError("Ses oynatma başlatılamadı: " + e.message);
            showLoading(false);
        });
        
        // İlerleme çubuğunu başlat
        updateProgressBar();
    }
    
    // Ses çalmayı durdur ve temizle
    function stopAudioPlayback() {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer = null;
        }
        
        if (audioURL) {
            URL.revokeObjectURL(audioURL);
            audioURL = null;
        }
        
        // İlerleme çubuğunu sıfırla
        clearInterval(audioProgressInterval);
    }
    
    // Artık bu fonksiyon kullanılmıyor - sayfa değiştirme butonlarında direkt olarak ses kontrolü yapılıyor
    function handlePageAudioChange() {
        log(`Sayfa değişikliği: ${currentPage + 1}. sayfa için ses kontrolü`);
        
        // Önceki sesi durdur
        stopAudioPlayback();
        
        // Ses kontrol panelini güncelle
        document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
        
        // Yeni sayfa için sesi oluştur ve oynat
        readTaleAloud();
    }
    
    // Sayfa yüklendiğinde otomatik olarak ses dosyasını hazırla 
    // ama oynatma - kullanıcı play butonuna basacak
    function prepareAudioForCurrentPage() {
        try {
            // Yükleme göstergesini kesinlikle kapat
            showLoading(false);
            
            // Sayfa değişikliğinde ses dosyalarını hazırla
            if (talePages && talePages.length > 0 && currentPage >= 0 && currentPage < talePages.length) {
                // Önce ses dosyasını önbellekte var mı kontrol et
                if (taleAudios && taleAudios[currentPage] && taleAudios[currentPage].blob) {
                    console.log(`Sayfa ${currentPage + 1} için önbellekteki ses dosyası kullanılıyor`);
                    // Önbellekteki ses dosyasını kullan, yeni istek yapma
                    prepareAudioBlob(taleAudios[currentPage].blob);
                } else {
                    // Önbellekte yok, yeni oluştur
                    console.log(`Sayfa ${currentPage + 1} için ses dosyası oluşturuluyor`);
                    readTaleAloud(false); // Otomatik oynatma yapmadan hazırla
                }
            }
        } catch (error) {
            console.log("Ses hazırlama hatası:", error);
            // Hatayı yut ve kullanıcıya gösterme
        }
    }
    
    // Geçmiş butonları için event listener'ları ekleyen yardımcı fonksiyon
    function addHistoryButtonListeners() {
        const historyContainer = document.getElementById('tale-history-list');
        if (!historyContainer) return;
        
        // Masalı yükleme butonlarına tıklama olaylarını ekle
        const loadButtons = historyContainer.querySelectorAll('.history-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const item = this.closest('.history-item');
                const index = parseInt(item.getAttribute('data-index'));
                const id = item.getAttribute('data-id');
                
                if (index >= 0 && index < taleHistory.length) {
                    const tale = taleHistory[index];
                    
                    // Önce lokalden yüklemeyi dene
                    console.log("Geçmiş masalını yükleme:", tale);
                    loadTaleFromHistory(tale);
                    
                    // Paralel olarak sunucudan da veriyi çekmeyi dene
                    if (id || tale.id) {
                        fetch(`/load_tale/${id || tale.id}?type=history`)
                    .then(response => response.json())
                    .then(serverData => {
                        console.log('Sunucudan masal detayları alındı, ekstra bilgiler için kullanılabilir');
                        // Zaten yüklendiği için burada bir şey yapmaya gerek yok
                    })
                    .catch(error => {
                        console.error('Sunucudan masal yükleme hatası (sorun yok, local veriler kullanılıyor):', error);
                    });
                    }
                }
            });
        });
        
        // Favori butonlarına tıklama olaylarını ekle
        const favoriteButtons = historyContainer.querySelectorAll('.history-favorite-btn');
        favoriteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const item = this.closest('.history-item');
                const index = parseInt(item.getAttribute('data-index'));
                const tale = taleHistory[index];
                
                if (tale) {
                    console.log("Geçmiş masalı için favori butonu tıklandı:", tale);
                    
                    // Favorilerde mi kontrol et
                    let foundIndex = -1;
                    
                    if (window.taleFavorites && window.taleFavorites.length > 0) {
                        for (let i = 0; i < window.taleFavorites.length; i++) {
                            if ((window.taleFavorites[i].id && tale.id && window.taleFavorites[i].id === tale.id) ||
                                (window.taleFavorites[i].title && tale.title && window.taleFavorites[i].title === tale.title)) {
                                foundIndex = i;
                                break;
                            }
                        }
                    }
                    
                    if (foundIndex > -1) {
                        // Favorilerde var, çıkar
                        console.log("Masal favorilerde bulundu, çıkarılıyor...");
                        window.taleFavorites.splice(foundIndex, 1);
                        localStorage.setItem('taleFavorites', JSON.stringify(window.taleFavorites));
                        button.classList.remove('btn-primary');
                        button.classList.add('btn-secondary');
                        button.setAttribute('title', 'Favorilere Ekle');
                        showError('Masal favorilerden çıkarıldı.', 'success');
                        
                        // Sunucudan da sil
                        removeFavoriteFromServer(tale.title);
                    } else {
                        // Favorilerde yok, ekle
                        console.log("Masal favorilerde yok, ekleniyor...");
                        
                        // Limit kontrolü
                        if (window.taleFavorites && window.taleFavorites.length >= MAX_FAVORITES) {
                            showError(`En fazla ${MAX_FAVORITES} favori masal kaydedebilirsiniz. Lütfen önce eski bir favoriyi silin.`);
                            return;
                        }
                        
                        if (!window.taleFavorites) window.taleFavorites = [];
                        window.taleFavorites.push(tale);
                        localStorage.setItem('taleFavorites', JSON.stringify(window.taleFavorites));
                        button.classList.remove('btn-secondary');
                        button.classList.add('btn-primary');
                        button.setAttribute('title', 'Favorilerden Çıkar');
                        showError('Masal favorilere eklendi!', 'success');
                        
                        // Sunucuya da kaydet
                        saveTaleToServer(tale, 'favorites');
                    }
                    
                    // UI güncelle - hemen güncellensin diye önce lokal çağrı
                    const favContainer = document.getElementById('tale-favorites-list');
                    if (favContainer) {
                        let html = '';
                        window.taleFavorites.forEach((favori, index) => {
                            const tarih = new Date(favori.date).toLocaleDateString('tr-TR');
                            
                            html += `
                            <div class="history-item" data-id="${favori.id}" data-index="${index}">
                                <div class="history-thumbnail">
                                    <img src="/${favori.image || 'static/img/default-tale.jpg'}" alt="${favori.title || 'Favori Masal ' + (index + 1)}" class="history-image">
                                </div>
                                <div class="history-item-info">
                                    <h4>${favori.title || 'Favori Masal ' + (index + 1)}</h4>
                                    <p>${favori.characterName || ''} ${favori.characterType || ''}</p>
                                    <p class="history-date">${tarih}</p>
                                </div>
                                <div class="history-buttons">
                                    <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                                        <i class="fas fa-book-open"></i>
                                    </button>
                                    <button class="btn btn-danger history-remove-btn" title="Favorilerden Çıkar">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                            `;
                        });
                        
                        if (window.taleFavorites.length === 0) {
                            favContainer.innerHTML = '<p class="empty-history">Henüz favori masal eklenmemiş.</p>';
                        } else {
                            favContainer.innerHTML = html;
                            addFavoriteButtonListeners();
                        }
                    }
                    
                    // Sunucudan güncel veriyi çek
                    setTimeout(() => displayFavorites(), 500);
                }
            });
        });
    }
    
    // Masal geçmişi fonksiyonları
    function loadTaleHistory() {
        console.log("loadTaleHistory çağrıldı");
        
        // Önce lokalden geçmişi yükleyelim ki hemen görünsün
        try {
            const savedHistory = localStorage.getItem('taleHistory');
            if (savedHistory) {
                taleHistory = JSON.parse(savedHistory);
                if (taleHistory.length > 0) {
                    // Geçmiş masalları göster
                    const historyContainer = document.getElementById('tale-history-list');
                    if (historyContainer) {
                        let html = '';
                        taleHistory.forEach((tale, index) => {
                            // Favorilerde mi kontrol et
                            let isFavorite = false;
                            if (window.taleFavorites && window.taleFavorites.length > 0) {
                                isFavorite = window.taleFavorites.some(fav => 
                                    (fav.id && tale.id && fav.id === tale.id) || 
                                    (fav.title && tale.title && fav.title === tale.title)
                                );
                            }
                            
                            const favoriteButtonClass = isFavorite ? 'btn-primary' : 'btn-secondary';
                            const tarih = new Date(tale.date).toLocaleDateString('tr-TR');
                            
                            html += `
                            <div class="history-item" data-id="${tale.id || ''}" data-index="${index}">
                                <div class="history-thumbnail">
                                    <img src="/${tale.image || 'static/img/default-tale.jpg'}" alt="${tale.title || 'Masal ' + (index + 1)}" class="history-image">
                                </div>
                                <div class="history-item-info">
                                    <h4>${tale.title || 'Masal ' + (index + 1)}</h4>
                                    <p>${tale.characterName || ''} ${tale.characterType || ''}</p>
                                    <p class="history-date">${tarih}</p>
                                </div>
                                <div class="history-buttons">
                                    <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                                        <i class="fas fa-book-open"></i>
                                    </button>
                                    <button class="btn ${favoriteButtonClass} history-favorite-btn" title="${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}">
                                        <i class="fas fa-heart"></i>
                                    </button>
                                </div>
                            </div>`;
                        });
                        
                        historyContainer.innerHTML = html;
                        
                        // Butonları aktifleştir
                        addHistoryButtonListeners();
                    }
                }
            }
        } catch (e) {
            console.error("Lokalden geçmiş yüklenirken hata:", e);
        }
        
        // Sonra sunucudan geçmiş masalları yükle
        fetch('/list_tales?type=history')
        .then(response => response.json())
        .then(serverHistory => {
            console.log("Sunucudan geçmiş masallar yüklendi:", serverHistory);
            
            // Aynı zamanda lokalden de yükle
            let localHistory = [];
            const savedHistory = localStorage.getItem('taleHistory');
            if (savedHistory) {
                try {
                    localHistory = JSON.parse(savedHistory);
                } catch (e) {
                    console.error("Lokalden geçmiş yüklenirken hata:", e);
                    localHistory = [];
                }
            }
            
            // Sunucu ve lokalden gelen verileri birleştir
            // Aynı ID'ye sahip olanlar için lokaldeki verileri kullan
            let mergedHistory = [];
            
            // Önce sunucudan gelen verileri ekle
            serverHistory.forEach(serverTale => {
                const localTale = localHistory.find(localTale => localTale.id === serverTale.id);
                if (localTale) {
                    // Sunucuda ve lokalde varsa, lokalden al
                    mergedHistory.push(localTale);
                } else {
                    // Sadece sunucuda varsa, sunucudan al
                    mergedHistory.push(serverTale);
                }
            });
            
            // Lokalde olup sunucuda olmayan verileri ekle
            localHistory.forEach(localTale => {
                const exists = mergedHistory.some(tale => tale.id === localTale.id);
                if (!exists) {
                    mergedHistory.push(localTale);
                }
            });
            
            // En yeni tarihli masallar önce gelecek şekilde sırala
            mergedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // En fazla 5 masal sakla
            mergedHistory = mergedHistory.slice(0, MAX_HISTORY);
            
            // Geçmişi güncelle
            taleHistory = mergedHistory;
            localStorage.setItem('taleHistory', JSON.stringify(taleHistory));
            
            // Arayüzü güncelle
            updateTaleHistoryUI();
        })
        .catch(error => {
            console.error("Sunucudan geçmiş masallar yüklenirken hata:", error);
            
            // Hata durumunda sadece lokalden yükle
            const savedHistory = localStorage.getItem('taleHistory');
            if (savedHistory) {
                try {
                    taleHistory = JSON.parse(savedHistory);
                    // Son 5 masalı al
                    taleHistory = taleHistory.slice(0, MAX_HISTORY);
                    updateTaleHistoryUI();
                } catch (e) {
                    console.error('Geçmiş yüklenirken hata:', e);
                    taleHistory = [];
                    updateTaleHistoryUI();
                }
            } else {
                taleHistory = [];
                updateTaleHistoryUI();
            }
        });
    }
    
    function updateTaleHistoryUI() {
        console.log("updateTaleHistoryUI çağrıldı");
        const historyListContainer = document.getElementById('tale-history-list');
        if (!historyListContainer) {
            console.error("tale-history-list elementi bulunamadı");
            return;
        }
        
        // Geçmiş boş olabilir
        if (!taleHistory) taleHistory = [];
        
        if (taleHistory.length === 0) {
            historyListContainer.innerHTML = '<p class="empty-history">Henüz masal geçmişi yok.</p>';
            return;
        }
        
        console.log("Geçmiş listesi güncelleniyor:", taleHistory);
        
        let historyHTML = '';
        
        taleHistory.forEach((tale, index) => {
            // Favorilerde mi kontrol et
            let isFavorite = false;
            if (taleFavorites && taleFavorites.length > 0) {
                isFavorite = taleFavorites.some(fav => {
                    // ID veya başlık olarak kontrol et
                    return (fav.id && tale.id && fav.id === tale.id) || 
                           (fav.title && tale.title && fav.title === tale.title);
                });
            }
            
            const favoriteButtonClass = isFavorite ? 'btn-primary' : 'btn-secondary';
            
            historyHTML += `
                <div class="history-item" data-id="${tale.id || ''}" data-index="${index}">
                    <div class="history-thumbnail">
                        <img src="${tale.image || 'static/img/default-tale.jpg'}" alt="${tale.title || 'Masal ' + (index + 1)}" class="history-image">
                    </div>
                    <div class="history-item-info">
                        <h4>${tale.title || 'Masal ' + (index + 1)}</h4>
                        <p>${tale.characterName || ''} ${tale.characterType || ''}</p>
                        <p class="history-date">${new Date(tale.date || new Date()).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div class="history-buttons">
                        <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                            <i class="fas fa-book-open"></i>
                        </button>
                        <button class="btn ${favoriteButtonClass} history-favorite-btn" title="${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        historyListContainer.innerHTML = historyHTML;
        
        // Geçmiş masalları yükleme butonlarına olay dinleyicileri ekle
        const loadButtons = historyListContainer.querySelectorAll('.history-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const historyItem = this.closest('.history-item');
                const index = parseInt(historyItem.getAttribute('data-index'));
                const tale = taleHistory[index];
                
                if (tale) {
                    console.log("Geçmiş masalını yükleme:", tale);
                    
                    // Önce sunucudan tam detayları getir
                    fetch(`/load_tale/${tale.id}?type=history`)
                    .then(response => response.json())
                    .then(serverData => {
                        console.log('Sunucudan masal detayları alındı:', serverData);
                        loadTaleFromServer(serverData);
                    })
                    .catch(error => {
                        console.error('Sunucudan masal yükleme hatası:', error);
                        // Sunucudan alınamazsa lokalden yükle
                        loadTaleFromHistory(tale);
                    });
                }
            });
        });
        
        // Favori butonlarına yeni olay dinleyicileri ekle
        const favoriteButtons = historyListContainer.querySelectorAll('.history-favorite-btn');
        favoriteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const historyItem = this.closest('.history-item');
                const index = parseInt(historyItem.getAttribute('data-index'));
                const tale = taleHistory[index];
                
                if (tale) {
                    console.log("Geçmiş masalı için favori butonu tıklandı:", tale);
                    
                    // Favorilerde mi kontrol et
                    let foundIndex = -1;
                    
                    if (taleFavorites && taleFavorites.length > 0) {
                        for (let i = 0; i < taleFavorites.length; i++) {
                            if ((taleFavorites[i].id && tale.id && taleFavorites[i].id === tale.id) ||
                                (taleFavorites[i].title && tale.title && taleFavorites[i].title === tale.title)) {
                                foundIndex = i;
                                break;
                            }
                        }
                    }
                    
                    if (foundIndex > -1) {
                        // Favorilerde var, çıkar
                        console.log("Masal favorilerde bulundu, çıkarılıyor...");
                        taleFavorites.splice(foundIndex, 1);
                        localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
                        button.classList.remove('btn-primary');
                        button.classList.add('btn-secondary');
                        button.setAttribute('title', 'Favorilere Ekle');
                        showError('Masal favorilerden çıkarıldı.', 'success');
                        
                        // Sunucudan da sil
                        removeFavoriteFromServer(tale.title);
                    } else {
                        // Favorilerde yok, ekle
                        console.log("Masal favorilerde yok, ekleniyor...");
                        
                        // Limit kontrolü
                        if (taleFavorites && taleFavorites.length >= MAX_FAVORITES) {
                            showError(`En fazla ${MAX_FAVORITES} favori masal kaydedebilirsiniz. Lütfen önce eski bir favoriyi silin.`);
                            return;
                        }
                        
                        if (!taleFavorites) taleFavorites = [];
                        taleFavorites.push(tale);
                        localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
                        button.classList.remove('btn-secondary');
                        button.classList.add('btn-primary');
                        button.setAttribute('title', 'Favorilerden Çıkar');
                        showError('Masal favorilere eklendi!', 'success');
                        
                        // Sunucuya da kaydet
                        saveTaleToServer(tale, 'favorites');
                    }
                    
                    // UI güncelle
                    updateTaleFavoritesUI();
                }
            });
        });
    }
    
    // Favori masallar fonksiyonları
    function loadTaleFavorites() {
        console.log("loadTaleFavorites çağrıldı");
        
        // taleFavorites değişkenini tanımla - eğer zaten tanımlanmamışsa
        if (typeof taleFavorites === 'undefined') {
            window.taleFavorites = [];
        }
        
        // Favorileri göster (bu fonksiyon sunucudan ve lokalden favorileri yükler)
        displayFavorites();
    }
    
    function updateTaleFavoritesUI() {
        console.log("updateTaleFavoritesUI çağrıldı");
        const favoritesListContainer = document.getElementById('tale-favorites-list');
        if (!favoritesListContainer) {
            console.error("tale-favorites-list elementi bulunamadı");
            return;
        }
        
        // Favoriler boş olabilir
        if (!taleFavorites) taleFavorites = [];
        
        if (taleFavorites.length === 0) {
            favoritesListContainer.innerHTML = '<p class="empty-history">Henüz favori masal eklenmemiş.</p>';
            return;
        }
        
        console.log("Favoriler listesi güncelleniyor:", taleFavorites);
        
        let favoritesHTML = '';
        
        taleFavorites.forEach((tale, index) => {
            favoritesHTML += `
                <div class="history-item" data-id="${tale.id || ''}" data-index="${index}">
                    <div class="history-thumbnail">
                        <img src="/${tale.image || 'static/img/default-tale.jpg'}" alt="${tale.title || 'Favori Masal ' + (index + 1)}" class="history-image">
                    </div>
                    <div class="history-item-info">
                        <h4>${tale.title || 'Favori Masal ' + (index + 1)}</h4>
                        <p>${tale.characterName || ''} ${tale.characterType || ''}</p>
                        <p class="history-date">${new Date(tale.date || new Date()).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div class="history-buttons">
                        <button class="btn btn-primary history-load-btn" title="Masalı Aç">
                            <i class="fas fa-book-open"></i>
                        </button>
                        <button class="btn btn-danger history-remove-btn" title="Favorilerden Çıkar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        favoritesListContainer.innerHTML = favoritesHTML;
        
        // Favori masalları yükleme butonlarına olay dinleyicileri ekle
        const loadButtons = favoritesListContainer.querySelectorAll('.history-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const favoriteItem = this.closest('.history-item');
                const index = parseInt(favoriteItem.getAttribute('data-index'));
                const tale = taleFavorites[index];
                
                if (tale) {
                    // Masal gösterme fonksiyonunu çağır
                    console.log("Favori masalını yükleme:", tale);
                    loadTaleFromHistory(tale);
                }
            });
        });
        
        // Silme butonlarına olay dinleyicileri ekle
        const removeButtons = favoritesListContainer.querySelectorAll('.history-remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const favoriteItem = this.closest('.history-item');
                const index = parseInt(favoriteItem.getAttribute('data-index'));
                const tale = taleFavorites[index];
                
                if (tale) {
                    console.log("Favori masalını silme:", index, tale);
                    
                    // Doğrudan diziden kaldır
                    taleFavorites.splice(index, 1);
                    localStorage.setItem('taleFavorites', JSON.stringify(taleFavorites));
                    
                    // UI güncelle
                    updateTaleFavoritesUI();
                    
                    // Mesaj göster
                    showError('Masal favorilerden kaldırıldı.', 'success');
                }
            });
        });
    }
    
    // Önceki addTaleToFavorites ve removeTaleFromFavorites fonksiyonları kaldırıldı
    // Bunun yerine doğrudan favoriteTaleButton tıklama olayı içinde gerekli işlemler yapılıyor
    
    function loadTaleFromHistory(tale) {
        console.log("loadTaleFromHistory çağrıldı:", tale);
        
        if (!tale || (!tale.data && !tale.text)) {
            showError('Masal yüklenemedi.');
            return;
        }
        
        // Lokalden yükleme yapıldığını belirt (yükleme göstergesini geçmek için)
        window.isFromLocalStorage = true;
        
        // Yükleme göstergesini kapat - her ihtimale karşı
        showLoading(false);
        
        // tale.data varsa direkt kullan, yoksa tale nesnesinden oluştur
        if (tale.data) {
            taleData = tale.data;
        } else {
            console.log("Masal verisi oluşturuluyor...");
            // Masal verisi oluştur
            taleData = {
                tale_title: tale.title || "Masal",
                tale_text: tale.text,
                image_url: tale.image,
                isFavorite: tale.isFavorite || false
            };
        }
        
        // Favorilere ekleme butonunu ayarla
        const favoriteButton = document.getElementById('favorite-button');
        if (favoriteButton) {
            favoriteButton.disabled = false;
            
            // Mevcut masal favori mi kontrol et ve butonunu güncelle
            // Önce isFavorite özelliğine bak, yoksa liste içinde ara
            let isFavorite = taleData.isFavorite;
            
            if (!isFavorite) {
                // Eski yöntem ile de kontrol et
                isFavorite = taleFavorites.some(fav => 
                    (fav.id && tale.id && fav.id === tale.id) || 
                    (fav.title && tale.title && fav.title === tale.title));
            }
            
            favoriteButton.innerHTML = isFavorite ? 
                '<i class="fas fa-heart"></i> Favorilerden Çıkar' : 
                '<i class="fas fa-heart"></i> Favorilere Ekle';
            
            // Favori butonunun sınıfını güncelle
            if (isFavorite) {
                favoriteButton.classList.add('active');
            } else {
                favoriteButton.classList.remove('active');
            }
        }
        
        // Masalı sayfalara böl
        preparePagedContent(taleData.tale_text, taleData.tale_title);
        
        // İlk sayfa için görsel ekle
        if (tale.image || taleData.image_url) {
            taleImages[0] = {
                page: 0,
                url: tale.image || taleData.image_url,
                alt: `${taleData.tale_title} - Sayfa 1`,
                loaded: true
            };
        }
        
        // İlk sayfayı göster
        displayPage(0);
        
        // Masal sayfasına geç
        showTalePage();
        
        // İlk ses dosyasını hazırla - otomatik oynamadan
        setTimeout(() => {
            // İlk 3 sayfanın ses dosyalarını arka planda hazırla
            for (let i = 0; i < Math.min(3, talePages.length); i++) {
                const text = talePages[i];
                fetch('/generate_audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text, page: i })
                })
                .then(response => response.blob())
                .then(blob => {
                    taleAudios[i] = { blob: blob };
                    console.log(`Sayfa ${i+1} için ses dosyası arka planda yüklendi`);
                    
                    // Mevcut sayfa için ses hazırlanmışsa kontrolleri güncelle
                    if (i === currentPage) {
                        prepareAudioBlob(blob);
                    }
                })
                .catch(err => {
                    console.log(`Sayfa ${i+1} için ses yükleme hatası:`, err);
                });
            }
        }, 500);
        
        // 5 saniye sonra isFromLocalStorage'ı sıfırla (herhangi bir tutukluk olmasın diye)
        setTimeout(() => {
            window.isFromLocalStorage = false;
        }, 5000);
    }
    
    // Sunucudan yüklenen masalı gösterme
    function loadTaleFromServer(serverTale) {
        console.log("loadTaleFromServer çağrıldı:", serverTale);
        
        if (!serverTale || !serverTale.title) {
            showError('Sunucudan masal yüklenemedi.');
            return;
        }
        
        // Masal verisini oluştur
        taleData = {
            tale_title: serverTale.title,
            tale_text: serverTale.text,
            image_url: serverTale.image_url,
            isFavorite: serverTale.isFavorite || false
        };
        
        // Favorilere ekleme butonunu ayarla
        const favoriteButton = document.getElementById('favorite-button');
        if (favoriteButton) {
            favoriteButton.disabled = false;
            
            // Mevcut masal favori mi kontrol et
            const isFavorite = serverTale.isFavorite || serverTale.type === 'favorites';
            taleData.isFavorite = isFavorite;
            
            favoriteButton.innerHTML = isFavorite ? 
                '<i class="fas fa-heart"></i> Favorilerden Çıkar' : 
                '<i class="fas fa-heart"></i> Favorilere Ekle';
            
            // Favori butonunun sınıfını güncelle
            if (isFavorite) {
                favoriteButton.classList.add('active');
            } else {
                favoriteButton.classList.remove('active');
            }
        }
        
        // Eğer sunucuda sayfalar varsa onları kullan
        if (serverTale.pages && serverTale.pages.length > 0) {
            // Sayfaları yükle
            talePages = serverTale.pages.map(page => page.text);
            totalPages = talePages.length;
            
            // Sayfa görsellerini yükle
            taleImages = serverTale.pages.map((page, index) => {
                return {
                    page: index,
                    url: page.image_url || 'static/img/default-tale.jpg',
                    alt: `${serverTale.title} - Sayfa ${index + 1}`,
                    loaded: Boolean(page.image_url)
                };
            });
            
            // Ses dosyalarını yükle
            if (serverTale.pages.some(page => page.audio_url)) {
                taleAudios = {};
                serverTale.pages.forEach((page, index) => {
                    if (page.audio_url) {
                        fetch(page.audio_url)
                        .then(response => response.blob())
                        .then(blob => {
                            taleAudios[index] = { blob: blob };
                        })
                        .catch(error => {
                            console.error(`Sayfa ${index + 1} ses dosyası yüklenemedi:`, error);
                        });
                    }
                });
            }
            
            // Sayfa göstergesini güncelle
            document.getElementById('current-page').textContent = '1';
            document.getElementById('total-pages').textContent = totalPages;
        } else {
            // Sayfalanmış içerik yoksa, tam metni sayfalara böl
            preparePagedContent(serverTale.text, serverTale.title);
            
            // İlk sayfa görseli
            if (serverTale.image_url) {
                taleImages[0] = {
                    page: 0,
                    url: serverTale.image_url,
                    alt: `${serverTale.title} - Sayfa 1`,
                    loaded: true
                };
            }
        }
        
        // İlk sayfayı göster
        displayPage(0);
        
        // Sayfaları hazırla ve göster
        updatePageNavigation();
        showTalePage();
    }
    
    // Yükleme göstergesi ve hata mesajı fonksiyonları
    function showLoading(show, message = 'Masal oluşturuluyor...') {
        const loadingElement = document.getElementById('loading');
        const loadingMessage = document.getElementById('loading-message');
        
        if (!loadingElement || !loadingMessage) {
            log('Yükleme göstergesi elemanları bulunamadı!');
            return;
        }
        
        // Özel durum: Eğer favorilerden veya geçmişten bir masal yüklenmişse 
        // ve URL yoksa (sunucudan değil lokalden okunuyorsa), yükleme göstergesini gösterme
        if (show && window.isFromLocalStorage) {
            log('Lokalden yükleme yapıldığı için yükleme göstergesi atlanıyor');
            return;
        }
        
        if (show) {
            log('Yükleme göstergesi gösteriliyor:', message);
            loadingMessage.textContent = message;
            loadingElement.style.display = 'flex';
            
            // Sayfanın kaydırılmasını engelle
            document.body.style.overflow = 'hidden';
        } else {
            log('Yükleme göstergesi gizleniyor');
            loadingElement.style.display = 'none';
            
            // Sayfanın kaydırılmasına izin ver
            document.body.style.overflow = '';
        }
    }
    
    function showError(message, type = 'error') {
        log('Mesaj gösteriliyor:', message, type);
        const errorElement = document.getElementById('error-message');
        if (!errorElement) {
            log('Mesaj elemanı bulunamadı!');
            return;
        }
        
        // Mesaj tipine göre sınıf ayarla
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Stil ayarla
        if (type === 'success') {
            errorElement.style.backgroundColor = '#28a745';  // yeşil
        } else {
            errorElement.style.backgroundColor = '#dc3545';  // kırmızı
        }
        
        // Mesaja kaydır
        errorElement.scrollIntoView({ behavior: 'smooth' });
        
        // 3 saniye sonra mesajı kaldır
        setTimeout(function() {
            errorElement.style.display = 'none';
        }, 3000);
    }
    
    function hideError() {
        const errorElement = document.getElementById('error-message');
        if (!errorElement) {
            log('Mesaj elemanı bulunamadı!');
            return;
        }
        
        errorElement.style.display = 'none';
    }
    
    // Ses çalar kontrollerini ayarla
    setupAudioPlayerControls();
    
    // Sayfa yüklendiğinde tema tercihini yükle
    loadSavedTheme();
});
