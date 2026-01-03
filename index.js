// ==================================================================================
// 脚本名称: ST-iOS-Phone Loader (v3.0 Final - Persistence & Lifecycle)
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
    
    const modules = ["config.js", "view.js", "core.js"];

    // 1. 初始化全局命名空间
    window.ST_PHONE = window.ST_PHONE || {
        state: {
            contacts: [],
            activeContactId: null,
            isPhoneOpen: false,
            isDragging: false,
            unreadIds: new Set()
        },
        ui: {},     
        config: {}, // 这里稍后会由 config.js 填充
        path: EXTENSION_PATH 
    };

    // 辅助：加载脚本
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
        console.log('📱 ST-iOS-Phone: 系统启动中...');

        // 2. 按顺序加载模块
        // A. 先加载 config.js (获取表情包等静态数据)
        await loadScript("config.js");

        // B. 关键步骤：读取本地存储的用户偏好 (LocalStorage)
        // 我们将其合并到 config 对象中，覆盖默认值
        try {
            const savedPrefsStr = localStorage.getItem('ST_PHONE_PREFS');
            if (savedPrefsStr) {
                const savedPrefs = JSON.parse(savedPrefsStr);
                // 合并配置：保留 config.js 的贴图，注入 savedPrefs 的 targetWorldBook
                Object.assign(window.ST_PHONE.config, savedPrefs);
                console.log('📱 [System] 已加载用户偏好设置:', savedPrefs);
            }
        } catch (e) {
            console.error('📱 [System] 读取配置失败:', e);
        }

        // C. 加载剩余模块 (View, Core, Scribe)
        // 注意：View 加载完后，DOM 元素才存在
        for (let i = 1; i < modules.length; i++) {
            await loadScript(modules[i]);
        }

        console.log('📱 ST-iOS-Phone: 系统启动成功！所有模块已就绪。');

    } catch (err) {
        console.error('📱 ST-iOS-Phone: 启动中断', err);
    }
})();
