// ==================================================================================
// 模块: Scribe (书记员 - v3.8 Verify Write)
// ==================================================================================
(function () {

    const MAX_MESSAGES = 30;

    const state = {
        debounceTimer: null
    };

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

    // jQuery API 请求封装
    async function apiFetch(url, body) {
        // console.log(`🔍 [API] ${url}`); // 减少刷屏
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

    // 获取列表
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
    // 核心逻辑: 同步 + 验证
    // ==========================================================
    async function performSync(contacts) {
        console.group("🕵️‍♀️ [Scribe-Verify] 同步验证开始");
        
        if (!contacts || !contacts.length) {
            console.warn("⚠️ 无数据");
            console.groupEnd();
            return;
        }

        let targetBookName = window.ST_PHONE.config.targetWorldBook;
        let isEmbedded = false;
        let charId = null;
        const context = SillyTavern.getContext();

        // 自动探测
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
            console.warn("⚠️ 未设置目标");
            console.groupEnd();
            return;
        }

        // 1. 读取原始数据
        let bookObj = null;
        if (isEmbedded) {
            console.log("-> 模式: 内嵌书");
            const char = SillyTavern.characters[charId];
            if (!char.data.character_book) char.data.character_book = { entries: [] };
            bookObj = char.data.character_book;
        } else {
            console.log(`-> 模式: 全局书 [${targetBookName}]`);
            try {
                // 读取服务器上的当前版本
                const res = await apiFetch('/api/worldinfo/get', { name: targetBookName });
                if (!res) throw new Error("API返回空");
                bookObj = res;
            } catch(e) {
                console.error("❌ 读取失败", e);
                console.groupEnd();
                return;
            }
        }

        // 2. 准备修改
        if (!bookObj.entries) bookObj.entries = [];
        const entriesCollection = bookObj.entries;
        const isDict = !Array.isArray(entriesCollection);
        
        console.log(`-> 数据结构: ${isDict ? '字典(Dict)' : '数组(Array)'}`);
        if (isDict) console.log(`-> 当前条目数: ${Object.keys(entriesCollection).length}`);
        else console.log(`-> 当前条目数: ${entriesCollection.length}`);

        let modified = false;
        let changedContactName = ""; // 记录修改了谁，方便验证

        contacts.forEach(contact => {
            const comment = `ST_PHONE_SMS::${contact.name}`;
            const content = buildContent(contact);
            if (!content) return;

            // 查找
            let entryList = isDict ? Object.values(entriesCollection) : entriesCollection;
            let existingEntry = entryList.find(e => e.comment === comment);

            if (!existingEntry) {
                console.log(`   + 准备新增: ${contact.name}`);
                const newEntry = createEntry(contact.name, comment, content);
                if (isDict) bookObj.entries[newEntry.uid] = newEntry;
                else bookObj.entries.push(newEntry);
                modified = true;
                changedContactName = contact.name;
            } else if (existingEntry.content !== content) {
                console.log(`   * 准备更新: ${contact.name}`);
                existingEntry.content = content;
                existingEntry.enabled = true;
                modified = true;
                changedContactName = contact.name;
            }
        });

        // 3. 提交与验证
        if (modified) {
            if (isEmbedded) {
                console.log("💾 提交内嵌书...");
                if (SillyTavern.saveCharacterDebounced) SillyTavern.saveCharacterDebounced(charId);
                else SillyTavern.saveCharacter(charId);
                console.log("✅ 内存已更新 (内嵌书无需回读验证)");
            } else {
                console.log("💾 提交全局书...");
                // 提交
                await apiFetch('/api/worldinfo/edit', { name: targetBookName, data: bookObj });
                console.log("✅ API 响应成功 (200 OK)");

                // --- 回马枪：立即读回来验证 ---
                console.log("🧐 [回读验证] 正在检查服务器是否真的存了...");
                const verifyRes = await apiFetch('/api/worldinfo/get', { name: targetBookName });
                
                if (verifyRes && verifyRes.entries) {
                    const vEntries = verifyRes.entries;
                    const vList = Array.isArray(vEntries) ? vEntries : Object.values(vEntries);
                    
                    // 检查刚才改的那个人的条目是否存在/最新
                    const checkComment = `ST_PHONE_SMS::${changedContactName}`;
                    const found = vList.find(e => e.comment === checkComment);
                    
                    if (found) {
                        console.log(`🎉 验证通过！服务器上已存在条目: [${checkComment}]`);
                        console.log(`📝 字数: ${found.content.length}`);
                        console.log("💡 提示: 如果UI没变化，请刷新网页或重载世界书。");
                    } else {
                        console.error(`😱 验证失败！服务器返回的数据里找不到 [${checkComment}]`);
                        console.error("👉 原因可能是: UID 格式不兼容 或 服务器字段校验失败。");
                    }
                }
            }
        } else {
            console.log("💤 内容无变化，跳过提交");
        }
        
        console.groupEnd();
    }

    function createEntry(contactName, comment, content) {
        return {
            uid: generateUUID(), 
            key: ['<msg>', '短信', '手机', contactName], 
            keys: ['<msg>', '短信', '手机', contactName],
            comment: comment,
            content: content,
            enabled: true,
            constant: false,
            selectiveLogic: 0,
            depth: 2,
            order: 100, 
            priority: 100
        };
    }

    // 尝试生成纯数字 ID 字符串，以防万一服务器不喜欢 UUID
    function generateUUID() {
        // 先试用标准的，如果验证失败我们再改纯数字
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

    console.log('✅ ST-iOS-Phone: 书记员 v3.8 (读写验证版)');
})();
