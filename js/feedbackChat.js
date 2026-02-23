class FeedbackChat {
    constructor() {
        this.messages = JSON.parse(localStorage.getItem('eunwoo_feedback')) || [];
        this.userProfile = JSON.parse(localStorage.getItem('eunwoo_user_profile')) || null;
        this.isOpen = false;
        this.selectedAvatar = './assets/avatars/kirby.png'; // Default avatar path
        this.badWords = ['바보', '멍청이', '씨발', '개새끼', '미친']; // 예시 비속어 목록
        this.init();
    }

    init() {
        // 전역 인스턴스 등록
        window.feedbackChat = this;
        this.render();
        this.updateUserInfoUI();

        // 프로필이 없으면 셋업 모달 표시 준비
        if (!this.userProfile) {
            // DOM이 완전히 로드된 후 체크
            setTimeout(() => this.checkProfile(), 500);
        }
    }

    checkProfile() {
        if (!this.userProfile) {
            this.showProfileSetup();
        }
    }

    showProfileSetup() {
        const modal = document.getElementById('profile-setup-modal');
        if (modal) modal.style.display = 'flex';
    }

    selectAvatar(avatarPath, el) {
        this.selectedAvatar = avatarPath;
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');
    }

    saveProfile() {
        const nickInput = document.getElementById('setup-nickname');
        const nickname = nickInput.value.trim();
        if (!nickname) {
            alert('닉네임을 입력해주세요!');
            return;
        }

        this.userProfile = {
            nickname: nickname,
            avatar: this.selectedAvatar,
            isGuest: false
        };

        localStorage.setItem('eunwoo_user_profile', JSON.stringify(this.userProfile));
        document.getElementById('profile-setup-modal').style.display = 'none';
        this.updateUserInfoUI();
        this.render();
    }

    startAsGuest() {
        const avatars = [
            './assets/avatars/kirby.png',
            './assets/avatars/mario.png',
            './assets/avatars/gundam.png',
            './assets/avatars/jet.png',
            './assets/avatars/gun.png'
        ];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        this.userProfile = {
            nickname: '게스트',
            avatar: randomAvatar,
            isGuest: true
        };

        // Do not save to localStorage for guests
        document.getElementById('profile-setup-modal').style.display = 'none';
        this.updateUserInfoUI();
        this.render();
    }

    updateUserInfoUI() {
        const userInfo = document.getElementById('user-info-widget');
        if (userInfo && this.userProfile) {
            userInfo.style.display = 'flex';
            userInfo.innerHTML = `
                <div class="user-avatar">${this.getAvatarHTML(this.userProfile.avatar)}</div>
                <div class="user-details">
                    <div class="user-nick">${this.userProfile.nickname}${this.userProfile.isGuest ? ' (Guest)' : ''}</div>
                    <div class="user-label">나의 프로필</div>
                </div>
                <div class="user-actions">
                    <button class="guide-btn" onclick="window.feedbackChat.showHandbook()">가이드북</button>
                    <button class="logout-btn" onclick="window.feedbackChat.logout()">로그아웃</button>
                </div>
            `;
        }
    }

    async showHandbook() {
        const modal = document.getElementById('handbook-modal');
        const viewer = document.getElementById('handbook-viewer');
        if (!modal || !viewer) return;

        modal.style.display = 'flex';
        viewer.innerHTML = '<p>가이드북을 불러오는 중...</p>';

        try {
            const response = await fetch('./EUNWOO_GAMES_HANDBOOK.md');
            if (!response.ok) throw new Error('파일을 불러올 수 없습니다.');
            const markdown = await response.text();

            // 더 강력한 마크다운 -> HTML 변환
            const lines = markdown.split('\n');
            let isList = false;
            let html = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) {
                    if (isList) { isList = false; return '</ul><br>'; }
                    return '<br>';
                }

                // Headers
                if (trimmed.startsWith('# ')) return `<h1>${trimmed.substring(2)}</h1>`;
                if (trimmed.startsWith('## ')) return `<h2>${trimmed.substring(3)}</h2>`;
                if (trimmed.startsWith('### ')) return `<h3>${trimmed.substring(4)}</h3>`;

                // Horizontal Rule
                if (trimmed === '---') return '<hr>';

                // List items
                if (trimmed.startsWith('- ')) {
                    let prefix = '';
                    if (!isList) { isList = true; prefix = '<ul>'; }
                    let content = trimmed.substring(2);
                    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `${prefix}<li>${content}</li>`;
                }

                let suffix = '';
                if (isList) { isList = false; suffix = '</ul>'; }

                return `${suffix}<p>${trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
            }).join('');

            if (isList) html += '</ul>';

            viewer.innerHTML = `<div class="handbook-rendered">${html}</div>`;
        } catch (error) {
            viewer.innerHTML = `<p style="color: #ff7675;">가이드북 로드 실패: ${error.message}</p>`;
        }
    }

    logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('eunwoo_user_profile');
            this.userProfile = null;
            document.getElementById('user-info-widget').style.display = 'none';
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) chatWindow.style.display = 'none';
            this.isOpen = false;
            this.showProfileSetup();
        }
    }

    getAvatarHTML(avatar) {
        if (avatar && avatar.startsWith('./')) {
            return `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
        return avatar || '👤';
    }

    toggle() {
        if (!this.userProfile) {
            this.showProfileSetup();
            return;
        }
        this.isOpen = !this.isOpen;
        const container = document.getElementById('chat-window');
        if (container) {
            container.style.display = this.isOpen ? 'flex' : 'none';
        }
    }

    addMessage(text, type = 'praise') {
        if (!text.trim() || !this.userProfile) return;

        if (this.containsBadWords(text)) {
            this.showViolationAlert();
            return;
        }

        const newMessage = {
            id: Date.now(),
            text: text,
            type: type, // 'praise' or 'improvement'
            user: {
                nickname: this.userProfile.nickname,
                avatar: this.userProfile.avatar
            },
            timestamp: new Date().toLocaleString(),
            replies: []
        };

        this.messages.unshift(newMessage);
        this.save();
        this.render();
    }

    addReply(messageId, replyText) {
        if (!replyText.trim() || !this.userProfile) return;

        if (this.containsBadWords(replyText)) {
            this.showViolationAlert();
            return;
        }

        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.replies.push({
                id: Date.now(),
                text: replyText,
                user: {
                    nickname: this.userProfile.nickname,
                    avatar: this.userProfile.avatar
                },
                timestamp: new Date().toLocaleString()
            });
            this.save();
            this.render();
        }
    }

    containsBadWords(text) {
        return this.badWords.some(word => text.includes(word));
    }

    showViolationAlert() {
        const warning = document.getElementById('profanity-warning');
        if (warning) {
            warning.style.display = 'flex';
            // 3초 후 강제 새로고침
            setTimeout(() => {
                location.reload();
            }, 3000);
        } else {
            alert('나쁜 말을 사용하셨습니다! 시스템에 의해 퇴장 조치됩니다.');
            location.reload();
        }
    }

    deleteMessage(messageId) {
        if (this.userProfile.isGuest) {
            alert('게스트는 삭제 기능을 사용할 수 없습니다.');
            return;
        }
        const index = this.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            // 자신의 메시지인지 확인 (단순화를 위해 닉네임과 아바타 비교)
            const msg = this.messages[index];
            if (msg.user && msg.user.nickname === this.userProfile.nickname) {
                if (confirm('메시지를 삭제하시겠습니까?')) {
                    this.messages.splice(index, 1);
                    this.save();
                    this.render();
                }
            }
        }
    }

    deleteReply(messageId, replyId) {
        if (this.userProfile.isGuest) {
            alert('게스트는 삭제 기능을 사용할 수 없습니다.');
            return;
        }
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            const replyIndex = message.replies.findIndex(r => r.id === replyId);
            if (replyIndex !== -1) {
                const reply = message.replies[replyIndex];
                if (reply.user && reply.user.nickname === this.userProfile.nickname) {
                    if (confirm('답장을 삭제하시겠습니까?')) {
                        message.replies.splice(replyIndex, 1);
                        this.save();
                        this.render();
                    }
                }
            }
        }
    }

    save() {
        localStorage.setItem('eunwoo_feedback', JSON.stringify(this.messages));
    }

    render() {
        const listContainer = document.getElementById('chat-messages');
        if (!listContainer) return;

        listContainer.innerHTML = this.messages.map(msg => {
            const isMyMsg = !this.userProfile.isGuest && msg.user && msg.user.nickname === this.userProfile.nickname;

            return `
                <div class="chat-msg-item ${msg.type}">
                    <div class="msg-header">
                        <div class="msg-author">
                            <div class="author-avatar-small">${this.getAvatarHTML(msg.user ? msg.user.avatar : null)}</div>
                            <span class="author-name">${msg.user ? this.escapeHTML(msg.user.nickname) : '익명'}</span>
                        </div>
                        <div class="msg-meta">
                            <span class="msg-tag">${msg.type === 'praise' ? '👍 칭찬' : '💡 개선'}</span>
                            ${isMyMsg ? `<button class="delete-btn" onclick="window.feedbackChat.deleteMessage(${msg.id})">삭제</button>` : ''}
                        </div>
                    </div>
                    <div class="msg-text">${this.escapeHTML(msg.text)}</div>
                    <div class="msg-time-row">${msg.timestamp}</div>
                    <div class="msg-replies">
                        ${msg.replies.map(r => {
                const isMyReply = !this.userProfile.isGuest && r.user && r.user.nickname === this.userProfile.nickname;
                return `
                                <div class="reply-item">
                                    <div class="reply-author-avatar-small">${this.getAvatarHTML(r.user ? r.user.avatar : null)}</div>
                                    <div class="reply-content">
                                        <div class="reply-header">
                                            <span class="reply-author-name">${r.user ? this.escapeHTML(r.user.nickname) : '익명'}</span>
                                            <div class="reply-meta">
                                                <span class="reply-time">${r.timestamp}</span>
                                                ${isMyReply ? `<button class="delete-btn small" onclick="window.feedbackChat.deleteReply(${msg.id}, ${r.id})">삭제</button>` : ''}
                                            </div>
                                        </div>
                                        <div class="reply-text">${this.escapeHTML(r.text)}</div>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                    <div class="reply-input-area">
                        <input type="text" placeholder="답장하기..." id="reply-input-${msg.id}">
                        <button onclick="window.feedbackChat.submitReply(${msg.id})">보내기</button>
                    </div>
                </div>
            `;
        }).join('');

        // 입력창 클릭 시 경고 추가
        const mainInput = document.getElementById('chat-input');
        if (mainInput && !mainInput.dataset.warningBound) {
            mainInput.addEventListener('focus', () => {
                if (!sessionStorage.getItem('chat_warning_shown')) {
                    alert('⚠️ 주의: 비속어나 나쁜 말을 사용하면 즉시 강제 퇴장될 수 있습니다. 고운 말을 사용해 주세요!');
                    sessionStorage.setItem('chat_warning_shown', 'true');
                }
            });
            mainInput.dataset.warningBound = 'true';
        }
    }

    submitReply(messageId) {
        const input = document.getElementById(`reply-input-${messageId}`);
        if (input) {
            this.addReply(messageId, input.value);
            input.value = '';
        }
    }

    escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    new FeedbackChat();
});
