// ==================================================================================
// 脚本名称: ST-iOS-Phone-Core (Phase 1)
// ==================================================================================

(function () {
    // 1. 防止重复加载
    if (document.getElementById('st-ios-phone-root')) return;

    // ==================================================================================
    // CSS 样式 (iOS 风格复刻)
    // ==================================================================================
    const css = `
    /* 悬浮图标 */
    #st-phone-icon {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: #333;
        border-radius: 18px;
        cursor: pointer;
        z-index: 9998;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        background-image: linear-gradient(135deg, #4c4c4c, #1a1a1a);
    }
    #st-phone-icon:active { transform: scale(0.95); }
    #st-phone-icon svg { width: 32px; height: 32px; fill: white; }

    /* 手机主窗口 */
    #st-phone-window {
        position: fixed;
        top: 100px;
        left: 100px;
        width: 375px;
        height: 667px; /* iPhone 8 尺寸，经典比例 */
        background-color: #000;
        border-radius: 40px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        z-index: 9999;
        display: none; /* 默认隐藏 */
        overflow: hidden;
        border: 12px solid #1c1c1c;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* 顶部拖拽条 (灵动岛/刘海区域) */
    .phone-notch-area {
        width: 100%;
        height: 30px;
        background-color: #f2f2f7; /* iOS 浅色背景 */
        cursor: move;
        display: flex;
        justify-content: center;
        align-items: center;
        border-bottom: 1px solid #e5e5ea;
    }
    .phone-notch {
        width: 60px;
        height: 5px;
        background-color: #ccc;
        border-radius: 10px;
    }

    /* 应用容器 */
    .app-container {
        width: 100%;
        height: calc(100% - 30px);
        background-color: #fff;
        position: relative;
        overflow: hidden;
    }

    /* 页面切换动画容器 */
    .pages-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
    }

    /* 通用页面样式 */
    .page {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background-color: #fff;
        transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
        display: flex;
        flex-direction: column;
    }

    /* 页面状态控制 */
    .page.hidden-left { transform: translateX(-100%); }
    .page.hidden-right { transform: translateX(100%); }
    .page.active { transform: translateX(0); }

    /* 顶部导航栏 */
    .nav-bar {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        background-color: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0,0,0,0.1);
        z-index: 10;
    }
    .nav-title { font-weight: 600; font-size: 17px; }
    .nav-btn { color: #007AFF; font-size: 17px; cursor: pointer; background: none; border: none; padding: 0; }
    .nav-btn.icon { font-size: 24px; line-height: 1; }

    /* 联系人列表 */
    .contact-list { flex: 1; overflow-y: auto; }
    .contact-item {
        display: flex;
        align-items: center;
        padding: 10px 16px;
        border-bottom: 1px solid #c6c6c8;
        cursor: pointer;
        transition: background 0.2s;
    }
    .contact-item:active { background-color: #e5e5ea; }
    .avatar {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background-color: #ccc;
        margin-right: 12px;
        background-size: cover;
        background-position: center;
    }
    .info { flex: 1; min-width: 0; }
    .name-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .name { font-weight: 600; font-size: 16px; color: #000; }
    .time { font-size: 14px; color: #8e8e93; }
    .preview { font-size: 14px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    /* 聊天界面 */
    .chat-scroll-area {
        flex: 1;
        overflow-y: auto;
        padding: 10px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background-color: #fff;
    }
    
    .message-bubble {
        max-width: 75%;
        padding: 8px 12px;
        border-radius: 18px;
        font-size: 16px;
        line-height: 1.4;
        position: relative;
        word-wrap: break-word;
    }
    
    /* 对方的消息 (灰) */
    .message-bubble.received {
        align-self: flex-start;
        background-color: #E5E5EA;
        color: #000;
        border-bottom-left-radius: 4px;
    }
    
    /* 我的消息 (蓝) */
    .message-bubble.sent {
        align-self: flex-end;
        background-color: #007AFF;
        color: #fff;
        border-bottom-right-radius: 4px;
    }

    /* 输入区域 */
    .input-area {
        padding: 8px 10px;
        background-color: #f2f2f7;
        display: flex;
        align-items: center;
        gap: 10px;
        border-top: 1px solid #c6c6c8;
    }
    .plus-btn {
        width: 30px;
        height: 30px;
        background-color: #c7c7cc;
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
    }
    .chat-input {
        flex: 1;
        border: 1px solid #c6c6c8;
        border-radius: 18px;
        padding: 8px 12px;
        font-size: 16px;
        outline: none;
        background: white;
    }
    .send-btn {
        width: 30px;
        height: 30px;
        background-color: #007AFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }
    .send-btn svg { width: 16px; height: 16px; fill: white; margin-left: 2px; }

    /* 滚动条隐藏但可滚动 */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ==================================================================================
    // HTML 结构
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
                            <button class="nav-btn" style="visibility:hidden">编辑</button> <span class="nav-title">信息</span>
                            <button class="nav-btn icon" id="btn-add-contact">+</button>
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
    // 逻辑部分 (Phase 1)
    // ==================================================================================
    
    // 1. 拖拽逻辑 (封装)
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

    // 应用拖拽
    makeDraggable(document.getElementById("st-phone-window"), document.getElementById("phone-drag-handle"));
    makeDraggable(document.getElementById("st-phone-icon"), document.getElementById("st-phone-icon"));

    // 2. 显隐切换
    const icon = document.getElementById('st-phone-icon');
    const windowEl = document.getElementById('st-phone-window');
    let isPhoneOpen = false;

    icon.addEventListener('click', () => {
        isPhoneOpen = !isPhoneOpen;
        windowEl.style.display = isPhoneOpen ? 'block' : 'none';
    });

    // 3. 基础路由与数据模拟 (Mock Data)
    const state = {
        activeContactId: null,
        contacts: [
            { id: 'alice', name: '艾丽丝', avatar: '', lastMsg: '上次那个地牢真的太危险了！', time: '12:30', messages: [
                { sender: 'user', text: '你好呀，艾丽丝！' },
                { sender: 'char', text: '嘿！好久不见！' },
                { sender: 'char', text: '上次那个地牢真的太危险了！' }
            ]},
            { id: 'bob', name: '鲍勃', avatar: '', lastMsg: '装备我都修好了。', time: '昨天', messages: [
                { sender: 'char', text: '老板，盾牌坏了。' },
                { sender: 'user', text: '放我这，我帮你修。' },
                { sender: 'char', text: '装备我都修好了。' }
            ]}
        ]
    };

    // 渲染联系人列表
    function renderContacts() {
        const container = document.getElementById('contact-list-container');
        container.innerHTML = '';
        state.contacts.forEach(contact => {
            const el = document.createElement('div');
            el.className = 'contact-item';
            el.innerHTML = `
                <div class="avatar" style="${contact.avatar ? `background-image: url(${contact.avatar})` : ''}"></div>
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

    // 渲染聊天记录
    function renderChat(contact) {
        const container = document.getElementById('chat-messages-container');
        container.innerHTML = '';
        // 顶部留白
        container.appendChild(document.createElement('div')).style.height = '10px';
        
        contact.messages.forEach(msg => {
            const el = document.createElement('div');
            el.className = `message-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`;
            el.innerText = msg.text;
            container.appendChild(el);
        });
        
        // 自动滚动到底部
        setTimeout(() => container.scrollTop = container.scrollHeight, 50);
    }

    // 页面导航逻辑
    function openChat(contact) {
        state.activeContactId = contact.id;
        document.getElementById('chat-title').innerText = contact.name;
        renderChat(contact);
        
        // 切换页面动画
        document.getElementById('page-contacts').classList.add('hidden-left');
        document.getElementById('page-contacts').classList.remove('active');
        document.getElementById('page-chat').classList.remove('hidden-right');
        document.getElementById('page-chat').classList.add('active');
    }

    function closeChat() {
        state.activeContactId = null;
        
        // 切换页面动画
        document.getElementById('page-contacts').classList.remove('hidden-left');
        document.getElementById('page-contacts').classList.add('active');
        document.getElementById('page-chat').classList.add('hidden-right');
        document.getElementById('page-chat').classList.remove('active');
    }

    // 绑定返回按钮
    document.getElementById('btn-back').onclick = closeChat;

    // 4. 发送消息演示 (仅本地 UI 更新)
    document.getElementById('btn-send').onclick = () => {
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        if (!text || !state.activeContactId) return;

        // 找到当前联系人推入消息
        const contact = state.contacts.find(c => c.id === state.activeContactId);
        if (contact) {
            contact.messages.push({ sender: 'user', text: text });
            contact.lastMsg = text;
            contact.time = '现在';
            renderChat(contact); // 刷新聊天
            renderContacts(); // 刷新列表预览
        }
        input.value = '';
    };

    // 初始化渲染
    renderContacts();
    console.log('ST-iOS-Phone-Core 加载完成');

})();
