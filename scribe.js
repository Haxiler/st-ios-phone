// ==================================================================================
// 模块: Scribe (书记员 - v4.0 Debounced Sync)
// ==================================================================================
import { loadWorldInfo, saveWorldInfo } from "/scripts/world-info.js";
import { getContext } from "/scripts/extensions.js";

const MAX_MESSAGES = 20; // 仅保留最近20条作为上下文

// --- 工具函数 ---
function getCharacters() {
    return window.characters || (window.SillyTavern && window.SillyTavern.characters) || {};
}

function generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
}

// 防抖函数生成器
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function buildEntryContent(contact) {
    if (!contact.messages || contact.messages.length === 0) return null;
    const msgs = contact.messages.slice(-MAX_MESSAGES);
    
    let out = `【手机短信记录｜${contact.name}】\n`;
    out += `Context: Recent text messages between {{user}} and ${contact.name}.\n\n`;
    msgs.forEach(m => {
        const who = m.sender === 'user' ? '我' : contact.name;
        out += `(${m.timeStr}) ${who}：${m.text}\n`;
    });
    return out.trim();
}

function createEntry(contactName, comment, content) {
    return {
        uid: generateUUID(),
        key: [contactName, "手机短信", "SMS"], // 增加触发词
        keys: [contactName, "手机短信", "SMS"],
        comment: comment,
        content: content,
        enabled: true,
        position: 4, // @D
        depth: 3,    
        order: 100,
        constant: false,
        preventRecursion: true
    };
}

// --- 同步主逻辑 ---

async function performSync() {
    const ST = window.ST_PHONE;
    if (!ST || !ST.store.contacts) return;
    
    const context = getContext();
    if (!context || context.characterId === undefined) return;

    // 1. 确定目标书
    let targetBookName = ST.config.targetWorldBook;
    let isEmbedded = false;
    
    // 如果没有配置，尝试使用内置
    if (!targetBookName) {
        const char = getCharacters()[context.characterId];
        if (char) {
            isEmbedded = true;
            targetBookName = "Embedded";
        }
    }
    
    if (!targetBookName && !isEmbedded) return;

    console.log('📱 Scribe: 开始同步短信到世界书...');

    // 2. 准备数据
    const activeEntriesMap = new Map();
    ST.store.contacts.forEach(contact => {
        const content = buildEntryContent(contact);
        if (content) {
            activeEntriesMap.set(`ST_PHONE_SMS::${contact.name}`, { 
                content, 
                name: contact.name 
            });
        }
    });

    // 3. 读取与更新
    try {
        let bookObj;
        if (isEmbedded) {
            const char = getCharacters()[context.characterId];
            if (!char.data.character_book) char.data.character_book = { entries: [] };
            bookObj = char.data.character_book;
        } else {
            bookObj = await loadWorldInfo(targetBookName);
            if (!bookObj) return;
        }

        let entries = bookObj.entries || [];
        // 统一转为数组处理 (酒馆某些版本可能是对象)
        const isDict = !Array.isArray(entries);
        let entryList = isDict ? Object.values(entries) : entries;
        
        let modified = false;
        const newEntryList = [];
        const processedComments = new Set();

        // 3.1 遍历现有条目：更新或标记删除
        for (const entry of entryList) {
            if (entry.comment && entry.comment.startsWith('ST_PHONE_SMS::')) {
                if (activeEntriesMap.has(entry.comment)) {
                    // 存在 -> 检查更新
                    const newData = activeEntriesMap.get(entry.comment);
                    if (entry.content !== newData.content) {
                        entry.content = newData.content;
                        modified = true;
                    }
                    processedComments.add(entry.comment);
                    newEntryList.push(entry);
                } else {
                    // 不存在 -> 删除 (不加入新列表)
                    modified = true;
                }
            } else {
                // 非插件条目 -> 保留
                newEntryList.push(entry);
            }
        }

        // 3.2 插入新条目
        activeEntriesMap.forEach((data, comment) => {
            if (!processedComments.has(comment)) {
                newEntryList.push(createEntry(data.name, comment, data.content));
                modified = true;
            }
        });

        // 4. 保存
        if (modified) {
            if (isDict) {
                // 如果原格式是对象，尝试转回对象（或直接存数组，酒馆通常兼容）
                bookObj.entries = newEntryList; 
            } else {
                bookObj.entries = newEntryList;
            }

            if (isEmbedded) {
                if (window.SillyTavern.saveCharacter) {
                    window.SillyTavern.saveCharacter(context.characterId);
                }
            } else {
                // 第三个参数 true = 立即刷新
                await saveWorldInfo(targetBookName, bookObj, true);
            }
            console.log('📱 Scribe: 同步完成');
        }

    } catch (e) {
        console.error('📱 Scribe: 同步失败', e);
    }
}

// 挂载防抖版本
if (window.ST_PHONE) {
    window.ST_PHONE.scribe = {
        sync: performSync,
        // 2秒防抖，适合在打字机结束时调用
        debouncedSync: debounce(performSync, 2000)
    };
}
