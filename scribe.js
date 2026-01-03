// ==================================================================================
// 模块: Scribe (书记员 - v5.0 Auto-GC)
// ==================================================================================
(function () {
    const MAX_MESSAGES = 20; // 每个角色保留最近20条
    
    // 兼容不同版本的 Characters 获取方式
    function getCharacters() {
        return window.characters || (window.SillyTavern && window.SillyTavern.characters) || {};
    }

    // 构建短信内容文本
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

    // 基础 API 请求封装
    async function apiFetch(url, body) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: url,
                data: JSON.stringify(body),
                contentType: 'application/json',
                headers: { 'X-CSRF-Token': window.csrf_token },
                success: function(data) { resolve(data); },
                error: function(jqXHR) { reject(new Error(`API Error: ${jqXHR.status}`)); }
            });
        });
    }

    // 获取世界书列表
    async function fetchWorldBookList() {
        try {
            if (typeof window.world_names !== 'undefined' && Array.isArray(window.world_names)) return window.world_names;
            const select = document.querySelector('#world_editor_select');
            if (select && select.options.length > 0) {
                return Array.from(select.options)
                    .map(o => (o.innerText || o.text || "").trim())
                    .filter(v => v && v !== "Select World Info" && v !== "None");
            }
        } catch(e) {}
        return [];
    }

    // 生成唯一ID
    function generateUUID() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(); 
    }

    // 创建标准条目结构
    function createEntry(contactName, comment, content) {
        return {
            uid: generateUUID(), 
            key: [contactName], 
            keys: [contactName],
            comment: comment,
            content: content,
            enabled: true,
            
            // 【核心配置：强制高优先级注入】
            position: 4, // 4 = @D (At Depth)
            depth: 3,    // 深度 3
            role: 0,     // 0 = System
            
            preventRecursion: true,
            constant: false,
            selectiveLogic: 0,
            order: 100, 
            priority: 100,
            
            // 兼容性配置 (Extensions)
            extensions: {
                position: 4,
                depth: 3,
                role: 0,
                prevent_recursion: true,
                exclude_recursion: true
            }
        };
    }

    // ==============================================================================
    // 核心同步逻辑 (包含 GC)
    // ==============================================================================
    async function performSync(contacts) {
        // contacts 是当前的“活跃名单”，也就是 core.js 扫描到的有效联系人列表
        // 如果 contacts 为空，说明没有任何短信，我们应该清空世界书里的相关条目

        let targetBookName = window.ST_PHONE.config.targetWorldBook;
        let isEmbedded = false;
        let charId = null;
        const context = SillyTavern.getContext();
        const chars = getCharacters();

        // 1. 确定目标世界书
        if (!targetBookName && context.characterId) {
            charId = context.characterId;
            const char = chars[charId];
            if (char && char.data && char.data.character_book) {
                const bookRef = char.data.character_book;
                if (typeof bookRef === 'object') {
                    isEmbedded = true; 
                    targetBookName = "Embedded_Book"; 
                } else if (typeof bookRef === 'string' && bookRef.trim() !== '') {
                    targetBookName = bookRef;
                }
            }
        }

        if (!targetBookName) return;

        // 2. 获取世界书数据对象
        let bookObj = null;
        if (isEmbedded) {
            const char = chars[charId];
            if (!char.data.character_book) char.data.character_book = { entries: [] };
            bookObj = char.data.character_book;
        } else {
            try {
                const res = await apiFetch('/api/worldinfo/get', { name: targetBookName });
                if (!res) return;
                bookObj = res;
            } catch(e) { return; }
        }

        if (!bookObj.entries) bookObj.entries = [];
        
        // 3. 预处理：构建“活跃状态映射” (The Target State)
        // 我们需要达到的目标：只有这些 comment 存在，且内容最新
        const activeEntriesMap = new Map(); // Key: comment, Value: { content, name }
        
        if (contacts && Array.isArray(contacts)) {
            contacts.forEach(contact => {
                const content = buildContent(contact);
                // 只有当有内容时才视为活跃（buildContent 会处理空消息的情况）
                if (content) {
                    const comment = `ST_PHONE_SMS::${contact.name}`;
                    activeEntriesMap.set(comment, {
                        content: content,
                        name: contact.name
                    });
                }
            });
        }

        let modified = false;
        const entriesCollection = bookObj.entries;
        const isDict = !Array.isArray(entriesCollection);

        // ==========================================================================
        // 4. 执行“全量调和” (Reconciliation & GC)
        // ==========================================================================
        
        if (isDict) {
            // --- 字典模式处理 (Object) ---
            const uidsToDelete = [];
            
            // A. 遍历现有条目：更新 或 标记删除
            for (const uid in entriesCollection) {
                const entry = entriesCollection[uid];
                // 仅处理属于本插件的条目
                if (entry.comment && entry.comment.startsWith('ST_PHONE_SMS::')) {
                    if (activeEntriesMap.has(entry.comment)) {
                        // [Case 1] 存活：更新内容
                        const newData = activeEntriesMap.get(entry.comment);
                        
                        // 检查内容变更
                        if (entry.content !== newData.content) {
                            entry.content = newData.content;
                            entry.enabled = true;
                            modified = true;
                        }
                        // 强制修正属性 (防篡改)
                        if (entry.position !== 4) { entry.position = 4; modified = true; }
                        if (entry.depth !== 3) { entry.depth = 3; modified = true; }
                        
                        // 标记为已处理，防止后续重复创建
                        activeEntriesMap.delete(entry.comment); 
                    } else {
                        // [Case 2] 死亡：活跃列表里没有它了 -> 杀！
                        // console.log(`📱 GC: 正在移除过时条目 ${entry.comment}`);
                        uidsToDelete.push(uid);
                        modified = true;
                    }
                }
            }

            // 执行删除
            uidsToDelete.forEach(uid => delete entriesCollection[uid]);

            // B. 处理剩余的新增条目 (Create)
            activeEntriesMap.forEach((data, comment) => {
                const newEntry = createEntry(data.name, comment, data.content);
                entriesCollection[newEntry.uid] = newEntry;
                modified = true;
            });

        } else {
            // --- 数组模式处理 (Array) ---
            const newEntriesList = [];
            
            // A. 遍历现有条目
            entriesCollection.forEach(entry => {
                if (entry.comment && entry.comment.startsWith('ST_PHONE_SMS::')) {
                    if (activeEntriesMap.has(entry.comment)) {
                        // [Case 1] 存活：更新并保留
                        const newData = activeEntriesMap.get(entry.comment);
                        
                        if (entry.content !== newData.content) {
                            entry.content = newData.content;
                            entry.enabled = true;
                            modified = true;
                        }
                        // 属性修正
                        if (entry.position !== 4) { entry.position = 4; modified = true; }
                        
                        newEntriesList.push(entry);
                        // 标记已处理
                        activeEntriesMap.delete(entry.comment);
                    } else {
                        // [Case 2] 死亡：不加入 newEntriesList，即为删除
                        // console.log(`📱 GC: (Array) 丢弃过时条目 ${entry.comment}`);
                        modified = true;
                    }
                } else {
                    // [Case 3] 路人：非本插件条目，原样保留
                    newEntriesList.push(entry);
                }
            });

            // B. 追加新增条目
            activeEntriesMap.forEach((data, comment) => {
                const newEntry = createEntry(data.name, comment, data.content);
                newEntriesList.push(newEntry);
                modified = true;
            });

            // 如果发生了删除或新增，替换原数组
            if (modified) {
                bookObj.entries = newEntriesList;
            }
        }

        // 5. 保存更改
        if (modified) {
            console.log('📱 ST-Phone: 世界书已同步 (含GC清理)');
            if (isEmbedded) {
                if (SillyTavern.saveCharacterDebounced) SillyTavern.saveCharacterDebounced(charId);
                else if (SillyTavern.saveCharacter) SillyTavern.saveCharacter(charId);
            } else {
                await apiFetch('/api/worldinfo/edit', { name: targetBookName, data: bookObj });
                // 刷新编辑器UI
                try {
                    const editorSelect = document.getElementById('world_editor_select');
                    if (editorSelect && editorSelect.value === targetBookName) {
                        const loadFunc = window.loadWorldInfo || (SillyTavern && SillyTavern.loadWorldInfo);
                        if (typeof loadFunc === 'function') loadFunc(targetBookName);
                    }
                } catch(err) {}
            }
        }
    }

    // 暴露接口
    window.ST_PHONE.scribe = {
        sync: function(contacts) {
            performSync(contacts);
        },
        getWorldBookList: fetchWorldBookList, 
        forceSync: () => performSync(window.ST_PHONE.state.contacts)
    };
})();
