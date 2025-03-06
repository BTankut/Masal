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
    const audioPlayerContainer = document.getElementById('audio-player-container');
    
    let currentPage = 0;
    let taleData = null;
    let talePages = [];
    let taleImages = [];
    let taleAudios = {}; // Sayfa ses dosyalarını saklamak için obje
    let totalPages = 0;
    let taleHistory = [];
    const MAX_HISTORY = 5;
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
            
            // İlk sayfayı göster
            displayPage(0);
            
            // Her sayfa için kendi resmi olacak şekilde düzenleme yapalım
            // İlk sayfa için zaten resim geldi, diğer sayfalar için API çağrıları yapalım
            if (talePages.length > 1) {
                console.log(`${talePages.length} sayfa için görseller oluşturuluyor...`);
                
                // İlk sayfa resmi zaten var, onu kaydedelim
                taleImages[0] = {
                    page: 0,
                    url: data.image_url,
                    alt: `${data.tale_title} - Sayfa 1`,
                    loaded: true
                };
                
                // Diğer sayfalar için resimler oluşturalım (1. indeksten başlayarak)
                // Zaman gecikmesi ekleyerek API çağrılarını sıralı yapalım
                for (let i = 1; i < talePages.length; i++) {
                    // Her sayfa için 2 saniye gecikmeyle resim oluştur
                    setTimeout(() => {
                        console.log(`Sayfa ${i+1} resmi için API çağrısı yapılıyor...`);
                        generateImageForPage(i, talePages[i], data.tale_title, {
                            character_name: characterName,
                            character_type: characterType, 
                            setting: setting,
                            image_api: imageApi
                        });
                    }, i * 2000); // Her bir sayfa için 2 saniye gecikme 
                }
            }
            
            // Tüm resimler yüklendikten sonra sayfayı göster
            Promise.all(taleImages.map(img => {
                return new Promise((resolve, reject) => {
                    const imgElement = new Image();
                    imgElement.onload = () => resolve();
                    imgElement.onerror = () => {
                        log('Resim yüklenemedi:', img);
                        // Hata durumunda varsayılan resim kullan
                        img.url = 'static/img/default-tale.jpg';
                        resolve();
                    };
                    imgElement.src = img.url;
                });
            }))
            .then(() => {
                // Yükleme göstergesini gizle
                showLoading(false);
                
                // Masal sayfasına geç
                showTalePage();
                
                // Masalı geçmişe ekle
                addTaleToHistory(data);
            })
            .catch(error => {
                log('Resim yükleme hatası', error);
                showLoading(false);
                showTalePage();
                addTaleToHistory(data);
            });
            
            // Resim yüklenmesi çok uzun sürerse timeout ekle
            setTimeout(function() {
                showLoading(false);
                showTalePage();
                addTaleToHistory(data);
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
    
    // Sayfa için görsel oluşturma
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
            } else {
                console.warn(`Sayfa ${pageIndex + 1} için görsel oluşturulamadı, varsayılan resim kullanılacak`);
            }
        })
        .catch(error => {
            console.error(`Sayfa ${pageIndex + 1} görseli oluşturma hatası:`, error);
            
            // 3 saniye sonra yeniden dene - özellikle 3 ve 5. sayfalar için
            if (pageIndex === 2 || pageIndex === 4) {
                console.log(`Sayfa ${pageIndex + 1} için yeniden deneniyor...`);
                setTimeout(() => {
                    generateImageForPage(pageIndex, pageText, title, characterInfo);
                }, 3000);
            }
            
            // Hata durumunda varsayılan resim kullanılmaya devam eder
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
    
    // İstenen sayfayı göster
    function displayPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= totalPages) {
            log('Geçersiz sayfa numarası:', pageIndex);
            return;
        }
        
        currentPage = pageIndex;
        log(`Sayfa gösteriliyor: ${pageIndex + 1}/${totalPages}`);
        
        // Sayfadaki metni göster
        document.getElementById('tale-text').textContent = talePages[pageIndex];
        
        // Sayfanın resmini göster
        const taleImage = document.getElementById('tale-image');
        taleImage.src = taleImages[pageIndex].url;
        taleImage.alt = taleImages[pageIndex].alt;
        
        // Sayfa göstergelerini güncelle
        updatePageNavigation();
    }
    
    // Sayfa değiştirme butonlarına tıklama olayları
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 0) {
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
            displayPage(newPage);
            
            // Eğer sesli okuma aktifse, yeni sayfa için ses dosyasını çal
            if (document.getElementById('audio-player-container').style.display === 'block') {
                log("Önceki sayfaya geçildi, yeni ses dosyası yükleniyor...");
                setTimeout(() => readTaleAloud(), 100);
            }
        }
    });
    
    document.getElementById('next-page').addEventListener('click', function() {
        if (currentPage < totalPages - 1) {
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
            displayPage(newPage);
            
            // Eğer sesli okuma aktifse, yeni sayfa için ses dosyasını çal
            if (document.getElementById('audio-player-container').style.display === 'block') {
                log("Sonraki sayfaya geçildi, yeni ses dosyası yükleniyor...");
                setTimeout(() => readTaleAloud(), 100);
            }
        }
    });
    
    // Yeni masal butonuna tıklama
    newTaleButton.addEventListener('click', function() {
        showSettingsPage();
    });
    
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
                images: taleImages.map(img => img.url) || []
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
    function readTaleAloud() {
        if (!taleData || !talePages || talePages.length === 0) {
            showError('Okunacak masal bulunamadı.');
            return;
        }
        
        // Konsola debug bilgisi yazdır
        console.log("------------------------------");
        console.log(`readTaleAloud() çağrıldı - Şu anki sayfa: ${currentPage + 1}`);
        console.log(`Mevcut sayfanın metni: ${talePages[currentPage].substring(0, 30)}...`);
        console.log("Önbellekteki ses dosyaları:", Object.keys(taleAudios).map(page => `Sayfa ${parseInt(page) + 1}`));
        
        // Şu anki sayfadaki metni oku
        const text = talePages[currentPage];
        
        // Öncelikle, bu sayfa için zaten oluşturulmuş bir ses dosyası var mı kontrol et
        if (taleAudios[currentPage] && taleAudios[currentPage].blob) {
            console.log(`Sayfa ${currentPage + 1} için önbellekte ses dosyası bulundu, doğrudan oynatılıyor`);
            playAudioFromBlob(taleAudios[currentPage].blob);
            return;
        }
        
        console.log(`Sayfa ${currentPage + 1} için önbellekte ses dosyası bulunamadı, yeni oluşturuluyor`);
        
        // Yeni ses dosyası oluştur
        showLoading(true, "Ses dosyası oluşturuluyor...");
        
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
            playAudioFromBlob(blob);
        })
        .catch(error => {
            log("Ses oluşturma hatası", error);
            showError("Ses oluşturma hatası: " + error.message);
            showLoading(false);
        });
    }
    
    // Ses blobu üzerinden oynatma
    function playAudioFromBlob(blob) {
        // Daha önce bir ses çalıyorsa durdur ve temizle
        stopAudioPlayback();
        
        console.log(`playAudioFromBlob çağrıldı - Şu anki sayfa: ${currentPage + 1}, blob boyutu: ${blob.size} bytes`);
        
        // Audio elementini oluştur
        audioURL = URL.createObjectURL(blob);
        audioPlayer = new Audio(audioURL);
        
        // Audio nesnesinin sayfa bilgisini kaydet - bu daha sonra debug için yararlı olacak
        audioPlayer.dataset.page = currentPage;
        
        console.log(`Ses URL'si oluşturuldu: ${audioURL}`);
        
        // Ses çalar kontrol panelini göster
        document.getElementById('audio-player-container').style.display = 'block';
        
        // Oynatma butonunu güncelle
        document.getElementById('audio-play-pause').innerHTML = '<i class="fas fa-pause"></i>';
        
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
            showError("Ses çalınamadı");
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
        };
        
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
        
        // Masalı sayfalara böl
        preparePagedContent(taleData.tale_text, taleData.tale_title);
        
        // İlk sayfa için görsel ekle
        if (tale.image) {
            taleImages[0] = {
                page: 0,
                url: tale.image,
                alt: `${taleData.tale_title} - Sayfa 1`,
                loaded: true
            };
        }
        
        // İlk sayfayı göster
        displayPage(0);
        
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
    
    // Ses çalar kontrollerini ayarla
    setupAudioPlayerControls();
    
    // Sayfa yüklendiğinde tema tercihini yükle
    loadSavedTheme();
});
