(function () {
  'use strict';
  var launch, panel, messages, form, input, submit, closeButton;

  function canUse() {
    var access = window.VR_ACCESS;
    return !!(window.VRSB && access && !access.error &&
      Array.isArray(access.permissions) && access.permissions.includes('read_data'));
  }

  function message(text, kind) {
    var item = document.createElement('div');
    item.className = 'vr-ai-message' + (kind ? ' ' + kind : '');
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function syncAccess() {
    launch.hidden = !canUse();
    if (!canUse()) {
      panel.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
    }
  }

  function show() {
    panel.hidden = false;
    input.focus();
  }

  async function ask(question) {
    if (!canUse()) throw new Error('Your account does not have permission to ask the AI assistant.');
    if (typeof window.VR_AI_PLAN !== 'function') throw new Error('The current plan is not available.');
    var plan = window.VR_AI_PLAN();
    if (!plan || !Array.isArray(plan.holdings)) throw new Error('The current plan could not be prepared.');
    var result = await window.VRSB.askAgent(question, plan);
    if (!result || typeof result.answer !== 'string' || !result.answer.trim()) {
      throw new Error('The AI assistant returned an empty answer. Please try again.');
    }
    return result.answer;
  }

  function init() {
    if (document.getElementById('vr-ai-launch')) return;
    launch = document.createElement('button');
    launch.id = 'vr-ai-launch';
    launch.type = 'button';
    launch.textContent = 'Ask Vriddhi AI';
    launch.setAttribute('aria-controls', 'vr-ai-panel');
    launch.setAttribute('aria-expanded', 'false');
    panel = document.createElement('section');
    panel.id = 'vr-ai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Vriddhi AI');
    panel.hidden = true;
    panel.innerHTML = '<div class="vr-ai-head"><h2>Ask Vriddhi AI</h2><button type="button" aria-label="Close chat">&times;</button></div>' +
      '<p class="vr-ai-intro">Ask about this plan. Your read-only plan details are sent to the configured AI provider for an answer. Forecasts are estimates, not financial advice.</p>' +
      '<div class="vr-ai-messages" role="log" aria-live="polite"><div class="vr-ai-message">I can explain your plan and run read-only projections. What would you like to know?</div></div>' +
      '<form class="vr-ai-form"><textarea rows="2" maxlength="1000" aria-label="Your question" placeholder="Ask about your plan…" required></textarea><button type="submit" class="p">Send</button></form>';
    document.body.append(launch, panel);
    messages = panel.querySelector('.vr-ai-messages');
    form = panel.querySelector('form');
    input = form.querySelector('textarea');
    submit = form.querySelector('button[type="submit"]');
    closeButton = panel.querySelector('.vr-ai-head button');
    launch.addEventListener('click', function () {
      show();
      launch.setAttribute('aria-expanded', 'true');
    });
    closeButton.addEventListener('click', function () {
      panel.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      launch.focus();
    });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var question = input.value.trim();
      if (!question || submit.disabled) return;
      message(question, 'user');
      input.value = '';
      submit.disabled = true;
      var pending = message('Thinking…');
      try {
        pending.textContent = await ask(question);
      } catch (error) {
        pending.classList.add('error');
        pending.textContent = error && error.message ? error.message : 'The AI assistant could not answer. Please try again.';
      } finally {
        submit.disabled = false;
        input.focus();
      }
    });
    document.addEventListener('vr:accesschange', syncAccess);
    syncAccess();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
