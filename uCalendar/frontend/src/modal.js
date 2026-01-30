// ========================================
// Custom Modal Utility
// ========================================

export const Modal = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async showMessage(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal-overlay';
            modal.innerHTML = `
                <div class="custom-modal">
                    <div class="custom-modal-header">${this.escapeHtml(title)}</div>
                    <div class="custom-modal-body">${this.escapeHtml(message)}</div>
                    <div class="custom-modal-footer">
                        <button class="custom-modal-btn">확인</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const btn = modal.querySelector('.custom-modal-btn');
            const closeModal = () => {
                document.removeEventListener('keydown', handleEscape);
                modal.remove();
                resolve();
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                }
            };

            btn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', handleEscape);
        });
    }
};
