// ─── GrowthPath Academy — AI Chat Widget ─────────────────────────────────────
// Handles all chatbot UI and API communication

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let conversationHistory = [];
  let isOpen = false;
  let isTyping = false;
  let hasGreeted = false;

  // ── DOM References ─────────────────────────────────────────────────────────
  const chatWindow  = document.getElementById('chatWindow');
  const chatToggle  = document.getElementById('chatToggle');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput   = document.getElementById('chatInput');
  const chatBadge   = chatToggle ? chatToggle.querySelector('.chat-badge') : null;

  // ── Toggle Chat ────────────────────────────────────────────────────────────
  window.toggleChat = function () {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('open');
      chatToggle.innerHTML = '✕';
      if (chatBadge) chatBadge.style.display = 'none';
      if (!hasGreeted) {
        hasGreeted = true;
        setTimeout(showGreeting, 400);
      } else {
        scrollToBottom();
      }
      setTimeout(() => chatInput && chatInput.focus(), 400);
    } else {
      chatWindow.classList.remove('open');
      chatToggle.innerHTML = '🎓<span class="chat-badge" style="display:none;">1</span>';
    }
  };

  // ── Show Greeting ──────────────────────────────────────────────────────────
  function showGreeting() {
    const greeting = `👋 Namaste! I'm the GrowthPath Academy assistant.

I'm here to help you with:
• Course details & fees
• Batch schedules & admissions
• Scholarships & hostel
• Free demo class booking

Which exam are you preparing for? 🎯`;
    appendMessage(greeting, 'bot');
    conversationHistory.push({ role: 'assistant', content: greeting });
  }

  // ── Send Message ───────────────────────────────────────────────────────────
  window.sendChatMessage = async function () {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text || isTyping) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendMessage(text, 'user');
    conversationHistory.push({ role: 'user', content: text });

    showTypingIndicator();
    isTyping = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMessage = data.message || 'Sorry, I could not get a response. Please try again.';

      hideTypingIndicator();
      isTyping = false;

      appendMessage(botMessage, 'bot');
      conversationHistory.push({ role: 'assistant', content: botMessage });

      // If lead was captured on server side, optionally show a confirmation
      if (data.leadCaptured) {
        setTimeout(() => {
          appendMessage('✅ Your details have been saved! A senior counselor will call you within 1 hour. In the meantime, feel free to ask any more questions!', 'bot');
        }, 800);
      }
    } catch (err) {
      hideTypingIndicator();
      isTyping = false;
      appendMessage('⚠️ I\'m having trouble connecting right now. Please try again in a moment, or WhatsApp us at +91 70876 42005.', 'bot');
      console.error('Chat error:', err);
    }
  };

  // ── Handle Enter Key ───────────────────────────────────────────────────────
  window.handleChatKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.sendChatMessage();
    }
  };

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  window.autoResizeTextarea = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  // ── Append Message ─────────────────────────────────────────────────────────
  function appendMessage(text, role) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', role === 'bot' ? 'msg-bot' : 'msg-user');
    msgDiv.innerHTML = formatMessage(text);
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // ── Format Message (basic markdown-ish) ───────────────────────────────────
  function formatMessage(text) {
    // Escape HTML first
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convert **bold**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points (•, -, *)
    safe = safe.replace(/^[•\-\*]\s(.+)$/gm, '<span style="display:block;padding-left:12px;">• $1</span>');

    // Convert newlines
    safe = safe.replace(/\n/g, '<br />');

    // Convert rupee symbol display
    safe = safe.replace(/₹/g, '<span style="font-family:sans-serif;">₹</span>');

    return safe;
  }

  // ── Typing Indicator ───────────────────────────────────────────────────────
  let typingEl = null;

  function showTypingIndicator() {
    typingEl = document.createElement('div');
    typingEl.classList.add('typing-indicator');
    typingEl.innerHTML = `
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>`;
    typingEl.style.display = 'block';
    chatMessages.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
      typingEl = null;
    }
  }

  // ── Scroll to Bottom ───────────────────────────────────────────────────────
  function scrollToBottom() {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // ── Pulse badge after 3s to attract attention ──────────────────────────────
  setTimeout(() => {
    if (!isOpen && chatBadge) {
      chatBadge.style.display = 'flex';
      chatBadge.style.animation = 'pulse 1.5s ease-in-out 3';
    }
  }, 3000);

})();
