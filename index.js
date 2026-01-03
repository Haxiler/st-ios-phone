// ==================================================================================
// 脚本名称: ST-iOS-Phone Loader (v3.1 Module Support)
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
    
    // 初始化全局对象
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

    /**
     * 加载脚本函数 (升级版)
     * @param {string} filename - 文件名
     * @param {boolean} isModule - 是否作为 ES Module 加载 (允许使用 import)
     */
    function loadScript(filename, isModule = false) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = EXTENSION_PATH + filename + '?v=' + Date.now();
            
            // 【关键改动】标记为模块，开启 import 能力
            if (isModule) {
                script.type = "module";
            }
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${filename}`));
            document.head.appendChild(script);
        });
    }

    try {
        console.log('📱 ST-iOS-Phone: 开始加载组件...');
        
        // 1. 加载常规脚本
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
        
        // 2. 【核心升级】加载 Scribe (书记员) 为 Module
        // 只有这样，scribe.js 才能使用 import { saveWorldInfo } ...
        await loadScript("scribe.js", true);

        // 3. 绑定设置界面事件
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
        
        console.log('📱 ST-iOS-Phone: 系统启动成功');
        document.dispatchEvent(new Event('st-phone-ready'));

    } catch (err) {
        console.error('📱 ST-iOS-Phone: 启动失败', err);
    }
})();
