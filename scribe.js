// ==================================================================================
// 模块: Scribe (书记员 - v4.0 Custom Format)
// ==================================================================================
(function () {

    const MAX_MESSAGES = 30;

    const state = {
        debounceTimer: null
    };

    // ----------------------------------------------------------------------
    // 1. 内容格式化 (Format Upgrade)
    // ----------------------------------------------------------------------
    function buildContent(contact) {
        if (!contact.messages || contact.messages.length === 0) return '';
        const msgs = contact.messages.slice(-MAX_MESSAGES);
        
        let out = `【手机短信记录｜${contact.name}】\n\n`;
        out += `以下是 {{user}} 与 ${contact.name} 之间的近期手机短信记录，仅在短信交流时用于回忆上下文。\n\n`;
        
        msgs.forEach(m => {
            // 逻辑: 谁发的？
            // 如果 sender 是 'user'，则是 "{{user}} to 角色名"
            // 如果 sender 是 'char'，则是 "角色名 to {{user}}"
            const senderName = m.sender === 'user' ? '{{user}}' : contact.name;
            const receiverName = m.sender === 'user' ? contact.name : '{{user}}';
            
            // 格式: (12月07日 08:35) 阿诺 to {{user}}：内容
            out += `(${m.timeStr}) ${senderName} to ${receiverName}：${m.text}\n`;
        });
        
        return out.trim();
    }

    async function apiFetch(url, body) {
        // console.log(`🔍 [API] ${url}`); 
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: url,
                data: JSON.stringify(body),
                contentType: 'application/json',
                headers: { 'X-CSRF-Token': window.csrf_token },
                success: function(data) { resolve(data); },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error(`❌ [API Fail] ${url}`, jqXHR.status);
                    reject(new Error(`API Error: ${jqXHR.status}`));
                }
            });
        });
    }

    async function fetchWorldBookList() {
        let names = [];
        try {
            if (typeof window.world_names !== 'undefined' && Array.isArray(window.world_names)) return window.world_names;
            const select = document.querySelector('#world_editor_select');
            if (select && select.options.length > 0) {
                names = Array.from(select.options)
                    .map(o => (o.innerText || o.text || "").trim())
                    .filter(v => v && v !== "Select World Info" && v !== "None");
            }
        } catch(e) {}
        return names;
    }

    // ==========================================================
    // 核心同步逻辑 (含属性强制更新)
    // ==========================================================
    async function performSync(contacts) {
        console.group("🕵️‍♀️ [Scribe-Format] 格式化同步");
        
        if (!contacts || !contacts.length) {
            console.groupEnd();
            return;
        }

        let targetBookName = window.ST_PHONE.config.targetWorldBook;
        let isEmbedded = false;
        let charId = null;
        const context = SillyTavern.getContext();

        if (!targetBookName && context.characterId) {
            charId = context.characterId;
            const char = SillyTavern.characters[charId];
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

        if (!targetBookName) {
            console.groupEnd();
            return;
        }

        // 获取书对象
        let bookObj = null;
        if (isEmbedded) {
            const char = SillyTavern.characters[charId];
            if (!char.data.character_book) char.data.character_book = { entries: [] };
            bookObj = char.data.character_book;
        } else {
            try {
                const res = await apiFetch('/api/worldinfo/get', { name: targetBookName });
                if (!res) throw new Error("API返回空");
                bookObj = res;
            } catch(e) {
                console.error("❌ 读取失败", e);
                console.groupEnd();
                return;
            }
        }

        if (!bookObj.entries) bookObj.entries = [];
        const entriesCollection = bookObj.entries;
        const isDict = !Array.isArray(entriesCollection);

        let modified = false;

        contacts.forEach(contact => {
            const comment = `ST_PHONE_SMS::${contact.name}`;
            const content = buildContent(contact);
            if (!content) return;

            // 查找现有条目
            let entryList = isDict ? Object.values(entriesCollection) : entriesCollection;
            let existingEntry = entryList.find(e => e.comment === comment);

            // 目标属性 (您要求的设置)
            const targetKeys = [contact.name]; // 2. 仅触发词: 角色名
            const targetDepth = 2;             // 1. 插入深度: 2
            const targetRec = true;            // 3. 不可递归: true

            if (!existingEntry) {
                console.log(`   + 新增条目: ${contact.name}`);
                const newEntry = createEntry(contact.name, comment, content);
                if (isDict) bookObj.entries[newEntry.uid] = newEntry;
                else bookObj.entries.push(newEntry);
                modified = true;
            } else {
                // 智能更新检测：内容变了？或者设置不对？
                const contentChanged = existingEntry.content !== content;
                const depthChanged = existingEntry.depth !== targetDepth;
                const recChanged = existingEntry.prevent_recursion !== targetRec;
                // 简单的数组比较
                const keysChanged = JSON.stringify(existingEntry.keys) !== JSON.stringify(targetKeys);

                if (contentChanged || depthChanged || recChanged || keysChanged) {
                    console.log(`   * 修正条目: ${contact.name} (更新内容或设置)`);
                    
                    // 更新所有属性
                    existingEntry.content = content;
                    existingEntry.depth = targetDepth;
                    existingEntry.prevent_recursion = targetRec;
                    existingEntry.keys = targetKeys;
                    // 兼容性字段 key 也更新一下
                    existingEntry.key = targetKeys; 
                    existingEntry.enabled = true;
                    
                    modified = true;
                }
            }
        });

        if (modified) {
            if (isEmbedded) {
                console.log("💾 更新内嵌书...");
                if (SillyTavern.saveCharacterDebounced) SillyTavern.saveCharacterDebounced(charId);
                else SillyTavern.saveCharacter(charId);
            } else {
                console.log("💾 更新全局书...");
                await apiFetch('/api/worldinfo/edit', { name: targetBookName, data: bookObj });
            }
            console.log("🎉 同步完成");
        } else {
            console.log("💤 条目完美，无需更新");
        }
        
        console.groupEnd();
    }

    // ----------------------------------------------------------------------
    // 条目创建模板 (Create Template)
    // ----------------------------------------------------------------------
    function createEntry(contactName, comment, content) {
        return {
            uid: generateUUID(), 
            key: [contactName],  // 兼容字段
            keys: [contactName], // 2. 触发词仅为角色名
            comment: comment,
            content: content,
            enabled: true,
            constant: false,
            selectiveLogic: 0,
            depth: 2,               // 1. 插入深度 2
            prevent_recursion: true, // 3. 不可递归
            order: 100, 
            priority: 100
        };
    }

    function generateUUID() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(); 
    }

    window.ST_PHONE.scribe = {
        sync: function(contacts) {
            if (state.debounceTimer) clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => { performSync(contacts); }, 2000);
        },
        getWorldBookList: fetchWorldBookList,
        forceSync: () => performSync(window.ST_PHONE.state.contacts)
    };

    console.log('✅ ST-iOS-Phone: 书记员 v4.0 (格式定制版)');
})();
