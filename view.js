// ==================================================================================
// 模块: View (界面交互 - v4.0 Event-Driven UI)
// ==================================================================================
(function() {
    const ST = window.ST_PHONE;
    
    // 防止重复注入
    if (document.getElementById('st-ios-phone-root')) return;

    // --- HTML 结构 (保持原汁原味，增加了部分 ID 钩子) ---
    const html = `
    <div id="st-ios-phone-root" style="position: relative; z-index: 20000;">
        <div id="st-phone-icon" title="打开/关闭手机">
            <div id="st-notification-dot" class="notification-dot"></div>
            <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
        </div>

        <div id="st-phone-window" style="display: none;">
            <div class="phone-notch-area" id="phone-drag-handle">
                <div id="status-bar-time">12:00</div>
                <div class="phone-notch"></div>
            </div>
            
            <div class="app-container">
                <div class="pages-wrapper">
                    
                    <div class="page active" id="page-contacts">
                        <div class="nav-bar ios-nav">
                            <button class="nav-btn icon" id="btn-open-settings" title="设置">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </button>
                            <span class="nav-title">信息</span>
                            <button class="nav-btn icon" id="btn-add-friend" title="新对话">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        </div>
                        <div class="ios-search-bar">
                            <div class="search-input">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e93"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                <input type="text" id="phone-search-bar" placeholder="搜索">
                            </div>
                        </div>
                        <div class="contact-list" id="contact-list-container">
                            </div>
                    </div>

                    <div class="page hidden-bottom" id="page-new-msg">
                        <div class="nav-bar ios-nav">
                            <button class="nav-btn text-btn" id="btn-cancel-new">取消</button>
                            <span class="nav-title">新信息</span>
                            <div style="width:40px"></div>
                        </div>
                        <div class="to-row">
                            <span class="to-label">收件人:</span>
                            <input type="text" id="new-msg-input" placeholder="输入角色名字">
                        </div>
                        <div class="section-title">建议</div>
                        <div class="contact-list" id="new-msg-suggestions"></div>
                    </div>

                    <div class="page hidden-right" id="page-chat">
                        <div class="nav-bar ios-nav-detail">
                            <button class="nav-btn back-btn" id="btn-back">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="#007AFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                <span id="back-text">信息</span>
                            </button>
                            <div class="nav-title-group">
                                <span class="nav-title-small" id="chat-title">用户</span>
                            </div>
                            <div style="width:40px"></div>
                        </div>
                        <div class="chat-scroll-area" id="chat-messages-container"></div>
                        <div class="input-area">
                            <div class="plus-btn" id="btn-toggle-stickers">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8e8e93"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
                            </div>
                            <textarea class="chat-input" placeholder="iMessage" id="msg-input" rows="1"></textarea>
                            <div class="send-btn" id="btn-send">
                                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </div>
                        </div>
                        <div id="sticker-panel" class="sticker-panel hidden">
                            <div class="sticker-grid" id="sticker-grid-container"></div>
                        </div>
                    </div>

                    <div class="page hidden-right" id="page-settings" style="background-color: #f2f2f7;">
                        <div class="nav-bar ios-nav">
                            <button class="nav-btn back-btn" id="btn-settings-back">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="#007AFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                <span>信息</span>
                            </button>
                            <span class="nav-title">设置</span>
                            <div style="width: 40px;"></div>
                        </div>
                        <div style="padding: 20px 0;">
                            <div class="section-title">存储设置</div>
                            <div class="ios-list-group">
                                <div class="ios-list-item">
                                    <span class="ios-label">存入世界书</span>
                                    <div class="ios-select-wrapper">
                                        <select id="setting-worldbook-select" class="ios-select-real">
                                            <option value="">加载中...</option>
                                        </select>
                                        <svg class="ios-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="ios-footer-text">
                                推荐留空。系统会自动检测并使用当前角色卡绑定的世界书（Embedded/Global）。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // 插入 DOM
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    // --- 工具类 ---
    function renderMessageContent(text) {
        if(!text) return '';
        const stickers = ST.config.stickers || [];
        // 表情包替换
        let html = text.replace(/\[bqb-(\d+)\]/g, (match, indexStr) => {
            const index = parseInt(indexStr);
            const sticker = stickers[index]; 
            if (sticker) {
                 return `<img src="${sticker.url}" alt="${sticker.label}" class="sticker-img" loading="lazy" />`;
            }
            return ''; 
        });
        // Markdown 图片兼容
        html = html.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" alt="sticker" loading="lazy" />');
        return html;
    }

    // --- UI 逻辑控制器 ---
    ST.ui = {
        // 1. 列表渲染 (全量，但频率低)
        renderContacts: function(contactsOverride = null) {
            const container = document.getElementById('contact-list-container');
            const contacts = contactsOverride || ST.store.contacts;
            
            container.innerHTML = ''; // 列表页简单清空即可，性能影响小
            if (!contacts || contacts.length === 0) {
                container.innerHTML = `<div style="padding-top: 150px; text-align: center; color: #8e8e93; font-size: 14px">暂无消息</div>`;
                return;
            }
            
            contacts.forEach(contact => {
                const el = document.createElement('div');
                el.className = 'contact-item';
                // 蓝点
                const unreadDot = contact.hasUnread ? `<div class="unread-dot-indicator"></div>` : '';
                el.innerHTML = `
                    <div class="info">
                        <div class="name-row">
                            <span class="name">${contact.name}${unreadDot}</span>
                            <span class="time">${contact.time}</span>
                        </div>
                        <div class="preview">${contact.lastMsg}</div>
                    </div>
                `;
                el.onclick = () => ST.ui.openChat(contact);
                container.appendChild(el);
            });
        },

        // 2. 聊天渲染 (核心：增量更新)
        updateChat: function(contact) {
            const container = document.getElementById('chat-messages-container');
            if (!container) return;

            // 如果是切换联系人，清空
            if (container.dataset.contactId !== contact.id) {
                container.innerHTML = '';
                container.dataset.contactId = contact.id;
                // 垫片
                container.appendChild(document.createElement('div')).style.height = '10px';
            }

            // 获取已渲染的最后一条时间戳
            let lastTimestamp = parseInt(container.dataset.lastTs || '0');
            const messages = contact.messages || [];
            const newMessages = messages.filter(m => m.timestamp > lastTimestamp || (m.timestamp === lastTimestamp && !m.rendered));
            
            // 如果没有新消息，退出
            if (newMessages.length === 0) return;

            // 智能滚动判定
            const threshold = 100;
            const isNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold;
            const isFirstLoad = lastTimestamp === 0;

            let lastRenderedDateStr = container.dataset.lastDateStr || '';

            newMessages.forEach(msg => {
                // 时间分割线逻辑
                let showTime = false;
                if (!lastRenderedDateStr || msg.dateStr !== lastRenderedDateStr) showTime = true;
                if (msg.timestamp - lastTimestamp > 15 * 60 * 1000) showTime = true; // 15分钟间隔

                if (showTime) {
                    const t = document.createElement('div');
                    t.className = 'chat-timestamp';
                    t.innerText = msg.timeStr;
                    container.appendChild(t);
                    lastRenderedDateStr = msg.dateStr;
                }

                const bubble = document.createElement('div');
                bubble.className = `message-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`;
                bubble.innerHTML = renderMessageContent(msg.text);
                container.appendChild(bubble);

                lastTimestamp = msg.timestamp;
                // 标记该消息对象已渲染(防止时间戳完全相同的重复)
                msg.rendered = true;
            });

            // 更新容器状态
            container.dataset.lastTs = lastTimestamp;
            container.dataset.lastDateStr = lastRenderedDateStr;

            // 滚动
            if (isFirstLoad || isNearBottom) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        },

        openChat: function(contact) {
            ST.store.activeContactId = contact.id;
            
            // UI 切换
            document.getElementById('page-contacts').classList.add('hidden-left');
            document.getElementById('page-contacts').classList.remove('active');
            
            const chatPage = document.getElementById('page-chat');
            chatPage.classList.remove('hidden-right');
            chatPage.classList.add('active');
            
            document.getElementById('chat-title').innerText = contact.name;
            document.getElementById('sticker-panel').classList.add('hidden'); // 默认收起表情

            // 清除未读
            ST.store.unreadIds.delete(contact.id);
            contact.hasUnread = false; 
            ST.ui.setNotification(ST.store.unreadIds.size > 0);

            // 渲染
            ST.ui.updateChat(contact);
        },

        closeChat: function() {
            ST.store.activeContactId = null;
            
            const chatPage = document.getElementById('page-chat');
            chatPage.classList.add('hidden-right');
            chatPage.classList.remove('active');

            const contactPage = document.getElementById('page-contacts');
            contactPage.classList.remove('hidden-left');
            contactPage.classList.add('active');

            // 刷新联系人列表以移除蓝点
            ST.ui.renderContacts();
        },

        toggleWindow: function() {
            if (ST.store.isDragging) return;
            const win = document.getElementById('st-phone-window');
            ST.store.isPhoneOpen = !ST.store.isPhoneOpen;
            win.style.display = ST.store.isPhoneOpen ? 'block' : 'none';
            
            if (ST.store.isPhoneOpen) {
                // 刷新时间
                ST.ui.updateStatusBar(ST.store.virtualTime);
                ST.ui.renderContacts();
            }
        },

        setNotification: function(active) {
            const dot = document.getElementById('st-notification-dot');
            if (dot) dot.classList.toggle('active', active);
        },

        updateStatusBar: function(timeStr) {
            const el = document.getElementById('status-bar-time');
            if (el && timeStr) el.innerText = timeStr;
        },

        playSound: function() {
            if (ST.path) {
                const audio = new Audio(ST.path + 'ding.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
        },

        // 贴纸面板懒加载
        initStickers: function() {
            const container = document.getElementById('sticker-grid-container');
            if (container.children.length > 0) return; // 已加载

            const stickers = ST.config.stickers || [];
            const fragment = document.createDocumentFragment();
            
            stickers.forEach((s, index) => {
                const img = document.createElement('img');
                img.src = s.url; // 这里不懒加载，因为是面板
                img.title = s.label;
                img.onclick = () => {
                    const input = document.getElementById('msg-input');
                    // 插入标签
                    input.value += `[bqb-${index}]`; 
                    // 自动发送？还是让用户点发送？通常表情包直接发送体验更好
                    // 这里我们模拟点击发送
                    ST.emit('send-message', `[bqb-${index}]`);
                    input.value = '';
                    document.getElementById('sticker-panel').classList.add('hidden');
                };
                fragment.appendChild(img);
            });
            container.appendChild(fragment);
        },
        
        // 设置逻辑
        loadWorldBooks: async function() {
            const select = document.getElementById('setting-worldbook-select');
            select.innerHTML = '<option value="">(推荐：自动跟随)</option>';
            
            if (ST.scribe && ST.scribe.getWorldBookList) {
               // 暂不支持获取列表 API，此处保留接口
            }
            // 回显
            select.value = ST.config.targetWorldBook || "";
        }
    };

    // --- 事件绑定 & 拖拽 ---
    
    // 1. 拖拽逻辑 (复用旧代码，功能完好)
    function makeDraggable(element, handle) {
        let pos1=0, pos2=0, pos3=0, pos4=0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            ST.store.isDragging = false;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            ST.store.isDragging = true;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
            setTimeout(() => ST.store.isDragging = false, 100);
        }
    }
    const win = document.getElementById("st-phone-window");
    const icon = document.getElementById("st-phone-icon");
    if(win) makeDraggable(win, document.getElementById("phone-drag-handle"));
    if(icon) makeDraggable(icon, icon);

    // 2. 按钮点击
    icon.onclick = ST.ui.toggleWindow;
    document.getElementById('btn-back').onclick = ST.ui.closeChat;
    
    document.getElementById('btn-send').onclick = () => {
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        if(text) {
            ST.emit('send-message', text);
            input.value = '';
            input.style.height = '38px';
        }
    };

    // 输入框回车发送
    document.getElementById('msg-input').addEventListener('keydown', (e) => {
        e.stopPropagation(); // 阻止冒泡给酒馆
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('btn-send').click();
        }
    });

    document.getElementById('btn-toggle-stickers').onclick = () => {
        const panel = document.getElementById('sticker-panel');
        if (panel.classList.contains('hidden')) {
            ST.ui.initStickers();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    };

    // 搜索
    document.getElementById('phone-search-bar').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        if (!q) {
            ST.ui.renderContacts(); 
            return;
        }
        const filtered = ST.store.contacts.filter(c => c.name.toLowerCase().includes(q) || c.lastMsg.includes(q));
        ST.ui.renderContacts(filtered);
    });

    // 设置页相关
    document.getElementById('btn-open-settings').onclick = () => {
        document.getElementById('page-contacts').classList.add('hidden-left');
        document.getElementById('page-contacts').classList.remove('active');
        document.getElementById('page-settings').classList.remove('hidden-right');
        document.getElementById('page-settings').classList.add('active');
        ST.ui.loadWorldBooks();
    };
    document.getElementById('btn-settings-back').onclick = () => {
        document.getElementById('page-settings').classList.add('hidden-right');
        document.getElementById('page-settings').classList.remove('active');
        document.getElementById('page-contacts').classList.remove('hidden-left');
        document.getElementById('page-contacts').classList.add('active');
    };
    document.getElementById('setting-worldbook-select').onchange = (e) => {
        ST.config.targetWorldBook = e.target.value;
        localStorage.setItem('ST_PHONE_PREFS', JSON.stringify({ targetWorldBook: e.target.value }));
    };

    // --- 监听全局事件 (Event Bus) ---
    
    ST.on('contacts-updated', (contacts) => {
        // 如果正在搜索，不打断用户
        const searchVal = document.getElementById('phone-search-bar').value;
        if (!searchVal) ST.ui.renderContacts(contacts);
        ST.ui.updateStatusBar(ST.store.virtualTime);
        ST.ui.setNotification(ST.store.unreadIds.size > 0);
    });

    ST.on('chat-updated', (contact) => {
        // 仅当当前打开的聊天是该联系人时才更新
        if (ST.store.activeContactId === contact.id) {
            ST.ui.updateChat(contact);
        }
    });

    ST.on('notification-arrived', () => {
        ST.ui.playSound();
        ST.ui.setNotification(true);
    });

})();
