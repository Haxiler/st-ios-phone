// ==================================================================================
// 模块: Core (高性能逻辑核心 - v4.0 Incremental)
// ==================================================================================
(function() {
    const ST = window.ST_PHONE;
    
    // 内部状态
    let lastChatLength = 0;
    let contactsMap = new Map(); // ID -> Contact Object
    
    // 正则预编译
    const REGEX_XML_MSG = /<msg>(.+?)\|(.+?)\|([\s\S]+?)\|(.*?)<\/msg>/gi;
    const REGEX_STORY_TIME = /(?:<|&lt;)time(?:>|&gt;)(.*?)(?:<|&lt;)\/time(?:>|&gt;)/i;

    // --- 辅助函数 ---

    function getSystemTimeStr() {
        const now = new Date();
        const M = now.getMonth() + 1;
        const D = now.getDate();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${M}月${D}日 ${h}:${m}`;
    }

    // 修复后的时间解析器
    function parseTimeStr(str) {
        if (!str) return new Date();
        const now = new Date();
        let year = now.getFullYear();

        // 尝试匹配 "12月31日 12:00"
        const fullMatch = str.match(/(\d+)月(\d+)日\s*(\d+)[:：](\d+)/);
        if (fullMatch) {
            const m = parseInt(fullMatch[1]);
            const d = parseInt(fullMatch[2]);
            const h = parseInt(fullMatch[3]);
            const min = parseInt(fullMatch[4]);
            // 简单的跨年逻辑：如果消息月份(12) > 当前月份(1) + 缓冲，视为去年
            // 反之，如果消息月份(1) < 当前月份(12) - 缓冲，视为明年(极少见)
            // 这里主要处理历史记录回溯
            if (m > now.getMonth() + 1 + 2) { 
                year -= 1;
            }
            return new Date(year, m - 1, d, h, min);
        }
        
        // 尝试匹配 "12:00"
        const timeMatch = str.match(/(\d+)[:：](\d+)/);
        if (timeMatch) {
            return new Date(year, now.getMonth(), now.getDate(), parseInt(timeMatch[1]), parseInt(timeMatch[2]));
        }
        return now;
    }

    function isUserSender(name) {
        if (!name) return false;
        const context = SillyTavern.getContext();
        const myNames = ['{{user}}', '你', 'user', 'me', 'myself'];
        if (context.name1) myNames.push(context.name1);
        return myNames.some(n => n.toLowerCase() === name.toLowerCase());
    }

    // --- 核心扫描逻辑 ---

    function processMessageContent(content, msgDateStr, isUserSent, rawReceiver, rawSender) {
        // 确定联系人 ID (对方的名字)
        const contactId = isUserSent ? rawReceiver : rawSender;
        // 如果联系人也是 User (发给自己)，跳过
        if (isUserSender(contactId)) return;

        if (!contactsMap.has(contactId)) {
            contactsMap.set(contactId, {
                id: contactId,
                name: contactId,
                lastMsg: '',
                time: '',
                messages: [],
                lastTimestamp: 0,
                hasUnread: false
            });
        }

        const contact = contactsMap.get(contactId);
        const parsedDate = parseTimeStr(msgDateStr);
        const timestamp = parsedDate.getTime();

        // 去重：检查最后一条消息是否完全一致
        const lastMsg = contact.messages[contact.messages.length - 1];
        if (lastMsg && lastMsg.text === content && lastMsg.timestamp === timestamp && lastMsg.sender === (isUserSent ? 'user' : 'char')) {
            return; // 重复消息，跳过
        }

        // 入库
        contact.messages.push({
            sender: isUserSent ? 'user' : 'char',
            text: content,
            isPending: false,
            timeStr: msgDateStr,
            timestamp: timestamp,
            dateStr: msgDateStr.split(' ')[0] || ''
        });

        // 更新摘要
        contact.lastMsg = content;
        contact.time = msgDateStr;
        contact.lastTimestamp = timestamp;

        // 标记未读 (仅当不是我发的，且当前没打开该联系人)
        if (!isUserSent && ST.store.activeContactId !== contactId) {
            ST.store.unreadIds.add(contactId);
            contact.hasUnread = true;
        }
    }

    function scanChat(fullRescan = false) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        const chat = context.chat;
        if (!Array.isArray(chat)) return;

        // 1. 删除/回滚检测
        if (chat.length < lastChatLength || fullRescan) {
            console.log('📱 ST-Phone: 检测到回滚或重置，执行全量重扫');
            contactsMap.clear();
            ST.store.unreadIds.clear();
            lastChatLength = 0;
            // 如果发生了删除，建议触发一次世界书同步以清理脏数据
            if (ST.scribe && ST.scribe.debouncedSync) ST.scribe.debouncedSync();
        }

        // 2. 增量扫描 loop
        // 注意：总是重新扫描最后一条消息，因为它可能正在流式传输(Streaming)中变化
        let startIndex = lastChatLength > 0 ? lastChatLength - 1 : 0;
        
        let hasUpdates = false;
        let latestGlobalTime = ST.store.virtualTime;

        for (let i = startIndex; i < chat.length; i++) {
            const msg = chat[i];
            if (!msg.mes) continue;

            // 提取时间锚点 (Narrative Time)
            const timeMatch = msg.mes.match(REGEX_STORY_TIME);
            if (timeMatch && timeMatch[1]) latestGlobalTime = timeMatch[1].trim();

            // 提取 XML 短信
            const matches = [...msg.mes.matchAll(REGEX_XML_MSG)];
            if (matches.length > 0) {
                // 如果是重新扫描最后一条，需要先清理该联系人尾部的可能重复消息吗？
                // 简化策略：如果是流式传输，通常 XML 是最后生成的。我们暂不处理流式中间态的重复，依靠去重逻辑。
                
                matches.forEach(match => {
                    const sender = match[1].trim();
                    const receiver = match[2].trim();
                    const content = match[3].trim();
                    const msgTimeStr = match[4].trim() || latestGlobalTime || getSystemTimeStr();
                    
                    const isMine = isUserSender(sender);
                    processMessageContent(content, msgTimeStr, isMine, receiver, sender);
                    hasUpdates = true;
                });
            }
        }

        // 3. 更新状态
        lastChatLength = chat.length;
        ST.store.virtualTime = latestGlobalTime || getSystemTimeStr();
        
        // 将 Map 转为 Array 并排序
        const contactList = Array.from(contactsMap.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        ST.store.contacts = contactList;

        // 4. 触发 UI 更新
        // 如果有更新，或者是全量扫描，或者是第一次，都通知 UI
        if (hasUpdates || fullRescan) {
            ST.emit('contacts-updated', contactList);
            
            // 如果正在聊天窗口中，触发具体聊天更新
            if (ST.store.activeContactId) {
                const activeData = contactsMap.get(ST.store.activeContactId);
                if (activeData) ST.emit('chat-updated', activeData);
            }

            // 播放提示音 (简单的防抖逻辑由 UI 层处理或在这里判断 isPhoneOpen)
            if (hasUpdates && !ST.store.isPhoneOpen && ST.store.unreadIds.size > 0) {
                // 只有当最新的消息不是我发的时候才响
                if (contactList.length > 0 && contactList[0].messages.length > 0) {
                    const lastMsg = contactList[0].messages[contactList[0].messages.length - 1];
                    if (lastMsg.sender !== 'user') {
                        ST.emit('notification-arrived');
                    }
                }
            }
        }
    }

    // --- 发送逻辑 ---
    
    function sendMessage(text) {
        if (!text || !ST.store.activeContactId) return;
        
        const targetName = ST.store.activeContactId; // ID 即名字
        const timeToSend = ST.store.virtualTime;
        
        // 构造 XML
        // 替换管道符防止破坏格式
        const safeText = text.replace(/\|/g, '｜');
        const xmlString = `<msg>{{user}}|${targetName}|${safeText}|${timeToSend}</msg>`;
        
        // 插入输入框
        const mainTextArea = document.getElementById('send_textarea');
        if (mainTextArea) {
            const currentVal = mainTextArea.value;
            const prefix = currentVal ? '\n' : '';
            mainTextArea.value = currentVal + prefix + xmlString;
            
            // 触发酒馆的 input 事件以更新高度和状态
            mainTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            mainTextArea.focus();
            
            // 立即回显到 UI (Optimistic UI)
            // 虽然 scanChat 会再次扫到它，但为了即时反馈，我们可以先手动推入一个 Pending 消息
            // 这里为了简化，我们依赖 scanChat 的快速响应（Observer）
        }
    }

    // --- 初始化 ---

    function init() {
        // 1. 监听全局事件
        ST.on('ready', () => scanChat(true));
        ST.on('send-message', (text) => sendMessage(text));
        
        // 2. 监听酒馆事件 (如果有)
        if (window.eventSource) {
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, () => scanChat());
            window.eventSource.on(window.event_types.GENERATION_STOPPED, () => {
                scanChat();
                // 触发世界书同步
                if (ST.scribe && ST.scribe.debouncedSync) ST.scribe.debouncedSync();
            });
        }

        // 3. 建立 DOM 观察者 (作为兜底)
        const chatContainer = document.getElementById('chat');
        if (chatContainer) {
            const observer = new MutationObserver((mutations) => {
                // 简单的节流，避免高频触发
                scanChat();
            });
            observer.observe(chatContainer, { childList: true, subtree: true, characterData: true });
        }
    }

    ST.core = {
        scan: scanChat,
        init: init
    };

    // 启动监听
    init();

})();
