(function () {
  'use strict';

  var PAGE_ID = 'bbwp-bathroom-renos-lp';
  var SUPABASE_URL = 'https://cgtqlwhdvzhcmzelyrfa.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_KGeNFhcxDpK-EMSx7JDhSQ_r9Ejn6bo';
  var ENDPOINT = SUPABASE_URL + '/rest/v1/page_comments';

  var allComments = [];
  var feedbackActive = false;
  var pendingX = 0, pendingY = 0, pendingLandmark = '';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (sessionStorage.getItem('lw_auth') !== '1') return;
    injectStyles();
    injectAnnotationUI();
    wireEvents();
    loadComments();
    setInterval(loadComments, 30000);
  }

  // ─── Supabase ────────────────────────────────────────────────────────────────

  function headers(withPrefer) {
    var h = {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json'
    };
    if (withPrefer) h['Prefer'] = 'return=representation';
    return h;
  }

  function fetchComments() {
    return fetch(ENDPOINT + '?page_id=eq.' + PAGE_ID + '&order=created_at.asc', {
      headers: headers(false)
    }).then(function (res) {
      if (!res.ok) throw new Error('fetch ' + res.status);
      return res.json();
    });
  }

  function saveComment(xPct, yPct, landmark, text) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        page_id: PAGE_ID,
        x_pct: xPct,
        y_pct: yPct,
        landmark: landmark,
        comment_text: text,
        author: sessionStorage.getItem('lw_user') || 'Anonymous',
        resolved: false
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('save ' + res.status);
      return res.json();
    }).then(function (data) {
      return Array.isArray(data) ? data[0] : data;
    });
  }

  function resolveComment(id) {
    return fetch(ENDPOINT + '?id=eq.' + id, {
      method: 'PATCH',
      headers: headers(true),
      body: JSON.stringify({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('resolve ' + res.status);
      return res.json();
    }).then(function (data) {
      return Array.isArray(data) ? data[0] : data;
    });
  }

  // ─── Positioning ─────────────────────────────────────────────────────────────

  function docCoordsToAbsolutePct(clientX, clientY) {
    var docX = clientX + window.scrollX;
    var docY = clientY + window.scrollY;
    return {
      xPct: (docX / document.documentElement.scrollWidth) * 100,
      yPct: (docY / document.documentElement.scrollHeight) * 100
    };
  }

  function pctToDocCoords(xPct, yPct) {
    return {
      xPx: (xPct / 100) * document.documentElement.scrollWidth,
      yPx: (yPct / 100) * document.documentElement.scrollHeight
    };
  }

  function getNearestLandmark(el) {
    var node = el;
    var semantics = ['section', 'header', 'footer', 'article', 'nav', 'main'];
    while (node && node !== document.body) {
      if (node.id && !/^ann-/.test(node.id)) return '#' + node.id;
      var tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (semantics.indexOf(tag) !== -1) {
        return tag + (node.className ? '.' + String(node.className).split(' ')[0] : '');
      }
      node = node.parentElement;
    }
    return 'body';
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    var s = document.createElement('style');
    s.id = 'ann-styles';
    s.textContent = [
      '#ann-overlay{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:400}',
      'body.ann-feedback-active{cursor:crosshair!important;user-select:none!important}',
      'body.ann-feedback-active *:not([id^="ann"]){cursor:crosshair!important}',
      '#ann-btn{position:fixed;bottom:80px;right:24px;z-index:450;background:#343D50;color:#fff;border:none;border-radius:28px;padding:10px 18px;font:700 13px/1 Roboto,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;transition:background .2s}',
      '#ann-btn:hover{background:#4a5568}',
      '#ann-btn.active{background:#7FDA54;color:#343D50}',
      '#ann-btn .ann-dot{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block}',
      '@media(max-width:640px){#ann-btn{bottom:144px}}',
      '.ann-pin{position:absolute;width:28px;height:28px;border-radius:50%;background:#343D50;color:#fff;border:2px solid #7FDA54;font:700 11px/26px Roboto,sans-serif;text-align:center;cursor:pointer;pointer-events:auto;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,.3);transition:transform .15s;z-index:401}',
      '.ann-pin:hover{transform:translate(-50%,-50%) scale(1.2)}',
      '.ann-pin.resolved{background:#aaa;border-color:#ccc;opacity:.55}',
      '.ann-pin.ann-pulse{animation:ann-pulse-kf .6s ease-out}',
      '@keyframes ann-pulse-kf{0%{transform:translate(-50%,-50%) scale(1)}40%{transform:translate(-50%,-50%) scale(1.6)}100%{transform:translate(-50%,-50%) scale(1)}}',
      '#ann-form,#ann-popover{position:fixed;z-index:460;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.2);font:400 14px/1.5 Roboto,sans-serif;color:#343D50}',
      '#ann-form{top:50%;left:50%;transform:translate(-50%,-50%);width:360px;max-width:calc(100vw - 32px);padding:24px}',
      '#ann-form h4{margin:0 0 12px;font-size:15px;font-weight:700}',
      '#ann-form textarea{width:100%;box-sizing:border-box;min-height:90px;border:1.5px solid #ddd;border-radius:6px;padding:10px 12px;font:400 14px/1.5 Roboto,sans-serif;resize:vertical;outline:none;margin-bottom:6px}',
      '#ann-form textarea:focus{border-color:#7FDA54}',
      '#ann-form .ann-form-author{font-size:12px;color:#888;margin-bottom:14px}',
      '#ann-form .ann-form-actions{display:flex;gap:8px;justify-content:flex-end}',
      '.ann-form-error{color:#c0392b;font-size:12px;margin-bottom:10px;display:none}',
      '.ann-btn-primary{background:#7FDA54;color:#343D50;border:none;border-radius:6px;padding:9px 18px;font:700 13px/1 Roboto,sans-serif;cursor:pointer}',
      '.ann-btn-primary:hover{background:#6bc944}',
      '.ann-btn-secondary{background:none;color:#888;border:1.5px solid #ddd;border-radius:6px;padding:9px 14px;font:400 13px/1 Roboto,sans-serif;cursor:pointer}',
      '.ann-btn-secondary:hover{border-color:#aaa;color:#555}',
      '#ann-popover{padding:18px;width:280px;max-width:calc(100vw - 32px)}',
      '#ann-popover .ann-pop-num{font-size:22px;font-weight:700;color:#7FDA54;margin-bottom:4px}',
      '#ann-popover .ann-pop-landmark{font-size:11px;color:#aaa;font-style:italic;margin-bottom:10px}',
      '#ann-popover .ann-pop-text{font-size:14px;line-height:1.5;margin-bottom:10px;color:#343D50}',
      '#ann-popover .ann-pop-meta{font-size:11px;color:#888;margin-bottom:14px}',
      '#ann-popover .ann-resolved-badge{font-size:12px;color:#6D996D;font-weight:700;letter-spacing:.05em}',
      '.ann-btn-done{background:none;border:1.5px solid #343D50;color:#343D50;border-radius:6px;padding:7px 14px;font:700 12px/1 Roboto,sans-serif;cursor:pointer}',
      '.ann-btn-done:hover{background:#343D50;color:#fff}',
      '.ann-pop-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:18px;cursor:pointer;color:#aaa;line-height:1;padding:0}',
      '#ann-sidebar{position:fixed;right:0;top:78px;z-index:430;height:calc(100vh - 78px);width:0;overflow:hidden;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.12);transition:width .25s ease;font:400 13px/1.5 Roboto,sans-serif;color:#343D50}',
      '#ann-sidebar.open{width:300px}',
      '#ann-sidebar-tab{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:431;background:#343D50;color:#fff;writing-mode:vertical-rl;padding:14px 8px;cursor:pointer;font:700 11px/1 Roboto,sans-serif;letter-spacing:.08em;border-radius:6px 0 0 6px;box-shadow:-2px 0 8px rgba(0,0,0,.15);transition:right .25s ease}',
      '#ann-sidebar.open ~ #ann-sidebar-tab{right:300px}',
      '#ann-sidebar-inner{width:300px;height:100%;overflow-y:auto;padding:20px 16px;box-sizing:border-box}',
      '#ann-sidebar h3{margin:0 0 14px;font-size:14px;font-weight:700}',
      '.ann-sb-section{margin-bottom:20px}',
      '.ann-sb-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:8px}',
      '.ann-sb-item{background:#f8f9fa;border-radius:6px;padding:10px 12px;margin-bottom:6px;display:flex;gap:10px;align-items:flex-start}',
      '.ann-sb-item.resolved{opacity:.6}',
      '.ann-sb-num{width:22px;height:22px;border-radius:50%;background:#343D50;color:#fff;font:700 10px/22px Roboto,sans-serif;text-align:center;flex-shrink:0}',
      '.ann-sb-item.resolved .ann-sb-num{background:#aaa}',
      '.ann-sb-content{flex:1;min-width:0}',
      '.ann-sb-text{font-size:13px;color:#343D50;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ann-sb-meta{font-size:11px;color:#aaa;margin-bottom:5px}',
      '.ann-sb-jump{font-size:11px;color:#6D996D;font-weight:700;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline}',
      '.ann-sb-empty{font-size:13px;color:#aaa;font-style:italic}',
      '#ann-toast{position:fixed;top:90px;left:50%;transform:translateX(-50%);z-index:470;background:#343D50;color:#fff;padding:10px 20px;border-radius:20px;font:400 13px/1 Roboto,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap}'
    ].join('');
    document.head.appendChild(s);
  }

  // ─── UI Injection ─────────────────────────────────────────────────────────────

  function injectAnnotationUI() {
    var overlay = el('div', { id: 'ann-overlay' });
    document.body.appendChild(overlay);

    var btn = el('button', { id: 'ann-btn' });
    btn.innerHTML = '<span class="ann-dot"></span> Leave Feedback';
    btn.addEventListener('click', toggleFeedbackMode);
    document.body.appendChild(btn);

    var form = el('div', { id: 'ann-form', style: 'display:none' });
    form.innerHTML =
      '<button class="ann-pop-close" id="ann-form-close">\xD7</button>' +
      '<h4>Leave a comment</h4>' +
      '<div class="ann-form-error" id="ann-form-error">Please enter a comment.</div>' +
      '<textarea id="ann-form-text" placeholder="What do you want to change?"></textarea>' +
      '<p class="ann-form-author">Commenting as <strong>' + escHtml(sessionStorage.getItem('lw_user') || 'Anonymous') + '</strong></p>' +
      '<div class="ann-form-actions">' +
        '<button class="ann-btn-secondary" id="ann-form-cancel">Cancel</button>' +
        '<button class="ann-btn-primary" id="ann-form-submit">Save comment</button>' +
      '</div>';
    document.body.appendChild(form);
    document.getElementById('ann-form-close').addEventListener('click', closeCommentForm);
    document.getElementById('ann-form-cancel').addEventListener('click', closeCommentForm);
    document.getElementById('ann-form-submit').addEventListener('click', submitComment);
    document.getElementById('ann-form-text').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
    });

    var popover = el('div', { id: 'ann-popover', style: 'display:none' });
    document.body.appendChild(popover);

    var sidebar = el('div', { id: 'ann-sidebar' });
    sidebar.innerHTML = '<div id="ann-sidebar-inner"><h3>Feedback</h3><div id="ann-sb-content"></div></div>';
    document.body.appendChild(sidebar);

    var tab = el('div', { id: 'ann-sidebar-tab' });
    tab.textContent = 'Comments (0)';
    tab.addEventListener('click', function () {
      document.getElementById('ann-sidebar').classList.toggle('open');
    });
    document.body.appendChild(tab);

    var toast = el('div', { id: 'ann-toast' });
    document.body.appendChild(toast);
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  function wireEvents() {
    document.addEventListener('click', handlePageClick, true);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeCommentForm();
      closePopover();
      if (feedbackActive) disableFeedbackMode();
    });
  }

  // ─── Feedback mode ───────────────────────────────────────────────────────────

  function toggleFeedbackMode() { feedbackActive ? disableFeedbackMode() : enableFeedbackMode(); }

  function enableFeedbackMode() {
    feedbackActive = true;
    document.body.classList.add('ann-feedback-active');
    var btn = document.getElementById('ann-btn');
    btn.classList.add('active');
    btn.innerHTML = '<span class="ann-dot"></span> Stop Annotating';
  }

  function disableFeedbackMode() {
    feedbackActive = false;
    document.body.classList.remove('ann-feedback-active');
    var btn = document.getElementById('ann-btn');
    btn.classList.remove('active');
    btn.innerHTML = '<span class="ann-dot"></span> Leave Feedback';
  }

  function handlePageClick(e) {
    if (!feedbackActive) return;
    if (e.target.closest('#ann-btn,#ann-form,#ann-popover,#ann-sidebar,#ann-sidebar-tab,.ann-pin')) return;
    e.stopPropagation();
    e.preventDefault();
    var coords = docCoordsToAbsolutePct(e.clientX, e.clientY);
    openCommentForm(coords.xPct, coords.yPct, getNearestLandmark(e.target));
  }

  // ─── Comment form ────────────────────────────────────────────────────────────

  function openCommentForm(xPct, yPct, landmark) {
    pendingX = xPct; pendingY = yPct; pendingLandmark = landmark;
    var textarea = document.getElementById('ann-form-text');
    textarea.value = '';
    document.getElementById('ann-form-error').style.display = 'none';
    document.getElementById('ann-form').style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(function () { textarea.focus(); }, 50);
  }

  function closeCommentForm() {
    document.getElementById('ann-form').style.display = 'none';
    document.body.style.overflow = '';
  }

  function submitComment() {
    var text = document.getElementById('ann-form-text').value.trim();
    var errEl = document.getElementById('ann-form-error');
    if (!text) { errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    saveComment(pendingX, pendingY, pendingLandmark, text).then(function (comment) {
      allComments.push(comment);
      renderAllPins(allComments);
      renderSidebar(allComments);
      closeCommentForm();
      disableFeedbackMode();
      showToast('Comment saved');
    }).catch(function () {
      errEl.textContent = 'Could not save — please try again.';
      errEl.style.display = 'block';
    });
  }

  // ─── Load & render ───────────────────────────────────────────────────────────

  function loadComments() {
    fetchComments().then(function (data) {
      allComments = data;
      renderAllPins(allComments);
      renderSidebar(allComments);
    }).catch(function (err) {
      console.warn('Annotations: could not load', err);
    });
  }

  function renderAllPins(comments) {
    var overlay = document.getElementById('ann-overlay');
    overlay.innerHTML = '';
    comments.forEach(function (comment, i) {
      overlay.appendChild(renderPin(comment, i + 1));
    });
  }

  function renderPin(comment, index) {
    var coords = pctToDocCoords(comment.x_pct, comment.y_pct);
    var pin = document.createElement('button');
    pin.className = 'ann-pin' + (comment.resolved ? ' resolved' : '');
    pin.dataset.id = comment.id;
    pin.textContent = index;
    pin.style.left = coords.xPx + 'px';
    pin.style.top = coords.yPx + 'px';
    pin.addEventListener('click', function (e) {
      e.stopPropagation();
      openPopover(comment, pin, index);
    });
    return pin;
  }

  function renderSidebar(comments) {
    var open = comments.filter(function (c) { return !c.resolved; });
    var resolved = comments.filter(function (c) { return c.resolved; });
    var tab = document.getElementById('ann-sidebar-tab');
    if (tab) tab.textContent = 'Comments (' + open.length + ')';
    var content = document.getElementById('ann-sb-content');
    if (!content) return;

    var html = '<div class="ann-sb-section"><div class="ann-sb-section-title">Open (' + open.length + ')</div>';
    if (!open.length) {
      html += '<div class="ann-sb-empty">No open comments</div>';
    } else {
      open.forEach(function (c) { html += sidebarItem(c, comments.indexOf(c) + 1, false); });
    }
    html += '</div>';

    if (resolved.length) {
      html += '<div class="ann-sb-section"><div class="ann-sb-section-title">Resolved (' + resolved.length + ')</div>';
      resolved.forEach(function (c) { html += sidebarItem(c, comments.indexOf(c) + 1, true); });
      html += '</div>';
    }

    content.innerHTML = html;

    content.querySelectorAll('.ann-sb-jump').forEach(function (jumpBtn) {
      jumpBtn.addEventListener('click', function () {
        var id = jumpBtn.dataset.id;
        var pin = document.querySelector('.ann-pin[data-id="' + id + '"]');
        var match = allComments.find(function (c) { return c.id === id; });
        if (!pin || !match) return;
        var pos = pctToDocCoords(match.x_pct, match.y_pct);
        window.scrollTo({ top: pos.yPx - window.innerHeight / 2, behavior: 'smooth' });
        pin.classList.add('ann-pulse');
        setTimeout(function () { pin.classList.remove('ann-pulse'); }, 700);
      });
    });
  }

  function sidebarItem(comment, index, isResolved) {
    var short = comment.comment_text.length > 60
      ? comment.comment_text.slice(0, 60) + '…'
      : comment.comment_text;
    var date = new Date(comment.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
    return '<div class="ann-sb-item' + (isResolved ? ' resolved' : '') + '">' +
      '<div class="ann-sb-num">' + index + '</div>' +
      '<div class="ann-sb-content">' +
        '<div class="ann-sb-text">' + escHtml(short) + '</div>' +
        '<div class="ann-sb-meta">' + escHtml(comment.author) + ' \xB7 ' + date + '</div>' +
        '<button class="ann-sb-jump" data-id="' + comment.id + '">Jump to</button>' +
      '</div>' +
    '</div>';
  }

  // ─── Popover ─────────────────────────────────────────────────────────────────

  function openPopover(comment, pinEl, index) {
    var popover = document.getElementById('ann-popover');
    var date = new Date(comment.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
    var resolvedDate = comment.resolved_at
      ? new Date(comment.resolved_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
    var actionHtml = comment.resolved
      ? '<div class="ann-resolved-badge">✓ Resolved ' + resolvedDate + '</div>'
      : '<button class="ann-btn-done" id="ann-mark-done">Mark done</button>';

    popover.innerHTML =
      '<button class="ann-pop-close" id="ann-pop-close">\xD7</button>' +
      '<div class="ann-pop-num">#' + index + '</div>' +
      '<div class="ann-pop-landmark">' + escHtml(comment.landmark || 'body') + '</div>' +
      '<div class="ann-pop-text">' + escHtml(comment.comment_text) + '</div>' +
      '<div class="ann-pop-meta">' + escHtml(comment.author) + ' \xB7 ' + date + '</div>' +
      actionHtml;

    popover.style.display = 'block';

    document.getElementById('ann-pop-close').addEventListener('click', closePopover);
    if (!comment.resolved) {
      document.getElementById('ann-mark-done').addEventListener('click', function () {
        markDone(comment.id);
      });
    }

    var rect = pinEl.getBoundingClientRect();
    var pw = 280, ph = 200;
    var left = rect.right + 10;
    var top = rect.top - 10;
    if (left + pw > window.innerWidth - 16) left = rect.left - pw - 10;
    if (top + ph > window.innerHeight - 16) top = window.innerHeight - ph - 16;
    if (top < 80) top = 80;
    if (left < 8) left = 8;
    popover.style.top = top + 'px';
    popover.style.left = left + 'px';

    setTimeout(function () {
      function outsideClick(e) {
        if (!popover.contains(e.target) && e.target !== pinEl) {
          closePopover();
          document.removeEventListener('click', outsideClick);
        }
      }
      document.addEventListener('click', outsideClick);
    }, 0);
  }

  function closePopover() {
    var p = document.getElementById('ann-popover');
    if (p) p.style.display = 'none';
  }

  function markDone(id) {
    resolveComment(id).then(function () {
      var idx = allComments.findIndex(function (c) { return c.id === id; });
      if (idx !== -1) {
        allComments[idx].resolved = true;
        allComments[idx].resolved_at = new Date().toISOString();
      }
      renderAllPins(allComments);
      renderSidebar(allComments);
      closePopover();
      showToast('Marked as done');
    }).catch(function () {
      showToast('Could not update — try again');
    });
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  function showToast(message) {
    var toast = document.getElementById('ann-toast');
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.style.opacity = '0'; }, 2200);
  }

  // ─── Utils ───────────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
