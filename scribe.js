// ==================================================================================
// 模块: Scribe (书记员 - v3.0 Memory-First Sync)
// ==================================================================================
(function () {

    const MAX_MESSAGES = 30; // 仅保留最近 30 条短信，避免上下文爆炸

    const state = {
        lastSnapshot: {},
        syncing: false,
        debounceTimer: null
    };

    // 获取 CSRF Token (ST 1.14+ 安全要求)
    function getCsrfToken() {
        if (typeof window.csrf_token !== 'undefined') return window.csrf_token;
        // 尝试从 meta 标签获取 (备用)
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // 构建短信内容的文本块
    function buildContent(contact) {
        if (!contact.messages || contact.messages.length === 0) return '';
        
        const msgs = contact.messages.slice(-MAX_MESSAGES);
        let out = `【手机短信记录｜${contact.name}】\n\n`;
        out += `以下是 {{user}} 与 ${contact.name} 之间的近期手机短信记录，仅在短信交流时用于回忆上下文。\n\n`;
        msgs.forEach(m => {
            const who = m.sender === 'user' ? '我' : contact.name;
            out += `(${m.timeStr}) ${who}：${m.text}\n`;
        });
        return out.trim();
    }

    // 核心同步逻辑
    async function performSync(contacts) {
        if (!contacts || !contacts.length) return;
        
        // 1. 确定目标世界书
        // 优先读取用户在手机设置里选的，如果没有，则尝试获取当前角色绑定的书
        let targetBookName = window.ST_PHONE.config.targetWorldBook;
        let isEmbedded = false;
        let charId = null;

        const context = SillyTavern.getContext();
        
        // 如果没有手动指定，尝试自动匹配当前角色的绑定书
        if (!targetBookName && context.characterId) {
            charId = context.characterId;
            const char = SillyTavern.characters[charId];
            if (char && char.data && char.data.character_book) {
                // 判断是内嵌书还是引用的全局书
                // 1.14 中 data.character_book 可能是对象(内嵌)或字符串(全局引用)
                if (typeof char.data.character_book === 'object') {
                    // 内嵌书没有名字，我们标记为 Embedded
                    isEmbedded = true; 
                    targetBookName = "Embedded_Book"; // 占位符
                } else {
                    targetBookName = char.data.character_book;
                }
            }
        }

        if (!targetBookName && !isEmbedded) return; // 没地儿存，直接放弃

        // 2. 构建数据快照
        // 将所有联系人的记录合并，或者按联系人存。这里我们合并到一个大条目，或者每人一个条目？
        // 原版逻辑是：一个联系人对应一个条目。
        let modified = false;

        // ==========================================================
        // 分支 A: 修改内嵌世界书 (Memory Access - 高效)
        // ==========================================================
        if (isEmbedded && charId) {
            const char = SillyTavern.characters[charId];
            let book = char.data.character_book;
            
            // 确保 entries 存在
            if (!book.entries) book.entries = [];

            contacts.forEach(contact => {
                const comment = `ST_PHONE_SMS::${contact.name}`;
                const content = buildContent(contact);
                if (!content) return;

                let entry = book.entries.find(e => e.comment === comment);
                if (!entry) {
                    // 创建新条目
                    entry = createEntry(contact.name, comment, content);
                    book.entries.push(entry);
                    modified = true;
                } else if (entry.content !== content) {
                    // 更新条目
                    entry.content = content;
                    // 确保它处于启用状态
                    if (!entry.enabled) entry.enabled = true;
                    modified = true;
                }
            });

            if (modified) {
                console.log('📱 [Scribe] Updating embedded world book for character:', charId);
                // 调用 ST 内部保存函数
                // 1.14+ 通常有 saveCharacterDebounced 或 saveCharacter
                if (SillyTavern.saveCharacterDebounced) {
                    SillyTavern.saveCharacterDebounced(charId);
                } else if (SillyTavern.saveCharacter) {
                    SillyTavern.saveCharacter(charId);
                }
            }
        } 
        
        // ==========================================================
        // 分支 B: 修改全局世界书 (API Access - 兼容)
        // ==========================================================
        else if (targetBookName) {
            // 先尝试从 API 获取最新数据
            try {
                const res = await apiFetch('/api/worldinfo/get', { name: targetBookName });
                if (!res || !res.entries) return; // 书不存在

                const book = res;
                if (!Array.isArray(book.entries)) book.entries = [];

                contacts.forEach(contact => {
                    const comment = `ST_PHONE_SMS::${contact.name}`;
                    const content = buildContent(contact);
                    if (!content) return;

                    let entry = book.entries.find(e => e.comment === comment);
                    if (!entry) {
                        entry = createEntry(contact.name, comment, content);
                        book.entries.push(entry);
                        modified = true;
                    } else if (entry.content !== content) {
                        entry.content = content;
                        entry.enabled = true;
                        modified = true;
                    }
                });

                if (modified) {
                    console.log('📱 [Scribe] Updating global world book:', targetBookName);
                    await apiFetch('/api/worldinfo/edit', { name: targetBookName, data: book });
                }
            } catch (e) {
                console.warn('📱 [Scribe] Failed to sync global world book:', e);
            }
        }
    }

    // 辅助：创建标准 World Info 条目结构
    function createEntry(contactName, comment, content) {
        return {
            uid: generateUUID(), // 使用自定义 UUID 生成，防止浏览器兼容问题
            comment: comment,
            enabled: true,
            constant: false, // 只有触发关键词时才激活，节省 Token
            depth: 2, // 插入深度，2 代表在聊天记录末尾附近
            priority: 100, // 较高优先级
            keys: [ // 触发关键词
                '<msg>', 
                '短信', 
                '手机', 
                contactName
            ],
            selectiveLogic: 0, // AND 逻辑
            secondary_keys: [],
            content: content
        };
    }

    // 辅助：API 请求封装
    async function apiFetch(url, body) {
        const headers = { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken() 
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    }

    // 辅助：简单的 UUID 生成
    function generateUUID() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // 暴露给外部的接口
    window.ST_PHONE.scribe = {
        sync: function(contacts) {
            // 防抖处理：每 2 秒最多触发一次保存，避免 IO 爆炸
            if (state.debounceTimer) clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                performSync(contacts);
            }, 2000);
        },

        // 获取当前所有世界书列表（用于设置页面）
        getWorldBookList: async function() {
            try {
                // 尝试直接读取内存中的全局列表
                if (SillyTavern.world_names && Array.isArray(SillyTavern.world_names)) {
                    return SillyTavern.world_names;
                }
                // 降级：API 获取
                const res = await apiFetch('/api/worldinfo/all', {});
                return res && res.world_names ? res.world_names : [];
            } catch {
                return [];
            }
        }
    };

    console.log('✅ ST-iOS-Phone: 书记员已就位 (v3.0 Memory-First)');

})();
