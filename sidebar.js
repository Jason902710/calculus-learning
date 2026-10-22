(() => {
  const currentWeek = 6;
  const menu = document.querySelector('#chapters');
  const buttons = [...menu.querySelectorAll('button[data-week]')];
  let showFullSchedule = false;
  menu.setAttribute('aria-label', '課程進度');
  menu.innerHTML = `
    <div class="progress-controls">
      <button type="button" id="toggle-full-schedule" aria-expanded="false" aria-controls="schedule-items">展開完整學期進度</button>
      <span id="schedule-status" role="status"></span>
    </div>
    <button type="button" id="toggle-week-menu" class="schedule-heading" aria-expanded="true" aria-controls="schedule-panel">
      <span>每週進度</span>
      <svg class="schedule-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 5 5-5 5" /></svg>
    </button>
    <div id="schedule-panel" class="schedule-panel"><div class="schedule-inner"><div id="schedule-items"></div></div></div>`;
  const list = menu.querySelector('#schedule-items');
  // Move the existing buttons, preserving their original week-navigation handlers.
  buttons.forEach(button => list.append(button));
  const toggle = menu.querySelector('#toggle-full-schedule');
  const heading = menu.querySelector('#toggle-week-menu');
  const panel = menu.querySelector('#schedule-panel');
  const status = menu.querySelector('#schedule-status');
  const released = item => Number.isInteger(item?.week) && item.week <= currentWeek;
  function setExpanded(expanded) {
    heading.setAttribute('aria-expanded', String(expanded));
    panel.classList.toggle('is-collapsed', !expanded);
    panel.inert = !expanded;
  }
  function updateVisibility() {
    buttons.forEach(button => {
      const item = schedule.find(entry => entry.id === button.dataset.week);
      button.hidden = !showFullSchedule && !released(item);
      const badge = button.querySelector('small');
      if (badge) badge.remove();
      if (!released(item)) {
        const label = document.createElement('small');
        label.textContent = '待補';
        button.append(label);
      }
    });
    toggle.textContent = showFullSchedule ? '只顯示目前已開放進度' : '展開完整學期進度';
    toggle.setAttribute('aria-expanded', String(showFullSchedule));
    status.textContent = showFullSchedule ? '完整顯示十六週、考試與加分作業' : '目前顯示第一至第 ' + currentWeek + ' 週';
  }
  heading.addEventListener('click', () => setExpanded(heading.getAttribute('aria-expanded') !== 'true'));
  toggle.addEventListener('click', () => {
    showFullSchedule = !showFullSchedule;
    const active = list.querySelector('[data-week].active');
    if (!showFullSchedule && active && !released(schedule.find(item => item.id === active.dataset.week))) {
      document.querySelector('#overview').click();
    }
    updateVisibility();
    setExpanded(true);
  });
  updateVisibility();
})();

// Toggle the whole sidebar independently of the week-list accordion.
(() => {
  const aside = document.querySelector('aside');
  const main = document.querySelector('main');
  const mobile = window.matchMedia('(max-width: 720px)');
  aside.id = 'course-sidebar';
  aside.setAttribute('aria-label', '課程側邊欄');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'toggle-sidebar';
  trigger.setAttribute('aria-controls', aside.id);
  trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m5-11 3 3-3 3"/></svg>';
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.id = 'sidebar-backdrop';
  backdrop.tabIndex = -1;
  backdrop.setAttribute('aria-label', '關閉側邊欄');
  document.body.append(backdrop, trigger);
  let desktopOpen = true;
  try { desktopOpen = localStorage.getItem('calculus-sidebar-open') !== 'false'; } catch {}
  let open = false;
  function setOpen(value, restoreFocus = false) {
    open = value;
    document.body.classList.toggle('sidebar-open', open);
    document.body.classList.toggle('has-sidebar-overlay', mobile.matches && open);
    aside.inert = !open;
    main.inert = mobile.matches && open;
    backdrop.hidden = !mobile.matches || !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? '收起側邊欄' : '展開側邊欄');
    trigger.title = open ? '收起側邊欄' : '展開側邊欄';
    if (restoreFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => {
    const next = !open;
    if (!mobile.matches) {
      desktopOpen = next;
      try { localStorage.setItem('calculus-sidebar-open', String(next)); } catch {}
    }
    setOpen(next);
  });
  backdrop.addEventListener('click', () => setOpen(false, true));
  aside.addEventListener('click', event => {
    if (mobile.matches && event.target.closest('[data-week], #overview')) setOpen(false, true);
  });
  document.addEventListener('keydown', event => {
    if (!mobile.matches || !open || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
    }
    if (event.key === 'Tab') {
      const visible = [...aside.querySelectorAll('a[href], button, input, select, [tabindex="0"]')]
        .filter(el => !el.disabled && !el.closest('[inert]') && el.getClientRects().length);
      const cycle = [trigger, ...visible];
      const i = cycle.indexOf(document.activeElement);
      if (event.shiftKey && i <= 0) { event.preventDefault(); cycle.at(-1).focus(); }
      else if (!event.shiftKey && (i === -1 || i === cycle.length - 1)) { event.preventDefault(); trigger.focus(); }
    }
  });
  mobile.addEventListener('change', () => setOpen(mobile.matches ? false : desktopOpen, true));
  setOpen(mobile.matches ? false : desktopOpen);
})();
