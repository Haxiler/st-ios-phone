// ==================================================================================
// 模块: Core (v4.0 - Fixed World Info Integration)
// ==================================================================================
console.log('🔄 [Core] 开始初始化...');

(async function() {
    
    // --- 工具函数 ---
    function getSystemTimeStr() {
        const now = new Date();
        const M = now.getMonth() + 1;
        const D = now.getDate();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${M}月${D}日 ${h}:${m}`;
    }

    function parseTimeStr(str) {
        if (!str) return new Date();
        const now = new Date();
        let year = now.getFullYear();
        const fullMatch = str.match(/(\d+)月(\d+)日\s*(\d+)[:：](\d+)/);
        if (fullMatch) return new Date(year, parseInt(fullMatch[1]) - 1, parseInt(fullMatch[2]), parseInt(fullMatch[3]), parseInt(fullMatch[4]));
        const timeMatch = str.match(/(\d+)[:：](\d+)/);
        if (timeMatch) return new Date(year, now.getMonth(), now.getDate(), parseInt(timeMatch[1]), parseInt(timeMatch[2]));
        return now;
    }

    function isUserSender(name, context) {
        const myNames = ['{{user}}', '你', 'user', 'me', 'myself'];
        if (context.name1) {
            myNames.push(context.name1.toLowerCase());
            myNames.push(context.name1);
        }
        return myNames.some(n => n && name.toLowerCase() === n.toLowerCase());
    }

    // --- 状态初始化 ---
    window.ST_PHONE.state.lastUserSendTime = 0;
    window.ST_PHONE.state.pendingQueue = []; 
    window.ST_PHONE.state.virtualTime = getSystemTimeStr(); 
    window.ST_PHONE.state.unreadIds = window.ST_PHONE.state.unreadIds || new Set();

    let lastChatFingerprint = ''; 
    let cachedContactsMap = new Map(); 
    let lastChatLength = 0; 
    let lastXmlMsgCount = -1;

    // =========================================================
    // 核心功能：使用 SillyTavern Context API
    // =========================================================
    
    function getSTContext() {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            return SillyTavern.getContext();
        }
        return null;
    }

    // =========================================================
    // 世界书同步功能 (使用正确的 ST API)
    // =========================================================
    
    let syncDebounceTimer = null;

    /**
     * 获取一个符合 SillyTavern 世界书条目格式的新条目模板
     * @param {number} uid - 条目的唯一ID
     * @returns {object} 新条目对象
     */
    function createNewWIEntry(uid) {
        return {
            uid: uid,
            key: [],                    // 关键词数组 (ST 用 key 不是 keys!)
            keysecondary: [],           // 次要关键词
            comment: '',                // 备注/标题
            content: '',                // 内容
            constant: false,            // 是否常驻
            vectorized: false,          // 是否向量化
            selective: true,            // 是否选择性激活
            selectiveLogic: 0,          // AND_ANY
            addMemo: true,              // 显示备注
            order: 100,                 // 排序权重
            position: 0,                // 位置 (0=before_char)
            disable: false,             // 是否禁用 (ST 用 disable 不是 enabled!)
            excludeRecursion: false,
            preventRecursion: true,
            matchPersonaDescription: false,
            matchCharacterDescription: false,
            matchCharacterPersonality: false,
            matchCharacterDepthPrompt: false,
            matchScenario: false,
            matchCreatorNotes: false,
            delayUntilRecursion: false,  // 布尔值，不是数字
            probability: 100,
            useProbability: true,
            depth: 4,
            group: '',
            groupOverride: false,
            groupWeight: 100,
            scanDepth: null,
            caseSensitive: null,
            matchWholeWords: null,
            useGroupScoring: null,
            automationId: '',
            role: null,                  // 可以是 null
            sticky: 0,                   // 数字，不是 null
            cooldown: 0,                 // 数字，不是 null
            delay: 0,                    // 数字，不是 null
            displayIndex: 0,             // 必需字段！通常等于 uid
            ignoreBudget: false,
            outletName: '',
            triggers: [],
            characterFilter: {           // 必需字段！
                isExclude: false,
                names: [],
                tags: []
            },
            displayIndex: uid           // 必需字段！
        };
    }

    /**
     * 同步短信到世界书
     * @param {Map} contactsMap - 联系人映射
     * @param {boolean} immediate - 是否立即执行
     */
    async function syncSmsToLorebook(contactsMap, immediate = false) {
        const targetBookName = window.ST_PHONE.config.targetWorldBook;
        if (!targetBookName) {
            if (immediate) {
                console.warn('⚠️ [Sync] 未设置目标世界书');
                throw new Error("请先在设置中选择世界书");
            }
            return; 
        }

        const context = getSTContext();
        if (!context) {
            console.warn('⚠️ [Sync] SillyTavern 上下文不可用');
            if (immediate) throw new Error("SillyTavern 上下文不可用");
            return;
        }

        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        
        if (immediate) {
            console.log(`🚀 [Sync] 手动触发同步 -> ${targetBookName}`);
            return await performSync(context, targetBookName, contactsMap);
        } else {
            syncDebounceTimer = setTimeout(async () => {
                try {
                    await performSync(context, targetBookName, contactsMap);
                } catch (e) {
                    console.error('❌ [Sync] 自动同步失败:', e);
                }
            }, 3000); 
        }
    }

    /**
     * 执行实际的同步操作 - 带详细调试日志
     */
    async function performSync(context, bookName, contactsMap) {
        // 调试信息收集
        const debugInfo = {
            step: 'init',
            bookName: bookName,
            contactCount: contactsMap.size,
            contacts: [],
            bookDataExists: false,
            entriesCount: 0,
            hasChanges: false,
            error: null
        };
        
        try {
            debugInfo.step = 'check_context';
            console.log('🔍 [Debug] Step 1: 检查 Context...');
            console.log('  - context:', context ? '存在' : '不存在');
            console.log('  - loadWorldInfo:', typeof context.loadWorldInfo);
            console.log('  - saveWorldInfo:', typeof context.saveWorldInfo);
            
            if (!context.loadWorldInfo || !context.saveWorldInfo) {
                throw new Error('Context 缺少 loadWorldInfo 或 saveWorldInfo 方法');
            }

            debugInfo.step = 'load_book';
            console.log(`🔍 [Debug] Step 2: 加载世界书 "${bookName}"...`);
            let bookData = await context.loadWorldInfo(bookName);
            
            console.log('  - 返回数据:', bookData ? '有数据' : 'null/undefined');
            console.log('  - 数据类型:', typeof bookData);
            
            if (!bookData) {
                throw new Error(`loadWorldInfo 返回空值，世界书 "${bookName}" 可能不存在`);
            }
            
            debugInfo.bookDataExists = true;
            console.log('  - bookData.entries:', bookData.entries ? '存在' : '不存在');
            
            // 确保 entries 结构存在
            if (!bookData.entries) {
                console.log('  - 创建空的 entries 数组');
                bookData.entries = [];
            }
            
            // 处理 entries 格式：可能是数组或对象
            const isArrayFormat = Array.isArray(bookData.entries);
            console.log(`  - entries 格式: ${isArrayFormat ? '数组' : '对象'}`);
            
            // 转换为统一的对象格式便于操作
            let entriesObj = {};
            if (isArrayFormat) {
                bookData.entries.forEach((entry, index) => {
                    const uid = entry.uid !== undefined ? entry.uid : index;
                    entriesObj[uid] = entry;
                });
            } else {
                entriesObj = bookData.entries;
            }
            
            debugInfo.entriesCount = Object.keys(entriesObj).length;
            console.log(`  - 现有条目数: ${debugInfo.entriesCount}`);

            debugInfo.step = 'scan_contacts';
            console.log('🔍 [Debug] Step 3: 扫描联系人数据...');
            console.log(`  - 联系人数量: ${contactsMap.size}`);
            
            // 列出所有联系人
            for (let [id, contact] of contactsMap) {
                debugInfo.contacts.push({
                    name: contact.name,
                    msgCount: contact.messages.length
                });
                console.log(`  - ${contact.name}: ${contact.messages.length} 条消息`);
            }
            
            if (contactsMap.size === 0) {
                throw new Error('没有短信数据可同步（联系人列表为空）');
            }

            let hasChanges = false;
            let updatedCount = 0;
            let createdCount = 0;

            // 获取已有的最大数字 UID（忽略非数字的 UID）
            let maxUid = 0;
            for (const key of Object.keys(entriesObj)) {
                const uid = parseInt(key);
                if (!isNaN(uid) && uid >= 0 && uid > maxUid) {
                    maxUid = uid;
                }
            }
            // 确保至少从 100 开始（避免与系统条目冲突）
            if (maxUid < 100) {
                maxUid = 100;
            }
            console.log(`  - 当前最大数字 UID: ${maxUid}`);

            debugInfo.step = 'process_contacts';
            console.log('🔍 [Debug] Step 4: 处理每个联系人...');
            
            // 先清理错误的条目（UID 不是数字的 ST-Phone-Auto 条目）
            console.log('  - 清理错误的 ST-Phone-Auto 条目（非数字 UID）...');
            const entriesToDelete = [];
            for (const [uid, entry] of Object.entries(entriesObj)) {
                if (entry.comment && entry.comment.startsWith('ST-Phone-Auto: ')) {
                    const uidNum = parseInt(uid);
                    // 如果 UID 不是数字，标记为删除
                    if (isNaN(uidNum) || uidNum < 0) {
                        entriesToDelete.push(uid);
                        console.log(`    🗑️ 标记删除错误 UID 的条目: ${uid} (${entry.comment})`);
                    }
                }
            }
            // 删除错误的条目
            entriesToDelete.forEach(uid => {
                delete entriesObj[uid];
                hasChanges = true;
            });
            if (entriesToDelete.length > 0) {
                console.log(`    ✅ 已删除 ${entriesToDelete.length} 个错误格式的条目`);
            }
            
            // 先修复所有已有的 ST-Phone-Auto 条目的格式
            console.log('  - 检查并修复已有 ST-Phone-Auto 条目的格式...');
            for (const [uid, entry] of Object.entries(entriesObj)) {
                if (entry.comment && entry.comment.startsWith('ST-Phone-Auto: ')) {
                    const extractedName = entry.comment.replace('ST-Phone-Auto: ', '').trim();
                    let entryChanged = false;
                    
                    // 确保 UID 是数字
                    const uidNum = parseInt(uid);
                    if (isNaN(uidNum) || uidNum < 0) {
                        console.log(`    ⚠️ 条目 ${uid} 的 UID 不是有效数字，将在后续清理`);
                        continue;
                    }
                    
                    // 1. 删除错误的 keys 字段
                    if (entry.keys !== undefined) {
                        delete entry.keys;
                        entryChanged = true;
                        console.log(`    🔧 删除错误的 keys 字段: ${extractedName}`);
                    }
                    
                    // 2. 确保 key 字段存在且包含角色名
                    if (!entry.key || !Array.isArray(entry.key) || !entry.key.includes(extractedName)) {
                        if (!entry.key) entry.key = [];
                        if (!Array.isArray(entry.key)) {
                            entry.key = [entry.key].filter(Boolean);
                        }
                        if (!entry.key.includes(extractedName)) {
                            entry.key.push(extractedName);
                        }
                        entryChanged = true;
                        console.log(`    🔧 修复 key: ${extractedName} -> [${entry.key.join(', ')}]`);
                    }
                    
                    // 3. 确保有 characterFilter
                    if (!entry.characterFilter || typeof entry.characterFilter !== 'object' || Array.isArray(entry.characterFilter)) {
                        entry.characterFilter = {
                            isExclude: false,
                            names: [],
                            tags: []
                        };
                        entryChanged = true;
                        console.log(`    🔧 添加 characterFilter: ${extractedName}`);
                    }
                    
                    // 4. 确保有 displayIndex
                    if (entry.displayIndex === undefined) {
                        entry.displayIndex = entry.uid;
                        entryChanged = true;
                        console.log(`    🔧 添加 displayIndex: ${extractedName}`);
                    }
                    
                    // 5. 删除错误的 enabled 字段（应该用 disable）
                    if (entry.enabled !== undefined) {
                        if (entry.disable === undefined) {
                            entry.disable = !entry.enabled;
                        }
                        delete entry.enabled;
                        entryChanged = true;
                        console.log(`    🔧 修复 enabled->disable: ${extractedName}`);
                    }
                    
                    // 6. 确保必需字段存在
                    const requiredFields = {
                        excludeRecursion: false,
                        preventRecursion: true,
                        matchPersonaDescription: false,
                        matchCharacterDescription: false,
                        matchCharacterPersonality: false,
                        matchCharacterDepthPrompt: false,
                        matchScenario: false,
                        matchCreatorNotes: false
                    };
                    
                    for (const [field, defaultValue] of Object.entries(requiredFields)) {
                        if (entry[field] === undefined) {
                            entry[field] = defaultValue;
                            entryChanged = true;
                        }
                    }
                    
                    if (entryChanged) {
                        hasChanges = true;
                    }
                }
            }
            
            for (let [id, contact] of contactsMap) {
                const charName = contact.name;
                // 仅同步有内容的联系人
                if (contact.messages.length === 0) {
                    console.log(`  - 跳过 ${charName} (无消息)`);
                    continue; 
                }

                // 构造短信内容
                let fullContent = `【${charName} 的手机短信记录】\n`;
                contact.messages.forEach(m => {
                    const sender = m.sender === 'user' ? '我' : charName;
                    fullContent += `[${m.timeStr}] ${sender}: ${m.text}\n`;
                });
                
                console.log(`  - 处理 ${charName}, 内容长度: ${fullContent.length} 字符`);

                // 查找现有条目 (使用正确的字段名 comment, key)
                let targetEntry = null;
                let targetUid = null;

                for (const [uid, entry] of Object.entries(entriesObj)) {
                    // 优先匹配带有自动标记的条目
                    if (entry.comment && entry.comment.includes(`ST-Phone-Auto: ${charName}`)) {
                        targetEntry = entry;
                        targetUid = uid;
                        console.log(`    找到已有条目 (UID: ${uid})`);
                        break;
                    }
                }
                
                // 其次查找关键词匹配且备注包含"短信"的条目
                if (!targetEntry) {
                    for (const [uid, entry] of Object.entries(entriesObj)) {
                        if (entry.key && Array.isArray(entry.key) && entry.key.includes(charName) && 
                            (entry.comment || '').includes('短信')) {
                            targetEntry = entry;
                            targetUid = uid;
                            console.log(`    找到关键词匹配条目 (UID: ${uid})`);
                            break;
                        }
                    }
                }

                if (targetEntry) {
                    // 更新现有条目 - 强制更新内容和 key
                    const contentChanged = targetEntry.content !== fullContent;
                    
                    // 检查 key 字段
                    let keyNeedsFix = false;
                    if (!targetEntry.key) {
                        keyNeedsFix = true;
                        console.log(`    ⚠️ 条目 ${charName} 缺少 key 字段`);
                    } else if (!Array.isArray(targetEntry.key)) {
                        keyNeedsFix = true;
                        console.log(`    ⚠️ 条目 ${charName} 的 key 不是数组:`, typeof targetEntry.key);
                    } else if (!targetEntry.key.includes(charName)) {
                        keyNeedsFix = true;
                        console.log(`    ⚠️ 条目 ${charName} 的 key 不包含角色名:`, targetEntry.key);
                    }
                    
                    // 只要内容变化或 key 有问题，就更新
                    if (contentChanged || keyNeedsFix) {
                        targetEntry.content = fullContent;
                        targetEntry.disable = false;
                        
                        // 确保 key 是数组且包含角色名
                        if (!targetEntry.key) targetEntry.key = [];
                        if (!Array.isArray(targetEntry.key)) {
                            targetEntry.key = Array.isArray(targetEntry.key) ? targetEntry.key : [targetEntry.key].filter(Boolean);
                        }
                        if (!targetEntry.key.includes(charName)) {
                            targetEntry.key.push(charName);
                        }
                        
                        hasChanges = true;
                        updatedCount++;
                        console.log(`    ✏️ 更新条目: ${charName} (内容${contentChanged ? '已' : '未'}变化, key${keyNeedsFix ? '已修复' : '正常'})`);
                        console.log(`      - key 值: [${targetEntry.key.join(', ')}]`);
                    } else {
                        console.log(`    ⏭️ 内容相同且key正确，跳过: ${charName}`);
                    }
                } else {
                    // 创建新条目 - 使用数字 UID
                    maxUid = maxUid + 1;
                    const newEntry = createNewWIEntry(maxUid);
                    newEntry.key = [charName];  // 确保是数组
                    newEntry.comment = `ST-Phone-Auto: ${charName}`;
                    newEntry.content = fullContent;
                    newEntry.addMemo = true;
                    newEntry.displayIndex = maxUid;  // 确保有 displayIndex
                    
                    entriesObj[maxUid] = newEntry;
                    hasChanges = true;
                    createdCount++;
                    console.log(`    ✨ 创建新条目: ${charName} (UID: ${maxUid}, key: [${newEntry.key.join(',')}])`);
                }
            }

            debugInfo.hasChanges = hasChanges;

            if (hasChanges) {
                debugInfo.step = 'save';
                console.log('🔍 [Debug] Step 5: 保存世界书...');
                console.log(`  - 更新: ${updatedCount}, 新建: ${createdCount}`);
                
                // 将 entriesObj 转换回原始格式
                if (isArrayFormat) {
                    // 转换为数组格式
                    bookData.entries = Object.values(entriesObj);
                    console.log(`  - 转换为数组格式，条目数: ${bookData.entries.length}`);
                } else {
                    // 保持对象格式
                    bookData.entries = entriesObj;
                    console.log(`  - 保持对象格式，条目数: ${Object.keys(entriesObj).length}`);
                }
                
                // 验证数据格式
                console.log(`  - 保存前验证: entries 类型=${typeof bookData.entries}, 是数组=${Array.isArray(bookData.entries)}`);
                
                // 打印前3个条目的 key 字段
                const sampleEntries = Array.isArray(bookData.entries) 
                    ? bookData.entries.slice(0, 3)
                    : Object.values(bookData.entries).slice(0, 3);
                sampleEntries.forEach((e, i) => {
                    console.log(`  - 条目[${i}] key:`, e.key, `(类型: ${typeof e.key}, 是数组: ${Array.isArray(e.key)})`);
                });
                
                console.log(`  - 调用 saveWorldInfo("${bookName}", data, true)`);
                
                // 使用 ST 提供的 saveWorldInfo
                const saveResult = await context.saveWorldInfo(bookName, bookData, true);
                console.log(`  - saveWorldInfo 返回: ${saveResult}`);
                
                // 清除缓存，强制下次重新加载
                if (context.loadWorldInfo && typeof context.loadWorldInfo === 'function') {
                    // 尝试清除 worldInfoCache（如果可访问）
                    try {
                        const worldInfoModule = await import('/scripts/world-info.js');
                        if (worldInfoModule && worldInfoModule.worldInfoCache) {
                            worldInfoModule.worldInfoCache.delete(bookName);
                            console.log('  - 已清除缓存');
                        }
                    } catch (e) {
                        console.log('  - 无法清除缓存（可能不可访问）');
                    }
                }
                
                debugInfo.step = 'done';
                console.log('✅ [Sync] 同步完成！');
                
                // 存储调试信息供 UI 显示
                window.ST_PHONE._lastSyncDebug = debugInfo;
                return { success: true, updated: updatedCount, created: createdCount, debug: debugInfo };
            } else {
                console.log('💤 [Sync] 内容无变化，未保存');
                window.ST_PHONE._lastSyncDebug = debugInfo;
                return { success: true, noChanges: true, debug: debugInfo }; 
            }

        } catch (err) {
            debugInfo.error = err.message;
            debugInfo.step = 'error_at_' + debugInfo.step;
            console.error('❌ [Sync] 同步错误:', err);
            console.error('❌ [Sync] 调试信息:', debugInfo);
            window.ST_PHONE._lastSyncDebug = debugInfo;
            throw err;
        }
    }
    
    // 暴露同步函数 - 返回详细结果
    window.ST_PHONE.syncNow = async () => {
        console.log('🚀 [syncNow] 开始同步...');
        
        // 先扫描一遍确保数据最新
        scanChatHistory(); 
        
        console.log(`🔍 [syncNow] cachedContactsMap 大小: ${cachedContactsMap.size}`);
        
        if (cachedContactsMap && cachedContactsMap.size > 0) {
            return await syncSmsToLorebook(cachedContactsMap, true);
        } else {
            console.log('⚠️ [syncNow] cachedContactsMap 为空');
            throw new Error('没有扫描到短信数据');
        }
    };

    // =========================================================
    // 聊天扫描逻辑
    // =========================================================
    const REGEX_XML_MSG = /<msg>(.+?)\|(.+?)\|([\s\S]+?)\|(.*?)<\/msg>/gi;
    const REGEX_STORY_TIME = /(?:<|&lt;)time(?:>|&gt;)(.*?)(?:<|&lt;)\/time(?:>|&gt;)/i;

    function scanChatHistory() {
        const context = getSTContext();
        if (!context) return;
        
        const chat = context.chat; 
        if (!chat || chat.length === 0) return;

        const lastMsg = chat[chat.length - 1];
        const lastMsgHash = lastMsg.mes ? lastMsg.mes.slice(-50) : ''; 
        const currentFingerprint = `${chat.length}|${lastMsgHash}|${context.name1}`; 

        if (currentFingerprint !== lastChatFingerprint) {
            lastChatFingerprint = currentFingerprint;
            
            if (lastChatLength > 0 && chat.length > lastChatLength) {
                const newMessages = chat.slice(lastChatLength);
                let hasNewUserMsg = false;
                newMessages.forEach(msg => {
                    let isMe = msg.is_user || (context.name1 && msg.name === context.name1);
                    if (!isMe) {
                         const matches = [...(msg.mes || '').matchAll(REGEX_XML_MSG)];
                         if (matches.length > 0) {
                             const sender = matches[matches.length - 1][1].trim();
                             if (isUserSender(sender, context)) isMe = true;
                         }
                    }
                    if (isMe) hasNewUserMsg = true;
                });
                if (hasNewUserMsg) window.ST_PHONE.state.pendingQueue = [];
            }
            lastChatLength = chat.length;

            let newContactsMap = new Map();
            let latestNarrativeTime = null;
            let currentXmlMsgCount = 0;
            let lastParsedSmsWasMine = false;

            chat.forEach(msg => {
                if (!msg.mes) return;
                const cleanMsg = msg.mes.replace(/```/g, ''); 
                
                const timeMatch = cleanMsg.match(REGEX_STORY_TIME);
                if (timeMatch && timeMatch[1]) latestNarrativeTime = timeMatch[1].trim();

                const matches = [...cleanMsg.matchAll(REGEX_XML_MSG)];
                matches.forEach(match => {
                    currentXmlMsgCount++;
                    let sender = match[1].trim();
                    let receiver = match[2].trim();
                    const content = match[3].trim();
                    const msgTimeStr = match[4].trim();

                    if (msgTimeStr && !latestNarrativeTime) latestNarrativeTime = msgTimeStr;
                    const finalTimeStr = msgTimeStr || latestNarrativeTime || getSystemTimeStr();
                    const parsedDate = parseTimeStr(finalTimeStr);
                    const datePartMatch = finalTimeStr.match(/(\d+月\d+日)/);
                    const dateStr = datePartMatch ? datePartMatch[1] : '';

                    let isMyMessage = false;
                    let contactName = '';

                    if (isUserSender(sender, context)) {
                        contactName = receiver; 
                        isMyMessage = true;
                    } else {
                        contactName = sender;
                        isMyMessage = false;
                    }
                    lastParsedSmsWasMine = isMyMessage;
                    
                    if (isUserSender(contactName, context)) return;

                    if (!newContactsMap.has(contactName)) {
                        newContactsMap.set(contactName, {
                            id: contactName,
                            name: contactName,
                            lastMsg: '',
                            time: '', 
                            messages: [],
                            lastTimestamp: 0
                        });
                    }
                    const contact = newContactsMap.get(contactName);
                    const lastMsgInHistory = contact.messages[contact.messages.length - 1];
                    if (isMyMessage && lastMsgInHistory && lastMsgInHistory.sender === 'user' && lastMsgInHistory.text === content) {
                        return; 
                    }

                    contact.messages.push({
                        sender: isMyMessage ? 'user' : 'char',
                        text: content,
                        isPending: false,
                        timeStr: finalTimeStr,
                        timestamp: parsedDate.getTime(),
                        dateStr: dateStr
                    });
                    
                    contact.lastMsg = content;
                    contact.time = finalTimeStr;
                    contact.lastTimestamp = parsedDate.getTime();
                });
            });

            newContactsMap.forEach((contact, id) => {
                const oldContact = cachedContactsMap.get(id);
                if ((!oldContact || contact.messages.length > oldContact.messages.length)) {
                    const oldLen = oldContact ? oldContact.messages.length : 0;
                    const newMsgs = contact.messages.slice(oldLen);
                    if (newMsgs.some(m => m.sender === 'char')) {
                        if (window.ST_PHONE.state.activeContactId !== id) {
                            window.ST_PHONE.state.unreadIds.add(id);
                        }
                    }
                }
            });

            cachedContactsMap = newContactsMap;
            if (latestNarrativeTime) window.ST_PHONE.state.virtualTime = latestNarrativeTime;

            if (lastXmlMsgCount === -1) {
                lastXmlMsgCount = currentXmlMsgCount;
            } else {
                if (currentXmlMsgCount > lastXmlMsgCount) {
                    if (!lastParsedSmsWasMine && !window.ST_PHONE.state.isPhoneOpen) {
                        if (window.ST_PHONE.ui.setNotification) window.ST_PHONE.ui.setNotification(true);
                        if (window.ST_PHONE.ui.playNotificationSound) window.ST_PHONE.ui.playNotificationSound();
                    }
                }
                lastXmlMsgCount = currentXmlMsgCount;
            }
            
            // 自动同步到世界书
            syncSmsToLorebook(newContactsMap, false);
        }
        
        // 渲染逻辑 (确保 UI 数据最新)
        let displayContactsMap = new Map(cachedContactsMap);
        const queue = window.ST_PHONE.state.pendingQueue;
        const now = Date.now();
        if (queue.length > 0) {
            let modifiedContactIds = new Set();
            const activeQueue = queue.filter(pMsg => (now - pMsg.sendTime < 600000));
            window.ST_PHONE.state.pendingQueue = activeQueue; 

            activeQueue.forEach(pMsg => {
                let contact = displayContactsMap.get(pMsg.target);
                if (!contact) {
                    contact = {
                        id: pMsg.target,
                        name: pMsg.target,
                        lastMsg: '',
                        time: window.ST_PHONE.state.virtualTime,
                        messages: [],
                        lastTimestamp: Date.now() 
                    };
                    displayContactsMap.set(pMsg.target, contact);
                    modifiedContactIds.add(pMsg.target);
                } else {
                    if (!modifiedContactIds.has(pMsg.target)) {
                        contact = { ...contact, messages: [...contact.messages] };
                        displayContactsMap.set(pMsg.target, contact);
                        modifiedContactIds.add(pMsg.target);
                    }
                }
                const pendingTimeStr = window.ST_PHONE.state.virtualTime;
                const pendingDate = parseTimeStr(pendingTimeStr);
                contact.messages.push({
                    sender: 'user',
                    text: pMsg.text,
                    isPending: true,
                    timeStr: pendingTimeStr,
                    timestamp: pendingDate.getTime(), 
                    dateStr: ''
                });
                contact.lastMsg = pMsg.text;
                contact.lastTimestamp = pendingDate.getTime();
                window.ST_PHONE.state.unreadIds.delete(pMsg.target);
            });
        }

        if (window.ST_PHONE.ui.updateStatusBarTime) window.ST_PHONE.ui.updateStatusBarTime(window.ST_PHONE.state.virtualTime);

        let contactList = Array.from(displayContactsMap.values());
        contactList.forEach(c => c.hasUnread = window.ST_PHONE.state.unreadIds.has(c.id));
        contactList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        window.ST_PHONE.state.contacts = contactList;

        if (window.ST_PHONE.ui.renderContacts) {
            const searchInput = document.getElementById('phone-search-bar');
            if (!searchInput || !searchInput.value) window.ST_PHONE.ui.renderContacts();
            if (window.ST_PHONE.state.activeContactId) {
                const currentContact = window.ST_PHONE.state.contacts.find(c => c.id === window.ST_PHONE.state.activeContactId);
                if (window.ST_PHONE.state.unreadIds.has(window.ST_PHONE.state.activeContactId)) {
                    window.ST_PHONE.state.unreadIds.delete(window.ST_PHONE.state.activeContactId);
                    if (currentContact) currentContact.hasUnread = false; 
                }
                if (currentContact) window.ST_PHONE.ui.renderChat(currentContact, false);
            }
        }
    }

    function sendDraftToInput() {
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        const activeId = window.ST_PHONE.state.activeContactId;
        if (!text || !activeId) return;

        let contact = window.ST_PHONE.state.contacts.find(c => c.id === activeId);
        const targetName = contact ? contact.name : activeId;
        const timeToSend = window.ST_PHONE.state.virtualTime;
        const xmlString = `<msg>{{user}}|${targetName}|${text}|${timeToSend}</msg>`;
        const mainTextArea = document.querySelector('#send_textarea');
        if (mainTextArea) {
            const originalText = mainTextArea.value;
            const prefix = originalText.length > 0 ? '\n' : '';
            mainTextArea.value = originalText + prefix + xmlString + '\n'; 
            mainTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            window.ST_PHONE.state.pendingQueue.push({ text: text, target: targetName, sendTime: Date.now() });
            window.ST_PHONE.state.lastUserSendTime = Date.now();
            setTimeout(scanChatHistory, 50);
            input.value = '';
            mainTextArea.focus(); 
        } else {
            alert('❌ 找不到酒馆主输入框 (#send_textarea)');
        }
    }

    // =========================================================
    // 事件监听与初始化
    // =========================================================
    
    document.addEventListener('st-phone-opened', () => { scanChatHistory(); });
    
    // 绑定发送按钮
    const sendBtn = document.getElementById('btn-send');
    if(sendBtn) sendBtn.onclick = sendDraftToInput;
    
    function initAutomation() {
        // 定时扫描
        setInterval(scanChatHistory, 2000);
        
        // 使用 ST 事件系统监听生成结束
        const context = getSTContext();
        if (context && context.eventSource) {
            const eventTypes = context.eventTypes;
            if (eventTypes) {
                // 监听消息接收事件
                context.eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
                    setTimeout(scanChatHistory, 500);
                });
                // 监听生成结束事件
                context.eventSource.on(eventTypes.GENERATION_ENDED, () => {
                    setTimeout(scanChatHistory, 500);
                });
                console.log('✅ [Core] 已注册 ST 事件监听');
            }
        }
        
        // 备用：jQuery 事件 (兼容旧版本)
        if (typeof jQuery !== 'undefined') {
            jQuery(document).on('generation_ended', () => setTimeout(scanChatHistory, 500));
        }
    }
    
    // 延迟初始化，确保 ST 已完全加载
    setTimeout(() => {
        initAutomation();
        scanChatHistory();
        console.log('✅ [Core] 逻辑核心已挂载 (v4.0)');
    }, 1500);

})();
