// ==================================================================================
// 模块: Core (核心逻辑 - v3.0 Event-Driven Refactor)
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

        // 2. 全量解析 (在 ST 1.14+ 中，性能通常不是瓶颈，全量解析更稳健)
        // 注意：这里保留了原版的正则逻辑，因为它对 <msg> 格式的兼容性最好
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
                
                // 忽略用户自己发给自己的（很少见）
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

                // 简单的防复读去重
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

        // 3. 未读消息判定 (对比旧 Map)
        newContactsMap.forEach((contact, id) => {
            const oldContact = cachedContactsMap.get(id);
            // 如果旧缓存里没有，或者新消息数量更多，且最新一条不是我发的
            const isCountIncreased = !oldContact || contact.messages.length > oldContact.messages.length;
            
            if (isCountIncreased) {
                const lastMsg = contact.messages[contact.messages.length - 1];
                if (lastMsg && lastMsg.sender !== 'user') {
                    // 如果当前没有打开这个人的聊天窗口，则标记为未读
                    if (window.ST_PHONE.state.activeContactId !== id) {
                        window.ST_PHONE.state.unreadIds.add(id);
                    }
                }
            }
        });

        // 更新缓存
        cachedContactsMap = newContactsMap;
        if (latestNarrativeTime) window.ST_PHONE.state.virtualTime = latestNarrativeTime;

        // 4. 通知音效逻辑
        if (lastXmlMsgCount === -1) {
            lastXmlMsgCount = currentXmlMsgCount;
        } else {
            if (currentXmlMsgCount > lastXmlMsgCount) {
                // 如果新增了消息，且最后一条不是我发的，且手机没打开 -> 响铃
                if (!lastParsedSmsWasMine && !window.ST_PHONE.state.isPhoneOpen) {
                    if (window.ST_PHONE.ui.setNotification) window.ST_PHONE.ui.setNotification(true);
                    if (window.ST_PHONE.ui.playNotificationSound) window.ST_PHONE.ui.playNotificationSound();
                }
            }
            lastXmlMsgCount = currentXmlMsgCount;
        }

        // 5. 处理 Pending (待发送) 队列
        // 这一步主要是为了让用户发完消息后立刻能在手机上看到，而不需要等 AI 生成完
        const queue = window.ST_PHONE.state.pendingQueue;
        const now = Date.now();
        const MAX_PENDING_TIME = 600000; // 10分钟超时

        if (queue.length > 0) {
            const activeQueue = queue.filter(pMsg => (now - pMsg.sendTime < MAX_PENDING_TIME));
            window.ST_PHONE.state.pendingQueue = activeQueue; 

            activeQueue.forEach(pMsg => {
                let contact = newContactsMap.get(pMsg.target);
                // 如果是对新人的发信，需要新建联系人对象
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
                
                // 构造临时消息展示
                const pendingTimeStr = window.ST_PHONE.state.virtualTime;
                const pendingDate = parseTimeStr(pendingTimeStr);
                const datePartMatch = pendingTimeStr.match(/(\d+月\d+日)/);

                contact.messages.push({
                    sender: 'user',
                    text: pMsg.text,
                    isPending: true, // 标记为发送中
                    timeStr: pendingTimeStr,
                    timestamp: pendingDate.getTime(), 
                    dateStr: datePartMatch ? datePartMatch[1] : ''
                });
                contact.lastMsg = pMsg.text;
                contact.lastTimestamp = pendingDate.getTime();
                
                // 我发消息了，清除未读
                window.ST_PHONE.state.unreadIds.delete(pMsg.target);
            });
        }

        // 6. 排序与渲染
        let contactList = Array.from(newContactsMap.values());
        contactList.forEach(c => c.hasUnread = window.ST_PHONE.state.unreadIds.has(c.id));
        contactList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        window.ST_PHONE.state.contacts = contactList;

        // 更新状态栏时间
        if (window.ST_PHONE.ui.updateStatusBarTime) {
            window.ST_PHONE.ui.updateStatusBarTime(window.ST_PHONE.state.virtualTime);
        }

        // 尝试同步到世界书 (如果 Scribe 模块可用且修复了的话)
        if (window.ST_PHONE.scribe && typeof window.ST_PHONE.scribe.sync === 'function') {
            try {
                window.ST_PHONE.scribe.sync(window.ST_PHONE.state.contacts);
            } catch(e) { console.warn('WorldBook sync failed:', e); }
        }
        
        // 渲染 UI
        if (window.ST_PHONE.ui.renderContacts) {
            // 如果没在搜索，才刷新列表，防止打字被打断
            const searchInput = document.getElementById('phone-search-bar');
            if (!searchInput || !searchInput.value) {
                window.ST_PHONE.ui.renderContacts();
            }
            // 如果正开着某人的聊天，实时刷新
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
    // 新版发送逻辑 (Use Internal API)
    // ----------------------------------------------------------------------
    async function sendDraftToInput() {
        const input = document.getElementById('msg-input'); // 手机里的输入框
        const text = input.value.trim();
        const activeId = window.ST_PHONE.state.activeContactId;
        
        if (!text || !activeId) return;

        let contact = window.ST_PHONE.state.contacts.find(c => c.id === activeId);
        const targetName = contact ? contact.name : activeId;
        const timeToSend = window.ST_PHONE.state.virtualTime;

        // 构造 Prompt 格式
        // 这里沿用 XML 格式，因为它是该插件的识别基准
        const xmlString = `<msg>{{user}}|${targetName}|${text}|${timeToSend}</msg>`;

        // === 关键修改：直接调用 ST 内部 API 发送 ===
        try {
            const context = SillyTavern.getContext();
            const currentChat = context.chat;

            // 1. 构建消息对象
            // 模仿 ST 内部的消息结构
            const newMessage = {
                name: context.name1, // 用户名
                is_user: true,
                is_system: false,
                send_date: getSystemTimeStr(),
                mes: xmlString, // 消息内容
                extra: {} 
            };

            // 2. 推入聊天数组
            currentChat.push(newMessage);
            
            // 3. 触发保存 (这会更新本地存储和界面)
            if (SillyTavern.saveChat) {
                await SillyTavern.saveChat();
            } else if (context.saveChat) {
                await context.saveChat();
            }

            // 4. 触发 AI 生成 (如果需要的话)
            // 通常发短信是希望 AI 回复的
            if (SillyTavern.generate) {
                SillyTavern.generate(); 
            } else {
                // 1.14.0 可能改变了全局函数的挂载位置，尝试触发事件或点击
                const generateBtn = document.getElementById('send_textarea'); 
                // 如果找不到 API，作为最后手段，我们可以尝试触发 UI 更新事件
                console.log('ST Phone: Message injected, attempting to trigger generation...');
                // 1.14.0 通常可以通过 eventSource 触发
                // 但最稳妥的还是直接修改数据后让 ST 反应过来
                if(typeof eventSource !== 'undefined') {
                    eventSource.emit('chat_changed');
                    // 模拟点击生成按钮 (作为最后的保底，虽然我们尽量避免 DOM 操作)
                    const realSendBtn = document.getElementById('send_but');
                    if(realSendBtn) realSendBtn.click();
                }
            }

            // 5. 更新本地 Pending 队列 (为了立刻在手机 UI 上显示，不用等 AI 生成完)
            window.ST_PHONE.state.pendingQueue.push({
                text: text,
                target: targetName,
                sendTime: Date.now()
            });
            window.ST_PHONE.state.lastUserSendTime = Date.now();

            // 6. 清空手机输入框
            input.value = '';
            
            // 立即刷新一次手机界面
            scanChatHistory();

        } catch (e) {
            console.error('ST Phone Send Error:', e);
            alert('发送失败，请检查控制台报错。');
        }
    }

    // ----------------------------------------------------------------------
    // 初始化与事件绑定 (Lifecycle)
    // ----------------------------------------------------------------------
    function initCore() {
        console.log('✅ ST-iOS-Phone: 核心逻辑已挂载 (v3.0 Event-Driven)');

        // 1. 绑定发送按钮
        const sendBtn = document.getElementById('btn-send');
        if(sendBtn) sendBtn.onclick = sendDraftToInput;

        // 2. 注册 ST 事件监听 (Event Source)
        // 这是 1.14.0 推荐的方式，不再使用 setInterval
        if (typeof eventSource !== 'undefined') {
            
            const debouncedScan = debounce(scanChatHistory, 200);

            // 当聊天加载、切换、有新消息时
            eventSource.on('chat_id_changed', () => {
                window.ST_PHONE.state.unreadIds.clear(); // 换卡了，清空未读
                scanChatHistory();
            });
            eventSource.on('chat_changed', debouncedScan);
            
            // 当 AI 生成结束时 (确保能读到 AI 回复的短信)
            eventSource.on('generation_ended', debouncedScan);
            
            // 也可以监听群聊变化等
            eventSource.on('group_chat_updated', debouncedScan);

            // 首次运行扫描
            scanChatHistory();
        } else {
            console.warn('ST Phone: eventSource not found, falling back to legacy polling.');
            setInterval(scanChatHistory, 2000); // 只有在极旧版本才回退
        }
    }

    // 防抖工具函数
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

})();
