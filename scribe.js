// ==================================================================================
// 模块: Scribe (书记员 - 负责同步世界书到文件) - v3.1 Fix WorldBook List
// ==================================================================================
(function() {
    window.ST_PHONE = window.ST_PHONE || {};
    window.ST_PHONE.config = window.ST_PHONE.config || {};

    // 内部状态
    const state = {
        isSyncing: false,       
        lastContentMap: {}      
    };

    // --- 1. 基础工具 ---

    async function apiCall(endpoint, body) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.checkCsrfToken ? window.checkCsrfToken() : undefined 
                },
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
        
        // 【核心修复】获取所有世界书文件名
        getWorldBookList: async function() {
            // 方法 A (推荐): 直接读取酒馆全局变量 world_names
            // 这是最快且兼容性最好的方法，因为它就是 UI 上显示的那个列表
            if (typeof world_names !== 'undefined' && Array.isArray(world_names)) {
                // console.log('📱 [Scribe] 通过全局变量获取到世界书列表:', world_names.length);
                return world_names;
            }

            // 方法 B: 尝试通过 window.SillyTavern 命名空间获取
            if (window.SillyTavern && Array.isArray(window.SillyTavern.world_names)) {
                return window.SillyTavern.world_names;
            }

            // 方法 C: 最后的尝试，调用 API (部分版本支持 /api/worldinfo/get_names 或类似)
            // 但通常不需要走到这一步
            try {
                const result = await apiCall('/api/worldinfo/get_headers', {}); // 尝试 get_headers
                if (result && Array.isArray(result)) return result.map(i => i.name || i);
            } catch(e) {}

            console.warn('📱 [Scribe] 无法获取世界书列表，请检查酒馆版本');
            return [];
        },

        // 同步逻辑 (保持不变)
        sync: async function(contacts) {
            if (!contacts || contacts.length === 0) return;
            
            const targetBookName = window.ST_PHONE.config.targetWorldBook;
            if (!targetBookName) return;

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

            if (state.isSyncing) {
                console.log('📱 [Scribe] 上次同步尚未完成，跳过本次');
                return;
            }

            state.isSyncing = true;

            try {
                // A. 读取
                const bookData = await apiCall('/api/worldinfo/get', { name: targetBookName });
                
                if (!bookData || !bookData.entries) {
                    console.error(`📱 [Scribe] 无法读取世界书 [${targetBookName}]`);
                    state.isSyncing = false;
                    return;
                }

                let bookModified = false;

                // B. 修改
                for (const name in currentTranscripts) {
                    const content = currentTranscripts[name];
                    const entryComment = `ST_PHONE_AUTO_${name}`;

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
                        if (Array.isArray(bookData.entries)) {
                            bookData.entries.push(newEntry);
                            bookModified = true;
                        }
                    }
                }

                // C. 保存
                if (bookModified) {
                    const saveResult = await apiCall('/api/worldinfo/edit', { 
                        name: targetBookName, 
                        data: bookData 
                    });
                    
                    if (saveResult) {
                        console.log('📱 [Scribe] 同步成功！');
                        Object.assign(state.lastContentMap, currentTranscripts);
                    }
                } else {
                    Object.assign(state.lastContentMap, currentTranscripts);
                }

            } catch (err) {
                console.error('📱 [Scribe] 同步过程中发生错误:', err);
            } finally {
                state.isSyncing = false;
            }
        }
    };
})();
