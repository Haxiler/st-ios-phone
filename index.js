// ==================================================================================
// 脚本名称: ST-iOS-Phone Loader (最终稳健版)
// 作用: 修复 currentScript 在 async 中失效的问题，确保 100% 找到路径
// ==================================================================================

// 1. 【关键】在进入异步逻辑前，立刻锁定当前脚本标签
// 必须放在文件最开头，不能放在 async function 里面！
var scriptTag = document.currentScript || (function() {
    // 备用方案：如果 currentScript 真的拿不到，就暴力遍历所有 script 标签找自己
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
    // 2. 检查是否成功定位
    if (!scriptTag) {
        console.error('❌ ST-iOS-Phone: 严重错误 - 无法定位插件安装路径。');
        alert('ST-iOS-Phone 启动失败：无法定位路径，请按 F12 查看控制台。');
        return;
    }

    // 3. 提取路径 (去掉结尾的 index.js，只保留文件夹路径)
    const fullUrl = scriptTag.src;
    const EXTENSION_PATH = fullUrl.substring(0, fullUrl.lastIndexOf('/') + 1);
    
    console.log(`📱 ST-iOS-Phone: 路径锁定 -> ${EXTENSION_PATH}`);

    // 4. 定义要加载的子模块
    const modules = [
        "config.js",  // 配置与表情包
        "view.js",    // 界面
        "core.js"     // 核心逻辑
    ];

    // 初始化全局变量
    window.ST_PHONE = window.ST_PHONE || {
        state: {
            contacts: [],
            activeContactId: null,
            isPhoneOpen: false,
            isDragging: false 
        },
        ui: {},     
        config: {}  
    };

    // 加载器函数
    function loadScript(filename) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // 加上时间戳 ?v=... 防止浏览器缓存旧代码
            script.src = EXTENSION_PATH + filename + '?v=' + Date.now();
            script.onload = () => {
                console.log(`   ✅ 模块就绪: ${filename}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`   ❌ 加载失败: ${filename}`);
                reject(new Error(`Failed to load ${filename}`));
            };
            document.head.appendChild(script);
        });
    }

    // 5. 开始依序加载
    try {
        console.log('📱 ST-iOS-Phone: 开始加载子模块...');
        for (const file of modules) {
            await loadScript(file);
        }
        console.log('📱 ST-iOS-Phone: 系统启动成功！');
    } catch (err) {
        console.error('📱 ST-iOS-Phone: 启动中断', err);
    }
})();
