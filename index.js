// ==================================================================================
// 脚本名称: ST-iOS-Phone Loader (v3.0 Lite)
// ==================================================================================
var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        if (src && (src.includes('st-ios-phone') || src.includes('iOS')) && src.endsWith('index.js')) {
            return scripts[i];
        }
    }
    return null;
})();

(async function () {
    if (!scriptTag) return;

    const fullUrl = scriptTag.src;
    const EXTENSION_PATH = fullUrl.substring(0, fullUrl.lastIndexOf('/') + 1);
    
    window.ST_PHONE = window.ST_PHONE || {
        state: {
            contacts: [],
            activeContactId: null,
            isPhoneOpen: false,
            isDragging: false,
            unreadIds: new Set(),
            pendingQueue: []
        },
        ui: {},     
        config: {}, 
        scribe: {}, 
        path: EXTENSION_PATH 
    };

    function loadScript(filename) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = EXTENSION_PATH + filename + '?v=' + Date.now();
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${filename}`));
            document.head.appendChild(script);
        });
    }

    try {
        await loadScript("config.js");
        try {
            const savedPrefsStr = localStorage.getItem('ST_PHONE_PREFS');
            if (savedPrefsStr) {
                const savedPrefs = JSON.parse(savedPrefsStr);
                Object.assign(window.ST_PHONE.config, savedPrefs);
            }
        } catch (e) {}

        await loadScript("view.js");
        await loadScript("core.js"); 
        await loadScript("scribe.js");

        const settingSelect = document.getElementById('setting-worldbook-select');
        if (settingSelect) {
            settingSelect.addEventListener('change', (e) => {
                const newPref = { targetWorldBook: e.target.value };
                if (window.ST_PHONE.config) {
                    window.ST_PHONE.config.targetWorldBook = e.target.value;
                }
                localStorage.setItem('ST_PHONE_PREFS', JSON.stringify(newPref));
            });
        }
        
        document.dispatchEvent(new Event('st-phone-ready'));

    } catch (err) {
        console.error('📱 ST-iOS-Phone: 启动失败', err);
    }
})();
