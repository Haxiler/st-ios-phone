// ==================================================================================
// 模块: View (界面与交互) - v3.8 Module Edition
// ==================================================================================

// 在 Module 模式下，代码自上而下执行。
// 我们把逻辑包裹在一个异步初始化函数里，确保安全。
(async function() {
    
    // 等待 DOM 准备好 (防止脚本加载太快找不到 root)
    if (document.getElementById('st-ios-phone-root')) return;

    console.log('📱 [View] 正在初始化界面...');

    // 1. HTML 模板
    const html = `
    <div id="st-ios-phone-root">
        <div id="st-phone-icon" title="打开/关闭手机">
            <div id="st-notification-dot" class="notification-dot"></div>
            <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
        </div>
        <div id="st-phone-window">
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
                        <div class="contact-list" id="contact-list-container"></div>
                    </div>

                    <div class="page hidden-bottom" id="page-new-msg">
                        <div class="nav-bar ios-nav">
                            <button class="nav-btn text-btn" id="btn-cancel-new">取消</button>
                            <span class="nav-title">新信息</span>
                            <button class="nav-btn" style="visibility:hidden; width: 40px"></button>
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
                            <button class="nav-btn" style="visibility:hidden; width: 40px"></button>
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
                            <button class="nav-btn back-btn" id="btn-close-settings">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="#007AFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                <span>信息</span>
                            </button>
                            <span class="nav-title">设置</span>
                            <button class="nav-btn" style="visibility:hidden; width: 40px"></button>
                        </div>
                        <div style="padding: 20px;">
                            <div style="background: white; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <label style="display:block; font-weight:600; font-size:15px; margin-bottom: 10px; color:#000;">
                                    短信存档位置 (世界书)
                                </label>
                                <div style="position:relative;">
                                    <select id="setting-worldbook-select" style="width:100%; padding: 10px; font-size:14px; border-radius: 8px; border: 1px solid #c6c6c8; background: #fff; appearance: none; -webkit-appearance: none;">
                                        <option value="">点击加载列表...</option>
                                    </select>
                                    <div style="position:absolute; right:10px; top:12px; pointer-events:none; color:#8e8e93;">▼</div>
                                </div>
                                <div style="font-size:12px; color:#8e8e93; margin-top:8px; line-height:1.4;">
                                    选中后，收到的所有短信将自动保存到该世界书文件中。
                                </div>
                            </div>
                            
                            <div style="margin-top: 20px;">
                                <button id="btn-manual-sync" style="width: 100%; background-color: #007aff; color: white; padding: 12px; border-radius: 12px; font-size: 16px; font-weight: 600; border: none; cursor: pointer;">
                                    立即同步存档
                                </button>
                                <div id="sync-status-text" style="text-align: center; margin-top: 8px; font-size: 13px; color: #8e8e93; min-height: 40px; line-height: 1.4;"></div>
                            </div>
                            
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5ea;">
                                <button id="btn-debug-check" style="width: 100%; background-color: #8e8e93; color: white; padding: 10px; border-radius: 10px; font-size: 14px; border: none; cursor: pointer;">
                                    🔍 运行诊断检查
                                </button>
                                <div id="debug-output" style="margin-top: 8px; font-size: 11px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 6px; display: none; white-space: pre-wrap; max-height: 200px; overflow-y: auto; font-family: monospace;"></div>
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

    // 2. 拖拽逻辑
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            window.ST_PHONE.state.isDragging = false; 
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            window.ST_PHONE.state.isDragging = true;
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

    // 3. 消息渲染器
    function renderMessageContent(text) {
        const bqbRegex = /\[bqb-(\d+)\]/g; 
        let html = text.replace(bqbRegex, (match, indexStr) => {
            const index = parseInt(indexStr);
            const stickers = window.ST_PHONE.config.stickers || [];
            const sticker = stickers[index]; 
            if (sticker) {
                 return `<img src="${sticker.url}" alt="${sticker.label || indexStr}" class="sticker-img" loading="lazy" />`;
            }
            return ''; 
        });
        const invalidBqbRegex = /\[bqb-([^\]\d]+)\]/g;
        html = html.replace(invalidBqbRegex, '');
        const mdImgRegex = /!\[.*?\]\((.*?)\)/g;
        html = html.replace(mdImgRegex, '<img src="$1" alt="sticker" loading="lazy" />');
        return html;
    }

    // 4. UI 方法
    window.ST_PHONE.ui = {
        toggleWindow: function() {
            const windowEl = document.getElementById('st-phone-window');
            if (window.ST_PHONE.state.isDragging) {
                window.ST_PHONE.state.isDragging = false;
                return;
            }
            window.ST_PHONE.state.isPhoneOpen = !window.ST_PHONE.state.isPhoneOpen;
            windowEl.style.display = window.ST_PHONE.state.isPhoneOpen ? 'block' : 'none';
            if (window.ST_PHONE.state.isPhoneOpen) this.setNotification(false);
            return window.ST_PHONE.state.isPhoneOpen;
        },

        setNotification: function(active) {
            const dot = document.getElementById('st-notification-dot');
            if (dot) dot.classList.toggle('active', active);
        },

        playNotificationSound: function() {
            if (window.ST_PHONE.path) {
                const audio = new Audio(window.ST_PHONE.path + 'ding.mp3');
                audio.volume = 0.6; 
                audio.play().catch(e => console.log('声音播放被拦截或文件不存在', e));
            }
        },

        updateStatusBarTime: function(timeStr) {
            const el = document.getElementById('status-bar-time');
            if (el && timeStr) el.innerText = timeStr;
        },

        renderContacts: function(contactsOverride = null) {
            const container = document.getElementById('contact-list-container');
            const contacts = contactsOverride || window.ST_PHONE.state.contacts;
            container.innerHTML = '';
            if (contacts.length === 0) {
                container.innerHTML = `<div style="padding-top: 150px; text-align: center; color: #8e8e93;"><div style="font-size: 24px; margin-bottom: 8px;">无结果</div></div>`;
                return;
            }
            contacts.forEach(contact => {
                const el = document.createElement('div');
                el.className = 'contact-item';
                const unreadDot = contact.hasUnread ? `<div class="unread-dot-indicator"></div>` : '';
                el.innerHTML = `
                    <div class="info">
                        <div class="name-row">
                            <span class="name">${contact.name} ${unreadDot}</span>
                            <span class="time">${contact.time}</span>
                        </div>
                        <div class="preview">${contact.lastMsg}</div>
                    </div>
                `;
                el.onclick = () => window.ST_PHONE.ui.openChat(contact);
                container.appendChild(el);
            });
        },
        
        renderChat: function(contact, forceScroll = false) {
            const container = document.getElementById('chat-messages-container');
            const threshold = 60; 
            const currentScrollTop = container.scrollTop;
            const currentScrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const isNearBottom = (currentScrollHeight - currentScrollTop - clientHeight) <= threshold;
            const isFirstLoad = container.children.length === 0;

            container.innerHTML = '';
            container.appendChild(document.createElement('div')).style.height = '10px';
            
            let lastRenderedTimestamp = 0;
            let lastRenderedDateStr = '';
            const TIME_GAP = 15 * 60 * 1000; 

            contact.messages.forEach((msg, index) => {
                let showTimestamp = false;
                if (index === 0) showTimestamp = true;
                if (msg.dateStr && msg.dateStr !== lastRenderedDateStr) showTimestamp = true;
                if (!showTimestamp && lastRenderedTimestamp > 0 && msg.timestamp > 0) {
                    if (msg.timestamp - lastRenderedTimestamp > TIME_GAP) {
                        showTimestamp = true;
                    }
                }

                if (showTimestamp) {
                    const timeEl = document.createElement('div');
                    timeEl.className = 'chat-timestamp';
                    timeEl.innerText = msg.timeStr; 
                    container.appendChild(timeEl);
                    lastRenderedTimestamp = msg.timestamp;
                    lastRenderedDateStr = msg.dateStr;
                }

                const el = document.createElement('div');
                el.className = `message-bubble ${msg.sender === 'user' ? 'sent' : 'received'} ${msg.isPending ? 'pending' : ''}`;
                el.innerHTML = renderMessageContent(msg.text);
                container.appendChild(el);
            });

            setTimeout(() => {
                const newHeight = container.scrollHeight;
                if (forceScroll || isNearBottom || isFirstLoad) {
                    container.scrollTop = newHeight;
                } else {
                    container.scrollTop = currentScrollTop;
                }
            }, 0);
        },

        openChat: function(contact) {
            window.ST_PHONE.state.activeContactId = contact.id;
            if (window.ST_PHONE.state.unreadIds) {
                window.ST_PHONE.state.unreadIds.delete(contact.id);
            }
            window.ST_PHONE.ui.renderContacts();

            document.getElementById('chat-title').innerText = contact.name;
            window.ST_PHONE.ui.renderChat(contact, true);
            document.getElementById('sticker-panel').classList.add('hidden');
            document.getElementById('page-contacts').classList.add('hidden-left');
            document.getElementById('page-contacts').classList.remove('active');
            document.getElementById('page-chat').classList.remove('hidden-right');
            document.getElementById('page-chat').classList.add('active');
        },
        closeChat: function() {
            window.ST_PHONE.state.activeContactId = null;
            document.getElementById('page-contacts').classList.remove('hidden-left');
            document.getElementById('page-contacts').classList.add('active');
            document.getElementById('page-chat').classList.add('hidden-right');
            document.getElementById('page-chat').classList.remove('active');
            window.ST_PHONE.ui.renderContacts();
        },
        toggleNewMsgSheet: function(show) {
            const sheet = document.getElementById('page-new-msg');
            const input = document.getElementById('new-msg-input');
            const suggestions = document.getElementById('new-msg-suggestions');
            if (show) {
                sheet.classList.add('modal-active');
                sheet.classList.remove('hidden-bottom');
                input.value = '';
                input.focus();
                suggestions.innerHTML = '';
                window.ST_PHONE.state.contacts.forEach(contact => {
                     const el = document.createElement('div');
                    el.className = 'contact-item';
                    el.innerHTML = `<div class="info"><div class="name-row"><span class="name">${contact.name}</span></div></div>`;
                    el.onclick = () => {
                        window.ST_PHONE.ui.toggleNewMsgSheet(false);
                        window.ST_PHONE.ui.openChat(contact);
                    };
                    suggestions.appendChild(el);
                });
            } else {
                sheet.classList.remove('modal-active');
                sheet.classList.add('hidden-bottom');
            }
        },
        openChatByName: function(name) {
            let contact = window.ST_PHONE.state.contacts.find(c => c.name === name);
            if (!contact) {
                contact = { id: name, name: name, lastMsg: '', time: '', messages: [] };
                window.ST_PHONE.state.contacts.push(contact);
            }
            window.ST_PHONE.ui.toggleNewMsgSheet(false);
            window.ST_PHONE.ui.openChat(contact);
        },
        toggleStickerPanel: function() {
            const panel = document.getElementById('sticker-panel');
            const container = document.getElementById('sticker-grid-container');
            const isHidden = panel.classList.contains('hidden');
            if (isHidden) {
                if (container.children.length === 0) {
                    const stickers = window.ST_PHONE.config.stickers || [];
                    stickers.forEach((s, index) => {
                        const img = document.createElement('img');
                        img.src = s.url;
                        img.title = s.label; 
                        img.onclick = () => {
                            const input = document.getElementById('msg-input');
                            input.value = `[bqb-${index}]`; 
                            document.getElementById('btn-send').click();
                            panel.classList.add('hidden');
                        };
                        container.appendChild(img);
                    });
                }
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        },

        // --- 设置：读取世界书列表 ---
        openSettings: async function() {
            document.getElementById('page-contacts').classList.add('hidden-left');
            document.getElementById('page-settings').classList.remove('hidden-right');
            document.getElementById('page-settings').classList.add('active');
            
            // 立即尝试加载列表
            await window.ST_PHONE.ui.loadWorldInfoList();
        },
        
        closeSettings: function() {
            document.getElementById('page-settings').classList.add('hidden-right');
            document.getElementById('page-settings').classList.remove('active');
            document.getElementById('page-contacts').classList.remove('hidden-left');
        },

        loadWorldInfoList: async function() {
            const select = document.getElementById('setting-worldbook-select');
            select.innerHTML = '<option value="">正在连接酒馆核心...</option>';

            try {
                // 方法1: 尝试通过 SillyTavern Context API 获取
                let allBooks = [];
                
                if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                    const context = SillyTavern.getContext();
                    // 先刷新世界书列表
                    if (context.updateWorldInfoList) {
                        await context.updateWorldInfoList();
                    }
                }
                
                // 方法2: 直接导入模块获取 world_names
                const stModule = await import('/scripts/world-info.js');
                
                // 确保列表已刷新
                if (stModule.updateWorldInfoList) {
                    await stModule.updateWorldInfoList();
                }
                
                allBooks = stModule.world_names || [];

                // 如果仍然为空，尝试从 API 获取
                if (allBooks.length === 0) {
                    try {
                        const response = await fetch('/api/settings/get', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        if (response.ok) {
                            const data = await response.json();
                            allBooks = data.world_names || [];
                        }
                    } catch (e) {
                        console.warn('[View] API 获取失败，使用已有数据');
                    }
                }

                select.innerHTML = '<option value="">-- 请选择存档世界书 --</option>';
                const validBooks = allBooks.sort((a, b) => a.localeCompare(b));

                validBooks.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name; 
                    option.textContent = name; 
                    select.appendChild(option);
                });

                if (window.ST_PHONE.config.targetWorldBook) {
                    const savedVal = window.ST_PHONE.config.targetWorldBook;
                    if (!Array.from(select.options).some(opt => opt.value === savedVal)) {
                         const missOpt = document.createElement('option');
                         missOpt.value = savedVal;
                         missOpt.textContent = `[当前配置] ${savedVal}`;
                         select.appendChild(missOpt);
                    }
                    select.value = savedVal;
                }
                
                if (validBooks.length > 0) {
                    console.log(`✅ [View] 成功读取世界书列表 (${validBooks.length} 本)`);
                } else {
                    console.warn('⚠️ [View] 世界书列表为空，请先创建世界书');
                    select.innerHTML = '<option value="">暂无世界书，请先创建</option>';
                }

            } catch (error) {
                console.error('[View] 读取世界书列表失败:', error);
                select.innerHTML = `<option value="">读取失败: ${error.message}</option>`;
            }
        },

        onWorldBookChange: function(e) {
            const val = e.target.value;
            window.ST_PHONE.config.targetWorldBook = val;
            try {
                const savedPrefsStr = localStorage.getItem('ST_PHONE_PREFS');
                const savedPrefs = savedPrefsStr ? JSON.parse(savedPrefsStr) : {};
                savedPrefs.targetWorldBook = val;
                localStorage.setItem('ST_PHONE_PREFS', JSON.stringify(savedPrefs));
            } catch (err) {
                console.error(err);
            }
        }
    };

    // 事件绑定
    document.getElementById('st-phone-icon').addEventListener('click', () => {
        const isOpen = window.ST_PHONE.ui.toggleWindow();
        if(isOpen) document.dispatchEvent(new CustomEvent('st-phone-opened'));
    });
    document.getElementById('btn-back').onclick = window.ST_PHONE.ui.closeChat;
    document.getElementById('btn-open-settings').onclick = window.ST_PHONE.ui.openSettings;
    document.getElementById('btn-close-settings').onclick = window.ST_PHONE.ui.closeSettings;
    document.getElementById('setting-worldbook-select').onchange = window.ST_PHONE.ui.onWorldBookChange;
    
    // 诊断检查按钮
    document.getElementById('btn-debug-check').onclick = async function() {
        const output = document.getElementById('debug-output');
        output.style.display = 'block';
        output.textContent = '正在运行诊断...\n';
        
        const log = (msg) => {
            output.textContent += msg + '\n';
            console.log('[诊断]', msg);
        };
        
        try {
            log('=== ST-Phone 诊断报告 ===\n');
            
            // 1. 检查 SillyTavern
            log('1. SillyTavern 环境:');
            if (typeof SillyTavern === 'undefined') {
                log('   ❌ SillyTavern 未定义');
            } else if (!SillyTavern.getContext) {
                log('   ❌ SillyTavern.getContext 不存在');
            } else {
                log('   ✅ SillyTavern.getContext 可用');
                
                const ctx = SillyTavern.getContext();
                log(`   - name1 (用户名): ${ctx.name1 || '(未设置)'}`);
                log(`   - name2 (角色名): ${ctx.name2 || '(未设置)'}`);
                log(`   - chat 长度: ${ctx.chat ? ctx.chat.length : 0}`);
                log(`   - loadWorldInfo: ${typeof ctx.loadWorldInfo}`);
                log(`   - saveWorldInfo: ${typeof ctx.saveWorldInfo}`);
            }
            
            // 2. 检查配置
            log('\n2. 插件配置:');
            log(`   - targetWorldBook: "${window.ST_PHONE.config.targetWorldBook || '(未设置)'}"`);
            
            // 3. 检查短信数据
            log('\n3. 短信数据:');
            const contacts = window.ST_PHONE.state.contacts || [];
            log(`   - 联系人数量: ${contacts.length}`);
            contacts.forEach(c => {
                log(`   - ${c.name}: ${c.messages ? c.messages.length : 0} 条消息`);
            });
            
            // 4. 测试世界书读取
            log('\n4. 世界书测试:');
            const bookName = window.ST_PHONE.config.targetWorldBook;
            if (!bookName) {
                log('   ⚠️ 未选择世界书，跳过测试');
            } else {
                try {
                    const ctx = SillyTavern.getContext();
                    log(`   尝试加载: "${bookName}"`);
                    log(`   名称长度: ${bookName.length}, 字符码: ${[...bookName].map(c => c.charCodeAt(0)).join(',')}`);
                    
                    const bookData = await ctx.loadWorldInfo(bookName);
                    
                    if (bookData) {
                        log('   ✅ 成功加载世界书');
                        log(`   - bookData 顶层字段: ${Object.keys(bookData).join(', ')}`);
                        log(`   - entries 类型: ${typeof bookData.entries}`);
                        log(`   - entries 构造函数: ${bookData.entries?.constructor?.name}`);
                        log(`   - Array.isArray: ${Array.isArray(bookData.entries)}`);
                        
                        if (bookData.entries) {
                            const keys = Object.keys(bookData.entries);
                            log(`   - entries 的 keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
                            log(`   - keys 数量: ${keys.length}`);
                            
                            // 显示每个条目的 comment（备注）
                            log('   - 所有条目的备注:');
                            const entries = Array.isArray(bookData.entries) 
                                ? bookData.entries 
                                : Object.values(bookData.entries);
                            entries.forEach((entry, i) => {
                                const comment = entry.comment || '(无备注)';
                                const keyStr = entry.key ? (Array.isArray(entry.key) ? entry.key.join(',') : entry.key) : '(无key)';
                                log(`     [${i}] uid:${entry.uid} "${comment}" keys:[${keyStr}]`);
                            });
                        }
                    } else {
                        log('   ❌ loadWorldInfo 返回 null');
                    }
                    
                    // 额外测试：直接从 API 获取
                    log('\n   尝试直接 API 获取...');
                    try {
                        const ctx = SillyTavern.getContext();
                        const getHeaders = ctx.getRequestHeaders || (() => ({ 'Content-Type': 'application/json' }));
                        const response = await fetch('/api/worldinfo/get', {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({ name: bookName })
                        });
                        if (response.ok) {
                            const apiData = await response.json();
                            const apiEntryKeys = apiData.entries ? Object.keys(apiData.entries) : [];
                            const cachedCount = bookData.entries ? (Array.isArray(bookData.entries) ? bookData.entries.length : Object.keys(bookData.entries).length) : 0;
                            log(`   - API 返回条目数: ${apiEntryKeys.length}`);
                            log(`   - 缓存条目数: ${cachedCount}`);
                            if (apiEntryKeys.length !== cachedCount) {
                                log(`   ⚠️ 缓存(${cachedCount}) vs API(${apiEntryKeys.length}) 数量不一致！`);
                            } else {
                                log(`   ✅ 缓存与 API 数量一致`);
                            }
                        } else {
                            log(`   ❌ API 请求失败: ${response.status} ${response.statusText}`);
                        }
                    } catch (apiErr) {
                        log(`   - API 测试失败: ${apiErr.message}`);
                    }
                    
                } catch (e) {
                    log(`   ❌ 加载失败: ${e.message}`);
                }
            }
            
            // 5. 上次同步调试信息
            log('\n5. 上次同步调试:');
            const lastDebug = window.ST_PHONE._lastSyncDebug;
            if (lastDebug) {
                log(`   - 步骤: ${lastDebug.step}`);
                log(`   - 世界书: ${lastDebug.bookName}`);
                log(`   - 联系人: ${lastDebug.contactCount}`);
                log(`   - 有变化: ${lastDebug.hasChanges}`);
                if (lastDebug.error) {
                    log(`   - 错误: ${lastDebug.error}`);
                }
            } else {
                log('   (尚未执行同步)');
            }
            
            // 6. 测试写入功能
            log('\n6. 写入测试:');
            if (bookName) {
                try {
                    if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) {
                        log('   ⚠️ SillyTavern 不可用');
                    } else {
                        const ctx = SillyTavern.getContext();
                        const testBookData = await ctx.loadWorldInfo(bookName);
                        
                        if (testBookData && testBookData.entries) {
                        // 添加一个测试标记到第一个条目（不实际保存）
                        log('   准备测试数据...');
                        
                        // 找到一个现有条目
                        const existingEntries = Object.values(testBookData.entries);
                        if (existingEntries.length > 0) {
                            const testEntry = existingEntries[0];
                            log(`   将修改条目: uid=${testEntry.uid}, comment="${testEntry.comment}"`);
                            
                            // 记录原始内容
                            const originalContent = testEntry.content;
                            const testMarker = `\n[ST-Phone测试标记: ${Date.now()}]`;
                            
                            // 修改内容
                            testEntry.content = originalContent + testMarker;
                            
                            log('   调用 saveWorldInfo...');
                            await ctx.saveWorldInfo(bookName, testBookData, true);
                            log('   saveWorldInfo 调用完成');
                            
                            // 重新加载验证
                            log('   重新加载验证...');
                            // 清除可能的缓存 - 直接用 API
                            const getHeaders = ctx.getRequestHeaders || (() => ({ 'Content-Type': 'application/json' }));
                            const verifyResponse = await fetch('/api/worldinfo/get', {
                                method: 'POST',
                                headers: getHeaders(),
                                body: JSON.stringify({ name: bookName })
                            });
                            
                            if (verifyResponse.ok) {
                                const verifyData = await verifyResponse.json();
                                const verifyEntries = Object.values(verifyData.entries || {});
                                const verifyEntry = verifyEntries.find(e => e.uid === testEntry.uid);
                                
                                if (verifyEntry && verifyEntry.content.includes('ST-Phone测试标记')) {
                                    log('   ✅ 写入成功！测试标记已保存');
                                    
                                    // 恢复原始内容
                                    testEntry.content = originalContent;
                                    await ctx.saveWorldInfo(bookName, testBookData, true);
                                    log('   已恢复原始内容');
                                } else {
                                    log('   ❌ 写入失败！保存后未找到测试标记');
                                    log(`   验证条目内容末尾: "${verifyEntry?.content?.slice(-50)}"`);
                                }
                            } else {
                                log(`   ❌ 验证请求失败: ${verifyResponse.status}`);
                            }
                        } else {
                            log('   ⚠️ 世界书为空，无法测试');
                        }
                        } else {
                            log('   ⚠️ 无法加载测试数据');
                        }
                    }
                } catch (writeErr) {
                    log(`   ❌ 写入测试失败: ${writeErr.message}`);
                }
            }
            
            log('\n=== 诊断完成 ===');
            
        } catch (e) {
            log(`\n❌ 诊断过程出错: ${e.message}`);
            console.error(e);
        }
    };

    // 绑定手动同步按钮 - 带详细调试反馈
    document.getElementById('btn-manual-sync').onclick = async function() {
        const btn = this;
        const status = document.getElementById('sync-status-text');
        
        // 清除之前的调试信息
        window.ST_PHONE._lastSyncDebug = null;
        
        if (!window.ST_PHONE.config.targetWorldBook) {
            status.innerHTML = "❌ 请先在上方选择世界书";
            status.style.color = "#ff3b30";
            return;
        }

        btn.disabled = true;
        btn.style.opacity = 0.6;
        status.innerHTML = "⏳ 正在连接核心...";
        status.style.color = "#8e8e93";

        try {
            // 检查 core.js 是否已加载
            if (!window.ST_PHONE.syncNow) {
                status.innerHTML = "❌ 核心模块未加载<br><small>请检查控制台是否有 core.js 加载错误</small>";
                status.style.color = "#ff3b30";
                return;
            }
            
            // 检查 SillyTavern Context
            if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) {
                status.innerHTML = "❌ SillyTavern 上下文不可用<br><small>请确保在酒馆环境中运行</small>";
                status.style.color = "#ff3b30";
                return;
            }
            
            const context = SillyTavern.getContext();
            status.innerHTML = "⏳ 检查 API 可用性...";
            
            // 详细检查 context
            const checks = {
                'loadWorldInfo': typeof context.loadWorldInfo === 'function',
                'saveWorldInfo': typeof context.saveWorldInfo === 'function',
                'chat': Array.isArray(context.chat),
                'name1': !!context.name1
            };
            
            console.log('🔍 [UI] Context 检查:', checks);
            
            const failedChecks = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
            if (failedChecks.length > 0) {
                status.innerHTML = `❌ Context 缺少: ${failedChecks.join(', ')}<br><small>可能是酒馆版本过旧</small>`;
                status.style.color = "#ff3b30";
                return;
            }
            
            status.innerHTML = "⏳ 扫描短信数据...";
            
            // 检查是否有短信数据
            const contacts = window.ST_PHONE.state.contacts || [];
            const contactsWithMsg = contacts.filter(c => c.messages && c.messages.length > 0);
            
            if (contactsWithMsg.length === 0) {
                status.innerHTML = "⚠️ 无短信数据可同步<br><small>请确保聊天中有 &lt;msg&gt; 格式的短信</small>";
                status.style.color = "#ff9500";
                btn.disabled = false;
                btn.style.opacity = 1;
                return;
            }
            
            status.innerHTML = `⏳ 同步 ${contactsWithMsg.length} 个联系人...`;
            
            // 执行同步
            const result = await window.ST_PHONE.syncNow();
            
            // 获取调试信息
            const debug = window.ST_PHONE._lastSyncDebug;
            
            if (result && typeof result === 'object') {
                if (result.noChanges) {
                    status.innerHTML = "✅ 内容无变化，无需更新";
                    status.style.color = "#34c759";
                } else {
                    status.innerHTML = `✅ 同步成功！<br><small>更新: ${result.updated || 0}, 新建: ${result.created || 0}</small>`;
                    status.style.color = "#34c759";
                }
            } else {
                status.innerHTML = "✅ 同步完成";
                status.style.color = "#34c759";
            }
            
            // 显示调试摘要
            if (debug) {
                console.log('📊 [UI] 同步调试摘要:', debug);
            }
            
        } catch (e) {
            console.error('❌ [UI] 同步错误:', e);
            
            // 获取调试信息
            const debug = window.ST_PHONE._lastSyncDebug;
            let errorDetail = e.message;
            
            if (debug) {
                errorDetail = `${e.message}<br><small>失败步骤: ${debug.step}</small>`;
                console.log('📊 [UI] 错误时的调试信息:', debug);
            }
            
            status.innerHTML = `❌ ${errorDetail}`;
            status.style.color = "#ff3b30";
        } finally {
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = 1;
            }, 5000);
            
            // 10秒后清除状态
            setTimeout(() => {
                status.innerHTML = "";
            }, 10000);
        }
    };

    // 搜索与输入
    document.getElementById('phone-search-bar').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const allContacts = window.ST_PHONE.state.contacts;
        if (!query) {
            window.ST_PHONE.ui.renderContacts(null);
            return;
        }
        const filtered = allContacts.filter(c => {
            const matchName = c.name.toLowerCase().includes(query);
            const matchMsg = c.messages.some(m => m.text.toLowerCase().includes(query));
            return matchName || matchMsg;
        });
        window.ST_PHONE.ui.renderContacts(filtered);
    });
    document.getElementById('btn-add-friend').onclick = () => window.ST_PHONE.ui.toggleNewMsgSheet(true);
    document.getElementById('btn-cancel-new').onclick = () => window.ST_PHONE.ui.toggleNewMsgSheet(false);
    document.getElementById('new-msg-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            window.ST_PHONE.ui.openChatByName(e.target.value.trim());
        }
    });
    document.getElementById('btn-toggle-stickers').onclick = window.ST_PHONE.ui.toggleStickerPanel;

    const msgInput = document.getElementById('msg-input');
    if(msgInput) {
        msgInput.addEventListener('keydown', (e) => { 
            e.stopPropagation();
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    return;
                } else {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                        document.getElementById('btn-send').click(); 
                    }
                    e.target.style.height = '36px'; 
                }
            }
        });
        msgInput.addEventListener('input', function() {
            this.style.height = '36px'; 
            this.style.height = (this.scrollHeight) + 'px'; 
        });
    }

})();