// ==================================================================================
// 模块: Core (核心逻辑 - v3.2 Robust Sync Fix)
// ==================================================================================
(function() {
    
    // 等待 SillyTavern 环境就绪
    const waitForST = setInterval(() => {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            clearInterval(waitForST);
            initCore();
        }
    }, 100);

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
        if (fullMatch) {
            return new Date(year, parseInt(fullMatch[1]) - 1, parseInt(fullMatch[2]), parseInt(fullMatch[3]), parseInt(fullMatch[4]));
        }
        
        const timeMatch = str.match(/(\d+)[:：](\d+)/);
        if (timeMatch) {
            return new Date(year, now.getMonth(), now.getDate(), parseInt(timeMatch[1]), parseInt(timeMatch[2]));
        }

        return now;
    }

    // 初始化状态
    window.ST_PHONE.state.lastUserSendTime = 0;
    window.ST_PHONE.state.pendingQueue = []; 
    window.ST_PHONE.state.virtualTime = getSystemTimeStr(); 
    window.ST_PHONE.state.unreadIds = window.ST_PHONE.state.unreadIds || new Set();

    let cachedContactsMap = new Map(); 
    let lastChatLength = 0; 
    let lastXmlMsgCount = -1;

    // 正则表达式缓存
    const REGEX_XML_MSG = /<msg>(.+?)\|(.+?)\|([\s\S]+?)\|(.*?)<\/msg>/gi;
    const REGEX_STORY_TIME = /(?:<|&lt;)time(?:>|&gt;)(.*?)(?:<|&lt;)\/time(?:>|&gt;)/i;

    // 辅助：判断发送者是否为用户
    function isUserSender(name, context) {
        const myNames = ['{{user}}', '你', 'user', 'me', 'myself'];
        if (context.name1) {
            myNames.push(context.name1.toLowerCase());
            myNames.push(context.name1);
        }
        return myNames.some(n => n && name.toLowerCase() === n.toLowerCase());
    }

    // ----------------------------------------------------------------------
    // 核心：扫描聊天记录 (Core Scan Logic)
    // ----------------------------------------------------------------------
    function scanChatHistory() {
        if (typeof SillyTavern === 'undefined') return;
        
        const context = SillyTavern.getContext();
        const chat = context.chat; 
        if (!chat || !Array.isArray(chat)) return;

        // 1. 基础状态重置
        let latestNarrativeTime = null; 
        let currentXmlMsgCount = 0;
        let lastParsedSmsWasMine = false;
        let newContactsMap = new Map();

        // 2. 全量解析
        chat.forEach(msg => {
            if (!msg.mes) return;
            const cleanMsg = msg.mes.replace(/```/g, ''); 
            
            // 提取剧情时间
            const timeMatch = cleanMsg.match(REGEX_STORY_TIME);
            if (timeMatch && timeMatch[1]) latestNarrativeTime = timeMatch[1].trim();

            // 提取短信内容
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
                
                // 忽略用户自己发给自己的
                if (isUserSender(contactName, context)) return;

                // 初始化联系人
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

                // 防复读去重
                const lastMsgInHistory = contact.messages[contact.messages.length - 1];
                if (isMyMessage && lastMsgInHistory && lastMsgInHistory.sender === 'user' && lastMsgInHistory.text === content) {
                    return; 
                }

                // 存入消息
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

        // 3. 未读消息判定
        newContactsMap.forEach((contact, id) => {
            const oldContact = cachedContactsMap.get(id);
            const isCountIncreased = !oldContact || contact.messages.length > oldContact.messages.length;
            
            if (isCountIncreased) {
                const lastMsg = contact.messages[contact.messages.length - 1];
                if (lastMsg && lastMsg.sender !== 'user') {
                    if (window.ST_PHONE.state.activeContactId !== id) {
                        window.ST_PHONE.state.unreadIds.add(id);
                    }
                }
            }
        });

        cachedContactsMap = newContactsMap;
        if (latestNarrativeTime) window.ST_PHONE.state.virtualTime = latestNarrativeTime;

        // 4. 通知音效逻辑
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

        // 5. 处理 Pending (待发送) 队列
        const queue = window.ST_PHONE.state.pendingQueue;
        const now = Date.now();
        const MAX_PENDING_TIME = 600000; 

        if (queue.length > 0) {
            const activeQueue = queue.filter(pMsg => (now - pMsg.sendTime < MAX_PENDING_TIME));
            window.ST_PHONE.state.pendingQueue = activeQueue; 

            activeQueue.forEach(pMsg => {
                let contact = newContactsMap.get(pMsg.target);
                if (!contact) {
                    contact = {
                        id: pMsg.target,
                        name: pMsg.target,
                        lastMsg: '',
                        time: window.ST_PHONE.state.virtualTime,
                        messages: [],
                        lastTimestamp: Date.now() 
                    };
                    newContactsMap.set(pMsg.target, contact);
                }
                
                const pendingTimeStr = window.ST_PHONE.state.virtualTime;
                const pendingDate = parseTimeStr(pendingTimeStr);
                const datePartMatch = pendingTimeStr.match(/(\d+月\d+日)/);

                contact.messages.push({
                    sender: 'user',
                    text: pMsg.text,
                    isPending: true, 
                    timeStr: pendingTimeStr,
                    timestamp: pendingDate.getTime(), 
                    dateStr: datePartMatch ? datePartMatch[1] : ''
                });
                contact.lastMsg = pMsg.text;
                contact.lastTimestamp = pendingDate.getTime();
                
                window.ST_PHONE.state.unreadIds.delete(pMsg.target);
            });
        }

        // 6. 排序与渲染
        let contactList = Array.from(newContactsMap.values());
        contactList.forEach(c => c.hasUnread = window.ST_PHONE.state.unreadIds.has(c.id));
        contactList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        window.ST_PHONE.state.contacts = contactList;

        if (window.ST_PHONE.ui.updateStatusBarTime) {
            window.ST_PHONE.ui.updateStatusBarTime(window.ST_PHONE.state.virtualTime);
        }

        // === 关键：触发同步 ===
        if (window.ST_PHONE.scribe && typeof window.ST_PHONE.scribe.sync === 'function') {
            try {
                window.ST_PHONE.scribe.sync(window.ST_PHONE.state.contacts);
            } catch(e) { console.warn('WorldBook sync failed:', e); }
        }
        
        if (window.ST_PHONE.ui.renderContacts) {
            const searchInput = document.getElementById('phone-search-bar');
            if (!searchInput || !searchInput.value) {
                window.ST_PHONE.ui.renderContacts();
            }
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

    // ----------------------------------------------------------------------
    // 新版发送逻辑
    // ----------------------------------------------------------------------
    async function sendDraftToInput() {
        const input = document.getElementById('msg-input'); 
        const text = input.value.trim();
        const activeId = window.ST_PHONE.state.activeContactId;
        
        if (!text || !activeId) return;

        let contact = window.ST_PHONE.state.contacts.find(c => c.id === activeId);
        const targetName = contact ? contact.name : activeId;
        const timeToSend = window.ST_PHONE.state.virtualTime;

        const xmlString = `<msg>{{user}}|${targetName}|${text}|${timeToSend}</msg>`;

        try {
            const context = SillyTavern.getContext();
            const currentChat = context.chat;

            const newMessage = {
                name: context.name1, 
                is_user: true,
                is_system: false,
                send_date: getSystemTimeStr(),
                mes: xmlString, 
                extra: {} 
            };

            currentChat.push(newMessage);
            
            if (SillyTavern.saveChat) {
                await SillyTavern.saveChat();
            } else if (context.saveChat) {
                await context.saveChat();
            }

            if (SillyTavern.generate) {
                SillyTavern.generate(); 
            } else {
                const generateBtn = document.getElementById('send_textarea'); 
                if(typeof eventSource !== 'undefined') {
                    eventSource.emit('chat_changed');
                    const realSendBtn = document.getElementById('send_but');
                    if(realSendBtn) realSendBtn.click();
                }
            }

            window.ST_PHONE.state.pendingQueue.push({
                text: text,
                target: targetName,
                sendTime: Date.now()
            });
            window.ST_PHONE.state.lastUserSendTime = Date.now();

            input.value = '';
            
            scanChatHistory();

        } catch (e) {
            console.error('ST Phone Send Error:', e);
            alert('发送失败，请检查控制台报错。');
        }
    }

    // ----------------------------------------------------------------------
    // 初始化与事件绑定 (Lifecycle - Robust Fix)
    // ----------------------------------------------------------------------
    function initCore() {
        console.log('✅ ST-iOS-Phone: 核心逻辑已挂载 (v3.2 Robust)');

        const sendBtn = document.getElementById('btn-send');
        if(sendBtn) sendBtn.onclick = sendDraftToInput;

        // === 修复核心：事件源连接重试机制 ===
        let retryCount = 0;
        const MAX_RETRIES = 20; // 尝试 10秒

        function connectEventSource() {
            if (typeof eventSource !== 'undefined') {
                console.log('🔗 ST-iOS-Phone: 成功连接到 EventSource!');
                
                const debouncedScan = debounce(scanChatHistory, 200);

                // 绑定各类事件
                eventSource.on('chat_id_changed', () => {
                    window.ST_PHONE.state.unreadIds.clear(); 
                    scanChatHistory();
                });
                eventSource.on('chat_changed', debouncedScan);
                eventSource.on('generation_ended', debouncedScan);
                eventSource.on('group_chat_updated', debouncedScan);

                // 连接成功，立刻运行一次
                scanChatHistory();
                return;
            }

            if (retryCount < MAX_RETRIES) {
                retryCount++;
                // console.log(`⏳ 等待 EventSource 就绪 (${retryCount})...`); 
                setTimeout(connectEventSource, 500); // 每0.5秒查一次
            } else {
                // 彻底失败，回退到轮询
                console.warn('⚠️ ST Phone: EventSource 连接超时，启动安全轮询模式 (Interval: 5000ms)。');
                // 关键修复：轮询间隔设为 5000ms，大于 scribe 的 2000ms 防抖时间，防止死锁
                setInterval(scanChatHistory, 5000); 
                scanChatHistory(); 
            }
        }

        // 启动连接尝试
        connectEventSource();
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

})();
