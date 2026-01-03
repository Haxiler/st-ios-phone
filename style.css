/* 根容器隔离，防止全局污染 */
#st-ios-phone-root {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    color: #000;
}

#st-phone-icon {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 18px;
    cursor: pointer;
    z-index: 19998;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
    background-image: linear-gradient(135deg, #4c4c4c, #1a1a1a);
}
#st-phone-icon:active { transform: scale(0.95); }
#st-phone-icon svg { width: 32px; height: 32px; fill: white; }

#st-phone-window {
    position: fixed;
    top: 100px;
    left: 100px;
    width: 375px;
    height: 720px;
    background-color: #fff;
    border-radius: 44px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    z-index: 20000;
    overflow: hidden;
    border: 10px solid #111;
    box-sizing: content-box; /* 确保边框不吃掉内容宽度 */
}

/* 顶部刘海区域 */
.phone-notch-area {
    width: 100%;
    height: 34px;
    background-color: #fff;
    cursor: move;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 8px;
    z-index: 20;
    position: relative;
    user-select: none;
}
.phone-notch {
    width: 100px;
    height: 24px;
    background-color: #111;
    border-radius: 16px;
}
#status-bar-time {
    position: absolute;
    left: 20px; top: 13px;
    font-size: 12px; font-weight: 600;
    color: #000;
    pointer-events: none;
}

/* 页面切换动画容器 */
.app-container {
    width: 100%;
    height: calc(100% - 34px);
    background-color: #fff;
    position: relative;
    overflow: hidden;
}
.pages-wrapper { width: 100%; height: 100%; position: relative; }
.page {
    width: 100%; height: 100%;
    position: absolute; top: 0; left: 0;
    background-color: #fff;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    display: flex; flex-direction: column;
}
.page.hidden-left { transform: translateX(-30%); opacity: 0.8; }
.page.hidden-right { transform: translateX(100%); box-shadow: -5px 0 20px rgba(0,0,0,0.1); }
.page.active { transform: translateX(0); opacity: 1; z-index: 2; }
.page.hidden-bottom { transform: translateY(100%); z-index: 20; }

/* 导航栏 */
.nav-bar {
    height: 44px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px;
    background-color: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px);
    z-index: 10;
    border-bottom: 0.5px solid rgba(0,0,0,0.1);
}
.nav-title { font-weight: 600; font-size: 17px; position: absolute; left: 50%; transform: translate(-50%); }
.nav-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; color: #007AFF; font-size: 17px; }

/* 搜索栏 */
.ios-search-bar { padding: 0 16px 8px 16px; }
.search-input {
    background-color: #E3E3E8;
    border-radius: 10px; height: 36px;
    display: flex; align-items: center; padding-left: 10px; gap: 6px;
}
/* 提高权重覆盖默认样式 */
#st-ios-phone-root #phone-search-bar {
    background: transparent; border: none; outline: none;
    font-size: 15px; color: #000; width: 100%; height: 100%;
    box-shadow: none;
}

/* 联系人列表 */
.contact-list { flex: 1; overflow-y: auto; }
.contact-item {
    padding: 10px 0; margin-left: 20px;
    border-bottom: 0.5px solid #c6c6c8;
    cursor: pointer;
    height: 76px; display: flex; flex-direction: column; justify-content: center;
}
.contact-item:active { background-color: #f2f2f2; margin-left: 0; padding-left: 20px; }
.name { font-weight: 600; font-size: 16px; }
.time { font-size: 14px; color: #8e8e93; float: right; margin-right: 16px; }
.preview { font-size: 15px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90%; margin-top: 2px; }

/* 聊天气泡 */
.chat-scroll-area {
    flex: 1; overflow-y: auto; padding: 10px 12px;
    display: flex; flex-direction: column; gap: 6px; background-color: #fff;
}
.message-bubble {
    max-width: 72%; padding: 8px 14px;
    border-radius: 18px; font-size: 16px; line-height: 1.35;
    word-wrap: break-word; position: relative;
}
.message-bubble img { max-width: 100%; border-radius: 8px; display: block; margin: 4px 0; }
.message-bubble.received { align-self: flex-start; background-color: #e9e9eb; color: #000; border-bottom-left-radius: 4px; }
.message-bubble.sent { align-self: flex-end; background-color: #007AFF; color: #fff; border-bottom-right-radius: 4px; }

/* 输入区域 */
.input-area {
    padding: 10px 16px 20px 16px;
    background-color: #f9f9f9; border-top: 0.5px solid #bdc5cd;
    display: flex; align-items: center; gap: 12px;
}
#st-ios-phone-root .chat-input {
    flex: 1; border: 1px solid #C6C6C8; border-radius: 20px;
    padding: 9px 12px; font-size: 16px;
    background-color: #FFF; color: #000;
    resize: none; height: 38px; min-height: 38px;
    outline: none;
}
.send-btn {
    width: 28px; height: 28px; border-radius: 50%; background-color: #007AFF;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    flex-shrink: 0;
}
.send-btn svg { width: 15px; height: 15px; fill: white; margin-left: 2px; margin-top: 1px; }

/* 贴纸面板 */
.sticker-panel { height: 250px; background-color: #e9e9eb; overflow: hidden; display: flex; flex-direction: column; transition: height 0.3s; }
.sticker-panel.hidden { height: 0; }
.sticker-grid { flex: 1; overflow-y: auto; padding: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; align-content: start; }
.sticker-grid img { width: 100%; aspect-ratio: 1; object-fit: contain; background: #fff; border-radius: 8px; cursor: pointer; }

/* 蓝点与红点 */
.unread-dot-indicator { display: inline-block; width: 8px; height: 8px; background-color: #007AFF; border-radius: 50%; margin-left: 6px; }
.notification-dot {
    position: absolute; top: -4px; right: -4px; width: 14px; height: 14px;
    background-color: #E5E5EA; border: 3px solid #333; border-radius: 50%;
    z-index: 10000; display: none; transform: scale(0); transition: transform 0.3s;
}
.notification-dot.active { display: block; transform: scale(1); }

/* 时间戳 */
.chat-timestamp { text-align: center; color: #8e8e93; font-size: 11px; margin: 16px 0 8px 0; font-weight: 500; }
