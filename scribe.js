// ==================================================================================
// 模块: Scribe (书记员 - 负责同步世界书到文件) - v3.2 Omni-Scanner
// ==================================================================================
(function() {
    window.ST_PHONE = window.ST_PHONE || {};
    window.ST_PHONE.config = window.ST_PHONE.config || {};

    const state = {
        isSyncing: false,       
        lastContentMap: {}      
    };

    // --- 1. 基础工具 ---

    // 更加稳健的 API 调用封装
    async function apiCall(endpoint, body) {
        try {
            // 尝试获取 CSRF Token，不同版本获取方式不同，做个兼容
            let token = undefined;
            if (typeof getCsrfToken === 'function') token = getCsrfToken();
            else if (typeof checkCsrfToken === 'function') token = checkCsrfToken();
            else if (window.csrf_token) token = window.csrf_token;

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['X-CSRF-Token'] = token;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.warn(`📱 [Scribe] API调用失败 (${endpoint}):`, e);
            return null;
        }
    }

    function formatMessagesForWI(contactName, messages) {
        const recentMsgs = messages.slice(-30);
        let transcript = `[短信记录: ${contactName}]\n`;
        transcript += `(以下是 User 与 ${contactName} 在手机上的近期短信往来，请参考此记录进行对话)\n`;
        recentMsgs.forEach(msg => {
            const senderName = msg.sender === 'user' ? '我' : contactName;
            transcript += `(${msg.timeStr.split(' ')[1] || msg.timeStr}) ${senderName}: ${msg.text}\n`;
        });
        return transcript;
    }

    // --- 2. 核心功能 ---

    window.ST_PHONE.scribe = {
        
        // 【核心修复】全方位获取世界书列表
        getWorldBookList: async function() {
            let foundBooks = new Set();

            // 1. 扫描全局变量 (最常见)
            if (typeof world_names !== 'undefined' && Array.isArray(world_names)) {
                world_names.forEach(n => foundBooks.add(n));
            }
            
            // 2. 扫描命名空间 (部分版本)
            if (window.SillyTavern && Array.isArray(window.SillyTavern.world_names)) {
                window.SillyTavern.world_names.forEach(n => foundBooks.add(n));
            }

            // 3. 扫描当前上下文 (获取当前已激活的世界书)
            try {
                if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                    const context = SillyTavern.getContext();
                    if (context && context.worldInfo) {
                        context.worldInfo.forEach(wi => {
                            if (wi.name) foundBooks.add(wi.name);
                            if (wi.originalName) foundBooks.add(wi.originalName);
                        });
                    }
                }
            } catch(e) {}

            // 4. 【关键】扫描当前角色绑定的世界书 (Character Book)
            // 即使列表为空，也要把这个抓出来，因为它最重要
            try {
                if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                    const context = SillyTavern.getContext();
                    const charId = context.characterId;
                    if (charId && SillyTavern.characters && SillyTavern.characters[charId]) {
                        const charData = SillyTavern.characters[charId].data;
                        // 兼容新旧字段
                        const boundBook = charData.character_book;
                        if (boundBook) {
                            const bookName = (typeof boundBook === 'string') ? boundBook : boundBook.name;
                            if (bookName) foundBooks.add(bookName);
                        }
                    }
                }
            } catch(e) {}

            const result = Array.from(foundBooks);
            // console.log('📱 [Scribe] 扫描到的世界书:', result);
            return result;
        },

        // 同步逻辑
        sync: async function(contacts) {
            if (!contacts || contacts.length === 0) return;
            
            const targetBookName = window.ST_PHONE.config.targetWorldBook;
            if (!targetBookName) return; // 未设置则不存

            let hasChanges = false;
            const currentTranscripts = {};

            contacts.forEach(contact => {
                if (contact.messages && contact.messages.length > 0) {
                    const content = formatMessagesForWI(contact.name, contact.messages);
                    currentTranscripts[contact.name] = content;
                    if (state.lastContentMap[contact.name] !== content) {
                        hasChanges = true;
                    }
                }
            });

            if (!hasChanges) return;
            if (state.isSyncing) return;

            state.isSyncing = true;

            try {
                // A. 读取 (如果文件不存在，API可能会返回默认空结构或报错)
                let bookData = await apiCall('/api/worldinfo/get', { name: targetBookName });
                
                // 如果读取失败或者是个空文件，初始化一个新的结构
                if (!bookData || !bookData.entries) {
                    console.log(`📱 [Scribe] 世界书 [${targetBookName}] 不存在或为空，准备新建...`);
                    bookData = { entries: [] };
                }

                let bookModified = false;

                // B. 修改
                for (const name in currentTranscripts) {
                    const content = currentTranscripts[name];
                    const entryComment = `ST_PHONE_AUTO_${name}`;

                    // 确保 entries 是数组
                    if (!Array.isArray(bookData.entries)) {
                        // 某些极其古老的格式可能是 Object，这里强制转 Array 兼容
                        bookData.entries = Object.values(bookData.entries);
                    }

                    let entry = bookData.entries.find(e => e.comment === entryComment);

                    if (entry) {
                        if (entry.content !== content) {
                            entry.content = content;
                            entry.enabled = true; 
                            bookModified = true;
                        }
                    } else {
                        const newEntry = {
                            keys: `${name},手机,短信,message,phone`,
                            content: content,
                            comment: entryComment,
                            enabled: true,
                            position: 'before_char', 
                            selective: false,
                            constant: false,
                            id: Date.now() + Math.floor(Math.random() * 1000)
                        };
                        bookData.entries.push(newEntry);
                        bookModified = true;
                    }
                }

                // C. 保存 (edit 接口会自动创建文件)
                if (bookModified) {
                    const saveResult = await apiCall('/api/worldinfo/edit', { 
                        name: targetBookName, 
                        data: bookData 
                    });
                    
                    if (saveResult) {
                        console.log(`📱 [Scribe] 同步成功! -> ${targetBookName}`);
                        Object.assign(state.lastContentMap, currentTranscripts);
                    }
                } else {
                    Object.assign(state.lastContentMap, currentTranscripts);
                }

            } catch (err) {
                console.error('📱 [Scribe] 同步失败:', err);
            } finally {
                state.isSyncing = false;
            }
        }
    };
})();
