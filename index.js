// ==================================================================================
// 脚本名称: ST-iOS-Phone-Core (Phase 2 - Live Data Connection)
// ==================================================================================

(function () {
    // 1. 防止重复加载
    if (document.getElementById('st-ios-phone-root')) return;

    console.log('📱 ST-iOS-Phone: 初始化中...');

    // ==================================================================================
    // HTML 结构 (保持原样，无需变动)
    // ==================================================================================
    const html = `
    <div id="st-ios-phone-root">
        <div id="st-phone-icon">
            <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
        </div>

        <div id="st-phone-window">
            <div class="phone-notch-area" id="phone-drag-handle">
                <div class="phone-notch"></div>
            </div>
            
            <div class="app-container">
                <div class="pages-wrapper">
                    
                    <div class="page active" id="page-contacts">
                        <div class="nav-bar">
                            <button class="nav-btn" style="visibility:hidden">编辑</button>
                            <span class="nav-title">信息</span>
                            <button class="nav-btn icon" id="btn-reload-data" title="刷新数据">↻</button>
                        </div>
                        <div class="contact-list" id="contact-list-container">
                            </div>
                    </div>

                    <div class="page hidden-right" id="page-chat">
                        <div class="nav-bar">
                            <button class="nav-btn" id="btn-back">❮ 信息</button>
                            <span class="nav-title" id="chat-title">用户</span>
                            <button class="nav-btn" style="visibility:hidden">...</button>
                        </div>
                        <div class="chat-scroll-area" id="chat-messages-container">
                            </div>
                        <div class="input-area">
                            <div class="plus-btn" title="表情包/图片">+</div>
                            <input type="text" class="chat-input" placeholder="iMessage" id="msg-input">
                            <div class="send-btn" id="btn-send">
                                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    // ==================================================================================
    // 核心逻辑：数据接入层 (Brain Connection)
    // ==================================================================================

    // 全局状态 - 这里存放从聊天记录里“抠”出来的数据
    const phoneState = {
        activeContactId: null,
        contacts: [] // 结构: { id, name, lastMsg, time, messages: [] }
    };

    /**
     * 正则表达式配置
     * 目标格式：(短信-角色名): 内容
     * 兼容格式：(短信 - 角色名) : 内容
     */
    const REGEX_SMS = /\(短信\s*-\s*([^)]+)\)\s*:\s*(.+)/i;

    // --- 数据处理：解析单条消息 ---
    function parseMessageAndUpsert(msgText, isUser, timestamp) {
        if (!msgText) return;

        // 1. 尝试匹配正则
        const match = msgText.match(REGEX_SMS);
        
        // 如果是用户发送，我们假设他是发给“当前正在聊天的对象” (这块逻辑后续Phase 3可以优化)
        // 目前为了演示，如果正则没匹配到，我们暂时忽略，或者你可以定义一个默认逻辑
        
        let contactName = null;
        let content = null;

        if (match) {
            // 匹配到了：(短信-Alice): 嘿！
            contactName = match[1].trim();
            content = match[2].trim();
        } else if (isUser && phoneState.activeContactId) {
            // 没匹配到，但是是用户发的，归入当前聊天窗口
            // 注意：这只是为了演示，实际逻辑可能需要用户手动指定发给谁，或者解析 /send 指令
            return; 
        } else {
            return; // 既不是正则短信，也不是用户发的，忽略
        }

        // 2. 查找或创建联系人
        let contact = phoneState.contacts.find(c => c.name === contactName);
        if (!contact) {
            contact = {
                id: contactName, // 暂时用名字当ID
                name: contactName,
                lastMsg: '',
                time: '',
                messages: []
            };
            phoneState.contacts.push(contact);
        }

        // 3. 写入消息
        contact.messages.push({
            sender: isUser ? 'user' : 'char',
            text: content
        });
        
        // 4. 更新预览信息
        contact.lastMsg = content;
        // 简单处理时间，实际可从 event 获取 timestamp
        const date = new Date(); 
        contact.time = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // --- 数据处理：扫描完整历史记录 ---
    async function scanChatHistory() {
        console.log('📱 ST-iOS-Phone: 开始扫描聊天记录...');
        
        // 清空当前状态
        phoneState.contacts = [];
        
        // 获取 ST 上下文
        if (typeof SillyTavern === 'undefined') {
            console.error('❌ 未检测到 SillyTavern 环境，无法获取聊天记录。');
            return;
        }

        const context = SillyTavern.getContext();
        const chat = context.chat; // 获取当前聊天数组

        if (!chat || chat.length === 0) return;

        // 遍历每一条消息
        chat.forEach(msg => {
            // ST 的消息结构通常包含: name, mes, is_user
            const text = msg.mes; 
            const isUser = msg.is_user;
            
            parseMessageAndUpsert(text, isUser);
        });

        console.log('📱 扫描完成，联系人:', phoneState.contacts);
        renderContacts();
        
        // 如果当前打开了聊天窗口，刷新聊天视图
        if (phoneState.activeContactId) {
            const contact = phoneState.contacts.find(c => c.id === phoneState.activeContactId);
            if (contact) renderChat(contact);
        }
    }

    // --- 事件监听：ST 事件挂钩 ---
    function initEventListeners() {
        // 1. 监听聊天生成结束 (AI 回复完毕) -> 解析最新消息
        // 注意: tavern_events 是 ST 的全局变量
        if (typeof eventOn !== 'undefined') {
            eventOn('generation_ended', () => {
                console.log('📱 检测到新回复，重新扫描...');
                scanChatHistory(); // 简单粗暴：有新消息就重扫一遍（数据量不大时性能可接受）
            });

            // 2. 监听聊天切换 (切卡) -> 清空并重新扫描
            eventOn('chat_id_changed', () => {
                console.log('📱 聊天对象切换，刷新手机数据...');
                scanChatHistory();
            });
            
            // 3. 监听消息被编辑/删除 -> 重新扫描
            eventOn('message_updated', scanChatHistory);
            eventOn('message_deleted', scanChatHistory);
        } else {
            console.warn('⚠️ eventOn 未定义，无法监听 ST 事件 (可能在独立网页测试中?)');
        }
    }

    // ==================================================================================
    // UI 逻辑 (复用 Phase 1 代码，适配新数据结构)
    // ==================================================================================
    
    // --- 拖拽与显隐 ---
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    makeDraggable(document.getElementById("st-phone-window"), document.getElementById("phone-drag-handle"));
    makeDraggable(document.getElementById("st-phone-icon"), document.getElementById("st-phone-icon"));

    const icon = document.getElementById('st-phone-icon');
    const windowEl = document.getElementById('st-phone-window');
    let isPhoneOpen = false;

    icon.addEventListener('click', () => {
        isPhoneOpen = !isPhoneOpen;
        windowEl.style.display = isPhoneOpen ? 'block' : 'none';
        if (isPhoneOpen) scanChatHistory(); // 打开手机时刷新一次
    });

    // --- 渲染 ---
    function renderContacts() {
        const container = document.getElementById('contact-list-container');
        container.innerHTML = '';
        
        if (phoneState.contacts.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">暂无短信<br>请在正文中使用格式:<br>(短信-名字): 内容</div>';
            return;
        }

        phoneState.contacts.forEach(contact => {
            const el = document.createElement('div');
            el.className = 'contact-item';
            el.innerHTML = `
                <div class="info">
                    <div class="name-row">
                        <span class="name">${contact.name}</span>
                        <span class="time">${contact.time}</span>
                    </div>
                    <div class="preview">${contact.lastMsg}</div>
                </div>
            `;
            el.onclick = () => openChat(contact);
            container.appendChild(el);
        });
    }

    function renderChat(contact) {
        const container = document.getElementById('chat-messages-container');
        container.innerHTML = '';
        container.appendChild(document.createElement('div')).style.height = '10px';
        
        contact.messages.forEach(msg => {
            const el = document.createElement('div');
            el.className = `message-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`;
            el.innerText = msg.text;
            container.appendChild(el);
        });
        
        setTimeout(() => container.scrollTop = container.scrollHeight, 50);
    }

    function openChat(contact) {
        phoneState.activeContactId = contact.id;
        document.getElementById('chat-title').innerText = contact.name;
        renderChat(contact);
        
        document.getElementById('page-contacts').classList.add('hidden-left');
        document.getElementById('page-contacts').classList.remove('active');
        document.getElementById('page-chat').classList.remove('hidden-right');
        document.getElementById('page-chat').classList.add('active');
    }

    function closeChat() {
        phoneState.activeContactId = null;
        
        document.getElementById('page-contacts').classList.remove('hidden-left');
        document.getElementById('page-contacts').classList.add('active');
        document.getElementById('page-chat').classList.add('hidden-right');
        document.getElementById('page-chat').classList.remove('active');
    }

    document.getElementById('btn-back').onclick = closeChat;
    
    // 手动刷新按钮（方便调试）
    document.getElementById('btn-reload-data').onclick = () => {
        scanChatHistory();
        // 添加一个小动画反馈
        const btn = document.getElementById('btn-reload-data');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => btn.style.transform = 'none', 500);
    };

    // --- 交互：发送逻辑 (Phase 2 修改：仅模拟显示，不真实发送给AI) ---
    // 注意：真正的发送逻辑需要在 Phase 3 结合 /send 命令实现
    document.getElementById('btn-send').onclick = () => {
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        if (!text || !phoneState.activeContactId) return;

        // 暂时只更新本地 UI
        const contact = phoneState.contacts.find(c => c.id === phoneState.activeContactId);
        if (contact) {
            contact.messages.push({ sender: 'user', text: text });
            contact.lastMsg = text;
            renderChat(contact);
            renderContacts();
        }
        input.value = '';
    };

    // ==================================================================================
    // 启动
    // ==================================================================================
    // 延时一点启动，确保 ST 上下文已就绪
    setTimeout(() => {
        initEventListeners();
        scanChatHistory();
        console.log('✅ ST-iOS-Phone: Phase 2 (数据接入) 加载完成');
    }, 1000);

})();
