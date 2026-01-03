// ==================================================================================
// 模块: Scribe (书记员 - v6.0 Native Module)
// ==================================================================================

// 【核心】直接引入酒馆原生工具
// loadWorldInfo: 读取世界书 (自动处理缓存)
// saveWorldInfo: 保存世界书 (自动刷新UI)
import { loadWorldInfo, saveWorldInfo } from "/scripts/world-info.js";
import { getContext } from "/scripts/extensions.js";

const MAX_MESSAGES = 20;

// --- 辅助工具函数 ---

function getCharacters() {
    return window.characters || (window.SillyTavern && window.SillyTavern.characters) || {};
}

function generateUUID() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString() + Math.random().toString(36).substring(2);
}

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

function createEntry(contactName, comment, content) {
    return {
        uid: generateUUID(),
        key: [contactName],
        keys: [contactName],
        comment: comment,
        content: content,
        enabled: true,
        position: 4, // 4 = @D
        depth: 3,    // 深度 3
        role: 0,
        preventRecursion: true,
        constant: false,
        selectiveLogic: 0,
        order: 100,
        extensions: { position: 4, depth: 3, role: 0, prevent_recursion: true, exclude_recursion: true }
    };
}

// --- 核心同步逻辑 (Native) ---

async function performSync(contacts) {
    // 0. 环境检查
    if (!window.ST_PHONE) return;
    const context = getContext();
    if (!context) return;

    // 1. 确定目标
    let targetBookName = window.ST_PHONE.config.targetWorldBook;
    let isEmbedded = false;
    let charId = context.characterId;

    // 自动寻找目标
    if (!targetBookName && charId !== undefined && charId !== null) {
        const chars = getCharacters();
        const char = chars[charId];
        if (char && char.data && char.data.character_book) {
            isEmbedded = true;
            targetBookName = "Embedded";
        }
    }

    if (!targetBookName && !isEmbedded) return; // 无目标，退出

    // 2. 构建期望状态 (Active Map)
    const activeEntriesMap = new Map();
    if (contacts && Array.isArray(contacts)) {
        contacts.forEach(contact => {
            const content = buildContent(contact);
            if (content) {
                const comment = `ST_PHONE_SMS::${contact.name}`;
                activeEntriesMap.set(comment, { content: content, name: contact.name });
            }
        });
    }

    // 3. 读取数据 (Read)
    let bookObj = null;
    let bookEntries = null; // 指向 entries 的引用

    try {
        if (isEmbedded) {
            // --- 内置模式 (操作内存) ---
            const chars = getCharacters();
            if (!chars[charId]) return;
            if (!chars[charId].data.character_book) chars[charId].data.character_book = { entries: [] };
            bookObj = chars[charId].data.character_book;
        } else {
            // --- 全局模式 (使用原生 loadWorldInfo) ---
            // 这会自动处理 API 请求和数据解析
            bookObj = await loadWorldInfo(targetBookName);
            if (!bookObj) {
                console.warn(`[ST-Phone] 无法加载世界书: ${targetBookName}`);
                return;
            }
        }
    } catch (e) {
        console.error("[ST-Phone] 读取世界书失败", e);
        return;
    }

    if (!bookObj.entries) bookObj.entries = [];
    bookEntries = bookObj.entries;
    
    let modified = false;

    // 4. 执行 GC 和 更新 (Update & Delete)
    // 兼容 Array 和 Object 两种 entries 格式
    const isDict = !Array.isArray(bookEntries);

    if (isDict) {
        // --- 字典模式 ---
        const uidsToDelete = [];
        
        // 遍历现有条目
        for (const uid in bookEntries) {
            const entry = bookEntries[uid];
            if (entry.comment && entry.comment.startsWith('ST_PHONE_SMS::')) {
                if (activeEntriesMap.has(entry.comment)) {
                    // 更新
                    const newData = activeEntriesMap.get(entry.comment);
                    if (entry.content !== newData.content) {
                        entry.content = newData.content;
                        entry.enabled = true;
                        modified = true;
                    }
                    if (entry.position !== 4) { entry.position = 4; modified = true; }
                    activeEntriesMap.delete(entry.comment);
                } else {
                    // 删除
                    uidsToDelete.push(uid);
                    modified = true;
                }
            }
        }
        
        uidsToDelete.forEach(uid => delete bookEntries[uid]);
        
        // 新增
        activeEntriesMap.forEach((data, comment) => {
            const newEntry = createEntry(data.name, comment, data.content);
            bookEntries[newEntry.uid] = newEntry;
            modified = true;
        });

    } else {
        // --- 数组模式 ---
        const newEntriesList = [];
        
        bookEntries.forEach(entry => {
            if (entry.comment && entry.comment.startsWith('ST_PHONE_SMS::')) {
                if (activeEntriesMap.has(entry.comment)) {
                    // 更新
                    const newData = activeEntriesMap.get(entry.comment);
                    if (entry.content !== newData.content) {
                        entry.content = newData.content;
                        entry.enabled = true;
                        modified = true;
                    }
                    if (entry.position !== 4) { entry.position = 4; modified = true; }
                    
                    newEntriesList.push(entry);
                    activeEntriesMap.delete(entry.comment);
                } else {
                    // 删除 (不加入新列表即为删除)
                    modified = true;
                }
            } else {
                // 保留其他条目
                newEntriesList.push(entry);
            }
        });

        // 新增
        activeEntriesMap.forEach((data, comment) => {
            const newEntry = createEntry(data.name, comment, data.content);
            newEntriesList.push(newEntry);
            modified = true;
        });

        if (modified) {
            bookObj.entries = newEntriesList;
        }
    }

    // 5. 保存 (Save)
    if (modified) {
        console.log(`📱 [ST-Phone] 原生同步完成: ${targetBookName} (Embedded: ${isEmbedded})`);
        
        if (isEmbedded) {
            // 内置书保存
            if (window.SillyTavern && window.SillyTavern.saveCharacter) {
                // 使用 debounce 或直接保存
                window.SillyTavern.saveCharacter(charId); 
            }
        } else {
            // 全局书保存 (核心优化)
            // 第三个参数 true 表示 immediateUpdate，会立即刷新 UI
            try {
                await saveWorldInfo(targetBookName, bookObj, true);
            } catch (saveErr) {
                console.error("[ST-Phone] 保存世界书失败", saveErr);
            }
        }
    }
}

// 暴露接口给全局对象
// 因为这是一个 Module，变量是私有的，必须手动挂载到 window
if (window.ST_PHONE) {
    window.ST_PHONE.scribe = {
        sync: performSync,
        forceSync: () => {
            if (window.ST_PHONE.state && window.ST_PHONE.state.contacts) {
                performSync(window.ST_PHONE.state.contacts);
            }
        }
    };
    console.log('📱 ST-Phone: Scribe 模块 (Native) 已挂载');
}
