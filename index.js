(function () {
    const SETTING_KEY = "open_world_phone_data";
    
    // 内置表情包 (使用了网络图床，保证可见)
    const EMOJI_LIST = [
        "https://sharkpan.xyz/f/vVBtL/mmexport1737057690899.png", // 顶嘴
        "https://sharkpan.xyz/f/pO6uQ/mmexport1737057701883.png", // 免礼
        "https://sharkpan.xyz/f/1vAc2/mmexport1737057678306.png", // 走吧
        "https://sharkpan.xyz/f/e8KUw/mmexport1737057664689.png", // 满意
        "https://sharkpan.xyz/f/oJ1i4/mmexport1737057862640.gif", // 揍你
        "https://sharkpan.xyz/f/8r2Sj/mmexport1737057726579.png", // 坏蛋
        "https://sharkpan.xyz/f/Gvmil/mmexport1737057801285.gif", // 关心
        "https://sharkpan.xyz/f/zMZu5/mmexport1737057848709.gif", // 撞飞
        "https://sharkpan.xyz/f/53nhj/345FFC998474F46C1A40B1567335DA03_0.gif", // 爱心
        "https://sharkpan.xyz/f/kDOi6/0A231BF0BFAB3C2B243F9749B64F7444_0.gif"  // 飞奔
    ];

    const State = {
        contacts: {}, 
        currentChat: null,
        isOpen: false,
        isDragging: false
    };

    function init() {
        console.log("[OW Phone] Init v1.2");
        loadData();
        
        const layout = `
        <div id="ow-phone-toggle" title="打开手机">
            📱<span id="ow-main-badge" class="ow-badge" style="display:none">0</span>
        </div>

        <div id="ow-phone-container" class="ow-hidden">
            <div id="ow-phone-header">
                <div class="ow-header-icon" id="ow-back-btn" style="display:none">❮</div>
                <div id="ow-header-title">通讯录</div>
                <div class="ow-header-icon" id="ow-add-btn" title="添加好友">➕</div>
                <div class="ow-header-icon" id="ow-close-btn" title="关闭">✖</div>
            </div>
            
            <div id="ow-phone-body"></div>
            
            <div id="ow-chat-footer" style="display:none">
                <div id="ow-input-row">
                    <input id="ow-input" placeholder="输入信息..." autocomplete="off">
                    <div class="ow-footer-icon" id="ow-emoji-btn">☺</div>
                    <button id="ow-send-btn">发送</button>
                </div>
                <div id="ow-emoji-panel" style="display:none"></div>
            </div>
        </div>
        `;
        $('body').append(layout);

        renderEmojiPanel();
        bindEvents();
        startMessageListener();
        
        // 初始化视图
        renderContactList();
    }

    function bindEvents() {
        // 1. 基础开关
        $('#ow-phone-toggle').click(() => togglePhone(true));
        $('#ow-close-btn').click(() => togglePhone(false));
        
        // 2. 导航与功能
        $('#ow-back-btn').click(() => {
            renderContactList(); // 返回列表
        });

        // 加好友按钮逻辑
        $('#ow-add-btn').click(() => {
            const name = prompt("【添加好友】请输入对方的名字：");
            if (name && name.trim()) {
                const cleanName = name.trim();
                // 1. 如果不存在，创建数据
                if (!State.contacts[cleanName]) {
                    State.contacts[cleanName] = { 
                        messages: [], 
                        unread: 0, 
                        color: getRandomColor() 
                    };
                    saveData();
                }
                // 2. 无论是否已存在，直接跳转到聊天界面
                renderChat(cleanName);
            }
        });

        // 3. 发送相关
        $('#ow-send-btn').click(handleUserSend);
        $('#ow-input').keypress((e) => { if(e.key === 'Enter') handleUserSend(); });

        // 4. 表情包开关
        $('#ow-emoji-btn').click(() => {
            $('#ow-emoji-panel').slideToggle(150);
        });

        // 5. 拖拽逻辑 (原生)
        const header = document.getElementById('ow-phone-header');
        const container = document.getElementById('ow-phone-container');
        let offset = {x:0, y:0};

        header.onmousedown = (e) => {
            // 只有点击空白处或标题时才拖拽，避免误触按钮
            if (e.target.classList.contains('ow-header-icon')) return;
            State.isDragging = true;
            offset.x = e.clientX - container.offsetLeft;
            offset.y = e.clientY - container.offsetTop;
            header.style.cursor = 'grabbing';
        };
        document.onmouseup = () => {
            State.isDragging = false;
            header.style.cursor = 'grab';
        };
        document.onmousemove = (e) => {
            if(!State.isDragging) return;
            e.preventDefault();
            container.style.left = (e.clientX - offset.x) + 'px';
            container.style.top = (e.clientY - offset.y) + 'px';
            container.style.bottom = 'auto'; // 清除定位
            container.style.right = 'auto';
        };
    }

    // === 核心：追加到酒馆输入框 ===
    function appendToMainInput(text) {
        const textarea = document.getElementById('send_textarea');
        if (!textarea) return;

        let currentVal = textarea.value;
        // 如果输入框有内容且没换行，加个换行
        if (currentVal.length > 0 && !currentVal.endsWith('\n')) {
            currentVal += '\n';
        }
        
        textarea.value = currentVal + text;
        
        // 触发事件，让酒馆知道内容变了
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        
        // 提示
        toastr.info(`已将短信内容填入输入框，请点击酒馆的“发送”`);
    }

    function handleUserSend() {
        const input = document.getElementById('ow-input');
        const text = input.value.trim();
        const target = State.currentChat;

        if (!text || !target) return;

        // 1. 手机上显示发出的消息
        addMessageLocal(target, text, 'sent');
        input.value = '';

        // 2. 生成指令并填入酒馆输入框
        // 格式： [SMS: 目标 | 内容]
        const command = `[SMS: ${target} | ${text}]`;
        appendToMainInput(command);
    }

    function sendEmoji(url) {
        const target = State.currentChat;
        if (!target) return;

        // 1. 本地显示图片
        const imgHtml = `<img src="${url}" class="ow-msg-img">`;
        addMessageLocal(target, imgHtml, 'sent');
        $('#ow-emoji-panel').hide();

        // 2. 生成指令
        const command = `[SMS: ${target} | [发送了一个表情包]]`;
        appendToMainInput(command);
    }

    // === 界面渲染 ===
    
    // 渲染联系人列表
    function renderContactList() {
        State.currentChat = null;
        $('#ow-header-title').text("通讯录");
        
        // 按钮状态：列表页显示加号，隐藏返回，隐藏关闭(保留关闭也行，这里保留)
        $('#ow-back-btn').hide();
        $('#ow-add-btn').show(); 
        $('#ow-close-btn').show();
        
        $('#ow-chat-footer').hide(); // 隐藏底部输入栏
        
        const body = $('#ow-phone-body');
        body.empty();

        const names = Object.keys(State.contacts);
        if (names.length === 0) {
            body.html(`
                <div class="ow-empty-state">
                    <div style="font-size:40px; margin-bottom:10px;">📭</div>
                    暂无联系人<br>点击右上角 ➕ 添加好友
                </div>
            `);
            return;
        }

        names.forEach(name => {
            const info = State.contacts[name];
            const lastMsg = info.messages[info.messages.length - 1];
            let preview = "暂无消息";
            if (lastMsg) {
                preview = lastMsg.content.includes('<img') ? '[图片]' : lastMsg.content;
            }

            const item = $(`
                <div class="ow-contact-item">
                    <div class="ow-avatar" style="background:${info.color || '#555'}">
                        ${name[0].toUpperCase()}
                        ${info.unread > 0 ? `<div class="ow-badge">${info.unread}</div>` : ''}
                    </div>
                    <div class="ow-info">
                        <div class="ow-name">${name}</div>
                        <div class="ow-preview">${preview}</div>
                    </div>
                </div>
            `);
            item.click(() => renderChat(name));
            body.append(item);
        });
    }

    // 渲染聊天界面
    function renderChat(name) {
        State.currentChat = name;
        
        // 清除未读
        if(State.contacts[name]) State.contacts[name].unread = 0;
        updateMainBadge();
        saveData();

        // 顶部变化
        $('#ow-header-title').text(name);
        $('#ow-back-btn').show(); // 显示返回
        $('#ow-add-btn').hide();  // 聊天时隐藏加人按钮，防误触
        
        // 底部显示
        $('#ow-chat-footer').show();
        $('#ow-emoji-panel').hide(); // 默认收起表情

        const body = $('#ow-phone-body');
        body.empty();
        
        const view = $('<div class="ow-chat-view"></div>');
        const msgs = State.contacts[name]?.messages || [];

        msgs.forEach(msg => {
            const isMe = msg.type === 'sent';
            const div = $(`<div class="ow-msg ${isMe ? 'ow-msg-right' : 'ow-msg-left'}">${msg.content}</div>`);
            view.append(div);
        });

        body.append(view);
        // 滚动到底部
        body[0].scrollTop = body[0].scrollHeight;
    }

    function renderEmojiPanel() {
        const panel = $('#ow-emoji-panel');
        panel.empty();
        EMOJI_LIST.forEach(url => {
            const img = $(`<img src="${url}" class="ow-emoji-item">`);
            img.click(() => sendEmoji(url));
            panel.append(img);
        });
    }

    // === 数据逻辑 ===
    function addMessageLocal(name, content, type) {
        if (!State.contacts[name]) {
            State.contacts[name] = { messages: [], unread: 0, color: getRandomColor() };
        }
        
        State.contacts[name].messages.push({
            type: type, // 'sent' or 'recv'
            content: content,
            time: Date.now()
        });

        if (type === 'recv' && State.currentChat !== name) {
            State.contacts[name].unread++;
        }
        
        saveData();
        updateMainBadge();
        
        // 如果当前正在看列表，刷新列表预览
        // 如果当前正在看这个人的聊天，刷新聊天
        if (State.isOpen) {
            if (State.currentChat === name) renderChat(name);
            else if (!State.currentChat) renderContactList();
        }
    }

    // 监听酒馆消息 (正则解析)
    function startMessageListener() {
        const observer = new MutationObserver(() => {
            const lastMsgEl = $('.mes_text').last();
            if (lastMsgEl.length === 0) return;
            const text = lastMsgEl.text();
            
            // 1. 加好友 [ADD_CONTACT: name]
            let match;
            const addRegex = /\[ADD_CONTACT:\s*(.+?)\]/g;
            while ((match = addRegex.exec(text)) !== null) {
                const name = match[1].trim();
                if (!State.contacts[name]) {
                    State.contacts[name] = { messages: [], unread: 0, color: getRandomColor() };
                    saveData();
                    toastr.success(`📱 自动添加好友: ${name}`);
                    if(State.isOpen && !State.currentChat) renderContactList();
                }
            }

            // 2. 收短信 [SMS: sender | content]
            const smsRegex = /\[SMS:\s*(.+?)\s*\|\s*(.+?)\]/g;
            while ((match = smsRegex.exec(text)) !== null) {
                const sender = match[1].trim();
                const content = match[2].trim();
                
                // 忽略自己发的（防止循环）
                if (sender !== '我' && sender.toLowerCase() !== 'user') {
                    // 简单防重：比较最后一条消息
                    const contact = State.contacts[sender];
                    const lastLocal = contact?.messages[contact.messages.length - 1];
                    
                    if (!lastLocal || lastLocal.content !== content) {
                        addMessageLocal(sender, content, 'recv');
                    }
                }
            }
        });

        const chatLog = document.getElementById('chat');
        if (chatLog) observer.observe(chatLog, { childList: true, subtree: true });
        else setTimeout(startMessageListener, 2000);
    }

    // === 工具 ===
    function togglePhone(show) {
        State.isOpen = show;
        if (show) {
            $('#ow-phone-container').removeClass('ow-hidden');
            $('#ow-phone-toggle').hide();
            // 打开时，如果之前在聊天就显示聊天，否则显示列表
            if (State.currentChat) renderChat(State.currentChat);
            else renderContactList();
        } else {
            $('#ow-phone-container').addClass('ow-hidden');
            $('#ow-phone-toggle').show();
        }
    }

    function updateMainBadge() {
        let total = 0;
        Object.values(State.contacts).forEach(c => total += (c.unread || 0));
        const badge = $('#ow-main-badge');
        if (total > 0) badge.text(total).show();
        else badge.hide();
    }

    function getRandomColor() {
        const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function saveData() { localStorage.setItem(SETTING_KEY, JSON.stringify(State.contacts)); }
    function loadData() {
        const raw = localStorage.getItem(SETTING_KEY);
        if(raw) State.contacts = JSON.parse(raw);
    }

    $(document).ready(() => setTimeout(init, 500));
})();
