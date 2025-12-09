(function () {
    const SETTING_KEY = "open_world_phone_data";
    
    // 表情包字典 (保持不变，省略部分以节省篇幅，请保留你v1.4的完整列表)
    const EMOJI_DB = [
        // --- 基础互动 ---
        { label: "打招呼", url: "https://sharkpan.xyz/f/LgwT7/AC229A80203166B292155ADA057DE423_0.gif" },
        { label: "开心", url: "https://sharkpan.xyz/f/aVwtY/0CBEE9105C7A98E0E6162A79CCD09EFA_0.gif" },
        { label: "爱心", url: "https://sharkpan.xyz/f/53nhj/345FFC998474F46C1A40B1567335DA03_0.gif" },
        { label: "给你爱", url: "https://files.catbox.moe/sqa7c9.jpg" },
        { label: "好的", url: "https://files.catbox.moe/71kn5e.png" },
        { label: "晚安", url: "https://files.catbox.moe/duzx7n.png" },

        // --- 卖萌/撒娇 ---
        { label: "乖巧", url: "https://files.catbox.moe/4dnzcq.png" },
        { label: "害羞", url: "https://files.catbox.moe/ssgpgy.jpg" },
        { label: "飞奔", url: "https://sharkpan.xyz/f/kDOi6/0A231BF0BFAB3C2B243F9749B64F7444_0.gif" },
        { label: "蹭蹭", url: "https://files.catbox.moe/9p0x2t.png" },
        { label: "期待", url: "https://files.catbox.moe/i0ov5h.png" },
        { label: "送花", url: "https://files.catbox.moe/s1t2kd.jpg" },
        { label: "可怜", url: "https://sharkpan.xyz/f/XgmcW/817B66DAB2414E1FC8D717570A602193_0.gif" },
        { label: "流口水", url: "https://sharkpan.xyz/f/j36f6/3010464DF8BD77B4A99AB23730F2EE57_0.gif" },

        // --- 负面情绪/拒绝 ---
        { label: "哭哭", url: "https://files.catbox.moe/rw1cfk.png" },
        { label: "大哭", url: "https://files.catbox.moe/dbyrdf.png" },
        { label: "委屈", url: "https://sharkpan.xyz/f/gVySw/D90D0B53802301FCDB1F0718DEB08C79_0.gif" },
        { label: "生气", url: "https://files.catbox.moe/si6f0k.png" },
        { label: "不爽", url: "https://files.catbox.moe/amelbv.png" },
        { label: "嫌弃", url: "https://files.catbox.moe/t2e0nt.png" },
        { label: "无语", url: "https://files.catbox.moe/wgkwjh.png" },
        { label: "拒绝", url: "https://files.catbox.moe/bos6mn.jpg" },
        { label: "心碎", url: "https://files.catbox.moe/ueqlfe.jpg" },
        { label: "压力", url: "https://files.catbox.moe/ufz3ek.jpg" },

        // --- 攻击性/怼人 ---
        { label: "顶嘴", url: "https://sharkpan.xyz/f/vVBtL/mmexport1737057690899.png" },
        { label: "揍你", url: "https://sharkpan.xyz/f/oJ1i4/mmexport1737057862640.gif" },
        { label: "撞飞", url: "https://sharkpan.xyz/f/zMZu5/mmexport1737057848709.gif" },
        { label: "锁喉", url: "https://files.catbox.moe/mi8tk3.jpg" },
        { label: "滚", url: "https://sharkpan.xyz/f/1vAc2/mmexport1737057678306.png" },
        { label: "比中指", url: "https://files.catbox.moe/umpgjb.jpg" },
        { label: "吃屎", url: "https://files.catbox.moe/r26gox.png" },
        { label: "你是坏蛋", url: "https://sharkpan.xyz/f/8r2Sj/mmexport1737057726579.png" },
        { label: "我恨你", url: "https://files.catbox.moe/r6g32h.png" },

        // --- 搞笑/发疯/阴阳怪气 ---
        { label: "疑惑", url: "https://files.catbox.moe/gofdox.jpg" },
        { label: "震惊", url: "https://files.catbox.moe/q7683x.png" },
        { label: "尴尬", url: "https://files.catbox.moe/8eaawd.png" },
        { label: "偷看", url: "https://files.catbox.moe/72wkme.png" },
        { label: "发疯", url: "https://files.catbox.moe/8cqr43.jpg" },
        { label: "已老实", url: "https://files.catbox.moe/6eyzlg.png" },
        { label: "喝茶", url: "https://files.catbox.moe/1xvrb8.jpg" }, // 大人请用茶
        { label: "免礼", url: "https://sharkpan.xyz/f/pO6uQ/mmexport1737057701883.png" },
        { label: "满意", url: "https://sharkpan.xyz/f/e8KUw/mmexport1737057664689.png" },
        { label: "好困", url: "https://files.catbox.moe/7pncr1.jpg" },
        { label: "躺平", url: "https://files.catbox.moe/cq6ipd.png" },
        { label: "升天", url: "https://files.catbox.moe/o8td90.png" },
        { label: "大脑短路", url: "https://files.catbox.moe/d41e2q.png" },
        { label: "吃瓜", url: "https://files.catbox.moe/428w1c.png" }, // 围观
        { label: "吐魂", url: "https://files.catbox.moe/7yejey.png" },

        // --- 特殊类 ---
        { label: "我是狗", url: "https://files.catbox.moe/1bki7o.jpg" },
        { label: "汪", url: "https://files.catbox.moe/iwmiww.jpg" },
        { label: "投降", url: "https://files.catbox.moe/f4ogyw.png" }
    ];

    const State = {
        contacts: {}, 
        currentChat: null,
        isOpen: false,
        isDragging: false,
        showEmoji: false,
        lastProcessedMsgId: -1 // 用于防止重复处理同一条消息
    };

    function init() {
        console.log("[OW Phone] Init v2.0 - Raw Data & Arrow Syntax");
        loadData();
        
        // 注入 UI (保持不变)
        const layout = `
        <div id="ow-phone-toggle" title="打开手机">
            💬<span id="ow-main-badge" class="ow-badge" style="display:none">0</span>
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
        
        // 启动数据层监听
        // 我们依然监听 DOM 变化作为“触发器”，但读取数据时去读原始 Context
        const chatObserver = new MutationObserver(() => {
            // 延时一小会确保 Context 已更新
            setTimeout(processRawChatData, 100);
        });
        
        // 监听酒馆主聊天区域
        const chatLog = document.getElementById('chat');
        if (chatLog) chatObserver.observe(chatLog, { childList: true, subtree: true });
        
        renderContactList();
    }

    // === 核心升级：读取原始数据流 ===
    function processRawChatData() {
        // 1. 获取酒馆内部的原始聊天数组
        // 这是一个全局对象，包含了所有未被正则修改的原始文本
        if (!window.SillyTavern || !window.SillyTavern.getContext) return;
        
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat || context.chat.length === 0) return;

        // 2. 获取最后一条消息对象
        const lastMsgObj = context.chat[context.chat.length - 1];
        
        // 防止重复处理 (比对 mesId 或者 简单比对长度/内容哈希)
        // 酒馆通常没有公开的 msgId，我们用 数组索引 + 内容长度 做指纹
        const currentMsgId = context.chat.length; 
        if (State.lastProcessedMsgId === currentMsgId) return;
        State.lastProcessedMsgId = currentMsgId;

        // 3. 获取原始文本 (Raw Text)
        const rawText = lastMsgObj.mes; 
        
        // 4. 解析指令
        parseCommands(rawText);
    }

    function parseCommands(text) {
        // --- A. 自动加好友 ---
        // 格式: [ADD_CONTACT: 名字]
        const addRegex = /\[ADD_CONTACT:\s*(.+?)\]/g;
        let addMatch;
        while ((addMatch = addRegex.exec(text)) !== null) {
            const name = addMatch[1].trim();
            if (!State.contacts[name]) {
                State.contacts[name] = { messages: [], unread: 0, color: getRandomColor() };
                saveData();
                toastr.success(`📱 自动添加好友: ${name}`);
                if(State.isOpen && !State.currentChat) renderContactList();
            }
        }

        // --- B. 短信解析 (箭头语法) ---
        // 格式: [SMS: 发信人->收信人 | 内容]
        // 例子: [SMS: 刻晴->User | 晚上好]  或者 [SMS: User->刻晴 | 在吗]
        const smsRegex = /\[SMS:\s*(.+?)\s*->\s*(.+?)\s*\|\s*(.+?)\]/g;
        let smsMatch;
        
        while ((smsMatch = smsRegex.exec(text)) !== null) {
            let sender = smsMatch[1].trim();
            let receiver = smsMatch[2].trim();
            let content = smsMatch[3].trim();

            // 归一化 "我" 的称呼
            const isSenderUser = (sender === '我' || sender.toLowerCase() === 'user' || sender === 'User' || sender === '{{user}}');
            const isReceiverUser = (receiver === '我' || receiver.toLowerCase() === 'user' || receiver === 'User' || receiver === '{{user}}');

            // 逻辑分支 1: 别人发给我 (存为 recv)
            if (!isSenderUser && isReceiverUser) {
                // 解析表情包关键词 [表情: xxx] -> 图片
                content = parseEmojiContent(content);
                addMessageLocal(sender, content, 'recv');
            }
            
            // 逻辑分支 2: 我发给别人 (存为 sent)
            // 这包括：我在手机里点的发送(回显)，以及 AI 帮我代发的自动问候
            else if (isSenderUser && !isReceiverUser) {
                content = parseEmojiContent(content);
                addMessageLocal(receiver, content, 'sent');
            }
            
            // 逻辑分支 3: NPC 互发 (吃瓜模式，可选)
            // 目前暂不处理，如果需要可以存到 sender 的聊天框里
        }
    }

    // 辅助：解析内容里的表情包标签
    function parseEmojiContent(text) {
        const emojiMatch = text.match(/\[表情:\s*(.+?)\]/);
        if (emojiMatch) {
            const label = emojiMatch[1].trim();
            const found = EMOJI_DB.find(e => e.label === label);
            if (found) return `<img src="${found.url}" class="ow-msg-img">`;
        }
        return text;
    }

    // === UI 交互部分 (发信逻辑更新) ===
    
    function handleUserSend() {
        const input = document.getElementById('ow-input');
        const text = input.value.trim();
        const target = State.currentChat; // 这里的 target 就是收信人

        if (!text || !target) return;

        // 1. 本地上屏 (伪造)
        addMessageLocal(target, text, 'sent');
        input.value = '';

        // 2. 构造箭头指令
        // 格式： [SMS: User->目标 | 内容]
        // 注意：这里我们用 {{user}} 指代自己，这是酒馆通用符
        const command = `\n[SMS: {{user}}->${target} | ${text}]`;
        appendToMainInput(command);
    }

    function sendEmoji(item) {
        const target = State.currentChat;
        if (!target) return;

        const imgHtml = `<img src="${item.url}" class="ow-msg-img">`;
        addMessageLocal(target, imgHtml, 'sent');
        $('#ow-emoji-panel').hide();

        // 构造箭头指令
        const command = `\n[SMS: {{user}}->${target} | [表情: ${item.label}]]`;
        appendToMainInput(command);
    }

    function appendToMainInput(text) {
        const textarea = document.getElementById('send_textarea');
        if (!textarea) return;
        let currentVal = textarea.value;
        if (currentVal.length > 0 && !currentVal.endsWith('\n')) currentVal += '\n';
        textarea.value = currentVal + text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        toastr.info(`短信已填入，请发送`);
    }

    // ... (以下代码保持不变：bindEvents, addMessageLocal, renderUI, saveData 等) ...
    // 为了完整性，这里必须包含 addMessageLocal 的定义
    
    function addMessageLocal(name, content, type) {
        // 如果联系人不存在，自动创建
        if (!State.contacts[name]) {
            State.contacts[name] = { messages: [], unread: 0, color: getRandomColor() };
        }
        
        const msgs = State.contacts[name].messages;
        const lastMsg = msgs[msgs.length - 1];

        // 简单防重 (因为我们现在读原始数据，AI生成一段话可能包含多次DOM变动，防重很重要)
        // 检查最后一条的内容和时间
        if (lastMsg && lastMsg.content === content && lastMsg.type === type) {
            // 如果是 2 秒内重复添加的，视为同一条
            if (Date.now() - lastMsg.time < 2000) return;
        }

        msgs.push({ type: type, content: content, time: Date.now() });

        if (type === 'recv' && State.currentChat !== name) {
            State.contacts[name].unread++;
        }
        
        saveData();
        updateMainBadge();
        
        if (State.isOpen) {
            if (State.currentChat === name) renderChat(name);
            else if (!State.currentChat) renderContactList();
        }
    }

    // ... (请把 v1.2/1.4 的 renderChat, renderContactList, togglePhone 等 UI 渲染函数复制过来) ...
    // ... (确保包含 getRandomColor, updateMainBadge, saveData, loadData) ...
    
    // --- 必要的 UI 渲染函数补全 (防止你复制漏了) ---
    function bindEvents() {
        $('#ow-phone-toggle').click(() => togglePhone(true));
        $('#ow-close-btn').click(() => togglePhone(false));
        $('#ow-back-btn').click(() => { renderContactList(); });
        $('#ow-add-btn').click(() => {
            const name = prompt("【添加好友】请输入对方的名字：");
            if (name && name.trim()) {
                const cleanName = name.trim();
                if (!State.contacts[cleanName]) {
                    State.contacts[cleanName] = { messages: [], unread: 0, color: getRandomColor() };
                    saveData();
                }
                renderChat(cleanName);
            }
        });
        $('#ow-send-btn').click(handleUserSend);
        $('#ow-input').keypress((e) => { if(e.key === 'Enter') handleUserSend(); });
        $('#ow-emoji-btn').click(() => { $('#ow-emoji-panel').slideToggle(150); });

        // 原生拖拽
        const header = document.getElementById('ow-phone-header');
        const container = document.getElementById('ow-phone-container');
        let offset = {x:0, y:0};
        header.onmousedown = (e) => {
            if (e.target.classList.contains('ow-header-icon')) return;
            State.isDragging = true;
            offset.x = e.clientX - container.offsetLeft;
            offset.y = e.clientY - container.offsetTop;
            header.style.cursor = 'grabbing';
        };
        document.onmouseup = () => { State.isDragging = false; header.style.cursor = 'grab'; };
        document.onmousemove = (e) => {
            if(!State.isDragging) return;
            e.preventDefault();
            container.style.left = (e.clientX - offset.x) + 'px';
            container.style.top = (e.clientY - offset.y) + 'px';
            container.style.bottom = 'auto';
            container.style.right = 'auto';
        };
    }

    function togglePhone(show) {
        State.isOpen = show;
        if (show) {
            $('#ow-phone-container').removeClass('ow-hidden');
            $('#ow-phone-toggle').hide();
            if (State.currentChat) renderChat(State.currentChat);
            else renderContactList();
        } else {
            $('#ow-phone-container').addClass('ow-hidden');
            $('#ow-phone-toggle').show();
        }
        updateMainBadge();
    }

    function renderContactList() {
        State.currentChat = null;
        $('#ow-header-title').text("通讯录");
        $('#ow-back-btn').hide();
        $('#ow-add-btn').show(); 
        $('#ow-close-btn').show();
        $('#ow-chat-footer').hide();
        $('#ow-emoji-panel').hide();
        
        const body = $('#ow-phone-body');
        body.empty();
        const names = Object.keys(State.contacts);
        if (names.length === 0) {
            body.html(`<div style="text-align:center; margin-top:50px; opacity:0.5; font-size:14px;">暂无联系人<br>点击右上角 ➕ 添加好友</div>`);
            return;
        }
        names.forEach(name => {
            const info = State.contacts[name];
            const lastMsg = info.messages[info.messages.length - 1];
            let preview = lastMsg ? lastMsg.content : "暂无消息";
            if (preview.includes('<img')) preview = '[图片]';
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
            // 右键删除联系人
            item.on('contextmenu', (e) => {
                e.preventDefault();
                if(confirm(`确定要删除联系人 ${name} 吗？`)) {
                    delete State.contacts[name];
                    saveData();
                    renderContactList();
                }
            });
            body.append(item);
        });
    }

    function renderChat(name) {
        State.currentChat = name;
        if(State.contacts[name]) State.contacts[name].unread = 0;
        updateMainBadge();
        saveData();
        $('#ow-header-title').text(name);
        $('#ow-back-btn').show(); 
        $('#ow-add-btn').hide();  
        $('#ow-chat-footer').show();
        $('#ow-emoji-panel').hide();
        const body = $('#ow-phone-body');
        body.empty();
        
        const view = $('<div class="ow-chat-view"></div>');
        const msgs = State.contacts[name]?.messages || [];
        
        msgs.forEach((msg, index) => {
            const isMe = msg.type === 'sent';
            const div = $(`<div class="ow-msg ${isMe ? 'ow-msg-right' : 'ow-msg-left'}">${msg.content}</div>`);
            // 右键删除消息
            div.on('contextmenu', (e) => {
                e.preventDefault();
                if(confirm("删除这条消息？(仅本地)")) {
                    State.contacts[name].messages.splice(index, 1);
                    saveData();
                    renderChat(name);
                }
            });
            view.append(div);
        });
        body.append(view);
        body[0].scrollTop = body[0].scrollHeight;
    }

    function renderEmojiPanel() {
        const panel = $('#ow-emoji-panel');
        panel.empty();
        EMOJI_DB.forEach(item => {
            const img = $(`<img src="${item.url}" class="ow-emoji-item" title="${item.label}">`);
            img.click(() => sendEmoji(item)); 
            panel.append(img);
        });
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
