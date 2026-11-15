export function revealAdminUserControlFocus(target: HTMLElement): void {
  const document = target.ownerDocument;
  const reveal = () => {
    if (!target.isConnected || document.activeElement !== target || !target.matches(':focus-visible')) return;
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!hit?.closest('[data-testid="chatbot-request-launcher"]')) return;
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  };

  reveal();
  document.defaultView?.requestAnimationFrame(reveal);
}
