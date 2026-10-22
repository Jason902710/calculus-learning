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
