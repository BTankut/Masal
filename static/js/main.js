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
        settingsPage.classList.add('active');
        talePage.classList.remove('active');
        
        // Eğer aktif bir masal varsa, masala dön butonunu göster
        if (taleData) {
            returnToTaleBtn.style.display = 'flex';
        } else {
            returnToTaleBtn.style.display = 'none';
        }
    }
    
    function showTalePage() {
        settingsPage.classList.remove('active');
        talePage.classList.add('active');
        
        // Debug için konsola yazdır
        console.log('showTalePage çağrıldı');
        console.log('settingsPage sınıfları:', settingsPage.className);
        console.log('talePage sınıfları:', talePage.className);
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
    generateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(generateForm);
        const theme = formData.get('theme');
        const characters = formData.get('characters');
        const wordLimit = formData.get('word_limit');
        const imageApi = formData.get('image_api');
        
        if (!theme || !characters || !wordLimit) {
            showError('Lütfen tüm alanları doldurun.');
            return;
        }
        
        generateTale(theme, characters, wordLimit, imageApi);
    });
    
    function generateTale(theme, characters, wordLimit, imageApi) {
        showLoading(true, 'Masal oluşturuluyor... Bu işlem biraz zaman alabilir.');
        hideError();
        
        // Fetch API'yi kullanarak sunucuya istek gönder
        fetch('/generate_tale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                theme: theme,
                characters: characters,
                word_limit: wordLimit,
                image_api: imageApi
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Sunucu hatası: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            taleData = data;
            currentPage = 0;
            
            // Masalı geçmişe ekle
            addTaleToHistory({
                id: Date.now(),
                theme: theme,
                characters: characters,
                date: new Date().toLocaleDateString('tr-TR'),
                data: data,
                currentPage: 0
            });
            
            displayTalePage(currentPage);
            showLoading(false);
            
            // Masal sayfasına geçiş - DOM'un güncellenmesi için setTimeout kullanıyoruz
            setTimeout(() => {
                showTalePage();
                console.log('Masal sayfası gösteriliyor...');
            }, 100);
        })
        .catch(error => {
            console.error('Hata:', error);
            showError('Masal oluşturulurken bir hata oluştu: ' + error.message);
            showLoading(false);
        });
    }
    
    function displayTalePage(pageIndex) {
        if (!taleData || !taleData.tale_sections || !taleData.images) {
            return;
        }
        
        // Sayfa sayısını güncelle
        currentPage = pageIndex;
        const totalPages = Math.min(taleData.tale_sections.length, taleData.images.length);
        
        // Sayfa göstergelerini güncelle
        currentPageElement.textContent = currentPage + 1;
        totalPagesElement.textContent = totalPages;
        
        // Sayfa butonlarını güncelle
        prevPageButton.disabled = currentPage === 0;
        nextPageButton.disabled = currentPage >= totalPages - 1;
        
        // Mevcut sayfanın metnini göster
        const pageText = taleData.tale_sections[currentPage];
        
        // Ses efektleri ile metni formatla
        const formattedText = formatTaleWithSoundEffects(pageText, taleData.sound_effects);
        taleTextElement.innerHTML = formattedText;
        
        // Ses efekti butonlarına olay dinleyicileri ekle
        attachSoundEffectListeners();
        
        // Mevcut sayfanın görselini göster
        if (taleData.images && taleData.images.length > currentPage) {
            const imageData = taleData.images[currentPage];
            taleImageElement.innerHTML = `<img src="data:image/png;base64,${imageData}" alt="Masal Görseli">`;
        } else {
            taleImageElement.innerHTML = '<div class="no-image">Görsel yüklenemedi</div>';
        }
        
        // Geçmişteki masalın mevcut sayfasını güncelle
        updateCurrentPageInHistory();
    }
    
    function formatTaleWithSoundEffects(text, soundEffects) {
        if (!soundEffects) return text;
        
        let formattedText = text;
        
        // Ses efekti anahtar kelimeleri için metni işle
        for (const keyword in soundEffects) {
            if (formattedText.includes(keyword)) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                formattedText = formattedText.replace(regex, `<span class="sound-effect" data-sound="${keyword}">${keyword}</span>`);
            }
        }
        
        return formattedText;
    }
    
    function attachSoundEffectListeners() {
        const soundEffectElements = document.querySelectorAll('.sound-effect');
        soundEffectElements.forEach(element => {
            element.addEventListener('click', function() {
                const keyword = this.getAttribute('data-sound');
                playSoundEffect(keyword);
            });
        });
    }
    
    function playSoundEffect(keyword) {
        if (soundEffects[keyword]) {
            soundEffects[keyword].currentTime = 0;
            soundEffects[keyword].play().catch(error => {
                console.error('Ses efekti oynatılamadı:', error);
            });
        }
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
            console.error('Hata:', error);
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
            console.error('Hata:', error);
            showError('Sesli okuma sırasında bir hata oluştu: ' + error.message);
            showLoading(false);
        });
    }
    
    // Sesli okuma butonuna tıklama
    document.getElementById('read-tale').addEventListener('click', function() {
        readTaleAloud();
    });
    
    // Masal geçmişi fonksiyonları
    function addTaleToHistory(tale) {
        // Önce mevcut geçmişi kontrol et
        const existingIndex = taleHistory.findIndex(item => item.id === tale.id);
        
        if (existingIndex !== -1) {
            // Varsa güncelle
            taleHistory[existingIndex] = tale;
        } else {
            // Yoksa ekle
            taleHistory.unshift(tale);
            
            // Maksimum geçmiş sayısını kontrol et
            if (taleHistory.length > MAX_HISTORY) {
                taleHistory.pop();
            }
        }
        
        // Geçmişi kaydet ve UI'ı güncelle
        saveTaleHistory();
        updateTaleHistoryUI();
    }
    
    function updateCurrentPageInHistory() {
        if (!taleData || taleHistory.length === 0) return;
        
        // Mevcut masalı geçmişte bul
        const currentTaleIndex = taleHistory.findIndex(tale => 
            tale.data && tale.data.tale_text === taleData.tale_text);
        
        if (currentTaleIndex !== -1) {
            taleHistory[currentTaleIndex].currentPage = currentPage;
            saveTaleHistory();
        }
    }
    
    function loadTaleHistory() {
        const savedHistory = localStorage.getItem('taleHistory');
        if (savedHistory) {
            try {
                taleHistory = JSON.parse(savedHistory);
                updateTaleHistoryUI();
            } catch (e) {
                console.error('Geçmiş yüklenirken hata oluştu:', e);
                taleHistory = [];
            }
        }
    }
    
    function saveTaleHistory() {
        localStorage.setItem('taleHistory', JSON.stringify(taleHistory));
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
    
    function showLoading(show, message = 'Masal oluşturuluyor...') {
        loadingElement.style.display = show ? 'flex' : 'none';
        
        // Yükleme mesajını göster/gizle
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
            loadingMessage.style.display = show ? 'block' : 'none';
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    // Sayfa yüklendiğinde tema tercihini yükle
    loadSavedTheme();
});
