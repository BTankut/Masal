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
    const newTaleButton = document.getElementById('new-tale');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const backToSettingsButton = document.getElementById('back-to-settings');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleTale = document.getElementById('theme-toggle-tale');
    const taleHistoryContainer = document.getElementById('tale-history-container');
    const returnToTaleBtn = document.getElementById('return-to-tale');
    
    let currentPage = 0;
    let taleData = null;
    let taleHistory = [];
    const MAX_HISTORY = 5;
    
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
    
    // Sayfa yüklendiğinde geçmiş masalları yükle
    loadTaleHistory();
    
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
        
        // Debug için konsola yazdır
        log('settingsPage sınıfları:', settingsPage.className);
        log('talePage sınıfları:', talePage.className);
    }
    
    // Ayarlar sayfasına dönme butonu
    backToSettingsButton.addEventListener('click', showSettingsPage);
    
    // Masala dönme butonu
    returnToTaleBtn.addEventListener('click', function() {
        showTalePage();
    });
    
    // Ses efektleri için önden yükleme
    const soundEffects = {
        'aslan': new Audio('/static/sounds/lion_roar.mp3'),
        'kedi': new Audio('/static/sounds/cat_meow.mp3'),
        'köpek': new Audio('/static/sounds/dog_bark.mp3'),
        'kuş': new Audio('/static/sounds/bird_chirp.mp3'),
        'su': new Audio('/static/sounds/water_splash.mp3'),
        'gök gürültüsü': new Audio('/static/sounds/thunder.mp3'),
        'kapı': new Audio('/static/sounds/door_knock.mp3'),
        'gülme': new Audio('/static/sounds/laugh.mp3'),
        'ağlama': new Audio('/static/sounds/cry.mp3')
    };
    
    // Form gönderildiğinde AJAX ile işlem yapma
    generateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Form verilerini al
        const characterName = document.getElementById('character-name').value.trim();
        const characterType = document.getElementById('character-type').value.trim();
        const setting = document.getElementById('setting').value.trim();
        const theme = document.getElementById('theme').value.trim();
        const wordLimit = document.getElementById('word-limit').value.trim();
        const imageApi = document.getElementById('image-api').value.trim();
        
        // Form doğrulama
        if (!characterName || !characterType || !setting || !theme) {
            showError('Lütfen tüm alanları doldurun.');
            log('Form doğrulama hatası: Boş alanlar var');
            return;
        }
        
        try {
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
            
            log('API isteği gönderiliyor...', {
                character_name: characterName,
                character_type: characterType,
                setting: setting,
                theme: theme,
                word_limit: wordLimit,
                image_api: imageApi
            });
            
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
            
            // Masal verilerini kaydet
            taleData = data;
            log('Masal verileri kaydedildi', taleData);
            
            // Masal sayfasını güncelle
            document.getElementById('tale-title').textContent = data.tale_title;
            document.getElementById('tale-text').textContent = data.tale_text;
            
            // Resmi güncelle
            const taleImage = document.getElementById('tale-image');
            if (data.image_url.startsWith('data:')) {
                taleImage.src = data.image_url;
                log('Resim veri URL kullanılarak yükleniyor');
            } else {
                // Belki URL'yi başka bir yerden alabilir
                taleImage.src = data.image_url;
                log('Resim normal URL kullanılarak yükleniyor');
            }
            taleImage.alt = data.tale_title;
            
            // Resim yüklenmesini bekle
            taleImage.onload = function() {
                log('Masal resmi yüklendi');
                
                // Yükleme göstergesini gizle
                showLoading(false);
                
                // Masal sayfasına geç
                showTalePage();
                
                // Masalı geçmişe ekle
                addTaleToHistory(data);
            };
            
            // Resim yüklenemezse
            taleImage.onerror = function() {
                log('Masal resmi yüklenemedi', { src: taleImage.src });
                showLoading(false);
                showError('Masal resmi yüklenemedi, ancak masal metni hazır.');
                
                // Resim olmadan da masal sayfasına geç
                showTalePage();
                
                // Masalı geçmişe ekle
                addTaleToHistory(data);
            };
            
            // Resim yüklenmesi çok uzun sürerse timeout ekle
            setTimeout(function() {
                if (taleImage.complete === false) {
                    log('Resim yükleme zaman aşımı');
                    taleImage.src = 'static/img/default-tale.jpg'; // Varsayılan resim
                    showLoading(false);
                    showTalePage();
                    addTaleToHistory(data);
                }
            }, 15000); // 15 saniye timeout
            
        } catch (error) {
            log('Masal oluşturma hatası', { error: error.message, stack: error.stack });
            showLoading(false);
            showError(`Masal oluşturulurken bir hata oluştu: ${error.message}`);
            showDebug(); // Hata durumunda debug konsolunu göster
        }
    });
    
    // Masalı geçmişe ekle
    function addTaleToHistory(tale) {
        // Geçmiş verilerini al
        let taleHistory = JSON.parse(localStorage.getItem('taleHistory') || '[]');
        
        // Yeni masalı ekle (en başa)
        taleHistory.unshift({
            title: tale.tale_title,
            text: tale.tale_text,
            image: tale.image_url,
            date: new Date().toISOString()
        });
        
        // Maksimum 10 masal sakla
        if (taleHistory.length > 10) {
            taleHistory = taleHistory.slice(0, 10);
        }
        
        // Geçmişi kaydet
        localStorage.setItem('taleHistory', JSON.stringify(taleHistory));
        
        log('Masal geçmişe eklendi');
    }
    
    // Önceki sayfa butonuna tıklama
    prevPageButton.addEventListener('click', function() {
        if (currentPage > 0) {
            displayTalePage(currentPage - 1);
        }
    });
    
    // Sonraki sayfa butonuna tıklama
    nextPageButton.addEventListener('click', function() {
        if (taleData && taleData.tale_sections && currentPage < taleData.tale_sections.length - 1) {
            displayTalePage(currentPage + 1);
        }
    });
    
    // Yeni masal butonuna tıklama
    newTaleButton.addEventListener('click', function() {
        showSettingsPage();
    });
    
    // Word olarak kaydet
    function saveWord() {
        if (!taleData || !taleData.tale_text) {
            showError('Kaydedilecek masal bulunamadı.');
            return;
        }
        
        showLoading(true);
        
        fetch('/save_word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tale_text: taleData.tale_text,
                images: taleData.images || []
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
    saveButton.addEventListener('click', saveWord);
    
    // Sesli oku
    function readTaleAloud() {
        if (!taleData || !taleData.tale_sections || !taleData.tale_sections[currentPage]) {
            showError('Okunacak masal bulunamadı.');
            return;
        }
        
        const text = taleData.tale_sections[currentPage];
        showLoading(true);
        
        fetch('/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text
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
            const audio = new Audio(url);
            audio.play();
            showLoading(false);
        })
        .catch(error => {
            log('Hata:', { error: error.message, stack: error.stack });
            showError('Sesli okuma sırasında bir hata oluştu: ' + error.message);
            showLoading(false);
        });
    }
    
    // Sesli okuma butonuna tıklama
    document.getElementById('read-tale').addEventListener('click', function() {
        readTaleAloud();
    });
    
    // Masal geçmişi fonksiyonları
    function loadTaleHistory() {
        const savedHistory = localStorage.getItem('taleHistory');
        if (savedHistory) {
            try {
                taleHistory = JSON.parse(savedHistory);
                updateTaleHistoryUI();
            } catch (e) {
                log('Geçmiş yüklenirken hata oluştu:', { error: e.message, stack: e.stack });
                taleHistory = [];
            }
        }
    }
    
    function updateTaleHistoryUI() {
        if (!taleHistoryContainer) return;
        
        if (taleHistory.length === 0) {
            taleHistoryContainer.innerHTML = '<p class="empty-history">Henüz masal geçmişi yok.</p>';
            return;
        }
        
        let historyHTML = '';
        
        taleHistory.forEach(tale => {
            historyHTML += `
                <div class="history-item" data-id="${tale.id}">
                    <div class="history-item-info">
                        <h4>${tale.theme}</h4>
                        <p>Karakterler: ${tale.characters}</p>
                        <p class="history-date">${tale.date}</p>
                    </div>
                    <button class="btn btn-primary history-load-btn">
                        <i class="fas fa-book-open"></i>
                    </button>
                </div>
            `;
        });
        
        taleHistoryContainer.innerHTML = historyHTML;
        
        // Geçmiş masalları yükleme butonlarına olay dinleyicileri ekle
        const loadButtons = taleHistoryContainer.querySelectorAll('.history-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const historyItem = this.closest('.history-item');
                const taleId = parseInt(historyItem.getAttribute('data-id'));
                const tale = taleHistory.find(t => t.id === taleId);
                
                if (tale) {
                    loadTaleFromHistory(tale);
                }
            });
        });
    }
    
    function loadTaleFromHistory(tale) {
        if (!tale || !tale.data) {
            showError('Masal yüklenemedi.');
            return;
        }
        
        taleData = tale.data;
        currentPage = tale.currentPage || 0;
        
        displayTalePage(currentPage);
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
    
    function showError(message) {
        log('Hata mesajı gösteriliyor:', message);
        const errorElement = document.getElementById('error-message');
        if (!errorElement) {
            log('Hata mesajı elemanı bulunamadı!');
            return;
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hata mesajına kaydır
        errorElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    function hideError() {
        const errorElement = document.getElementById('error-message');
        if (!errorElement) {
            log('Hata mesajı elemanı bulunamadı!');
            return;
        }
        
        errorElement.style.display = 'none';
    }
    
    // Sayfa yüklendiğinde tema tercihini yükle
    loadSavedTheme();
});
