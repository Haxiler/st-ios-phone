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

    // --- 初始化全局单例 ---
    window.ST_PHONE = window.ST_PHONE || {
        // 1. 全局状态 Store (单一数据源)
        store: {
            contacts: [],        // 联系人列表
            activeContactId: null,
            isPhoneOpen: false,
            isDragging: false,
            unreadIds: new Set(),
            pendingQueue: [],    // 待发送队列
            virtualTime: "",     // 当前虚拟时间
            systemConfig: {}     // 配置缓存
        },
        
        // 2. 简单的事件总线 (发布/订阅)
        events: new EventTarget(),
        emit: function(eventName, detail) {
            this.events.dispatchEvent(new CustomEvent(eventName, { detail }));
        },
        on: function(eventName, callback) {
            this.events.addEventListener(eventName, (e) => callback(e.detail));
        },

        // 3. 模块挂载点
        ui: {},     
        config: {}, 
        scribe: {}, 
        core: {},
        path: EXTENSION_PATH 
    };

    /**
     * 增强型脚本加载器
     */
    function loadScript(filename, isModule = false) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // 添加时间戳防止缓存，但在生产环境可以去掉
            script.src = EXTENSION_PATH + filename + '?v=' + Date.now();
            if (isModule) script.type = "module";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${filename}`));
            document.head.appendChild(script);
        });
    }

    try {
        console.log('📱 ST-iOS-Phone: 正在初始化 v4.0 内核...');
        
        // 按依赖顺序加载
        await loadScript("config.js"); // 配置先行
        
        // 恢复用户偏好
        try {
            const savedPrefs = localStorage.getItem('ST_PHONE_PREFS');
            if (savedPrefs) {
                Object.assign(window.ST_PHONE.config, JSON.parse(savedPrefs));
            }
        } catch (e) { console.error('Pref load error', e); }

        await loadScript("view.js");   // UI 库
        await loadScript("core.js");   // 核心逻辑
        await loadScript("scribe.js", true); // 书记员 (ES Module)

        // 等待酒馆环境就绪
        const waitForST = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                clearInterval(waitForST);
                console.log('📱 ST-iOS-Phone: 酒馆环境就绪，启动服务');
                window.ST_PHONE.emit('ready'); // 触发启动事件
            }
        }, 500);

    } catch (err) {
        console.error('📱 ST-iOS-Phone: 致命错误 - 启动失败', err);
    }
})();
