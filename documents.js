(() => {
  const viewer = document.createElement('dialog');
  viewer.id = 'pdf-viewer';
  viewer.setAttribute('aria-labelledby', 'pdf-viewer-title');
  viewer.innerHTML = `<div class="pdf-header"><div><div class="eyebrow">ASSIGNMENT PDF</div><h2 id="pdf-viewer-title"></h2></div><button type="button" class="pdf-close" aria-label="關閉作業閱覽">×</button></div><div class="pdf-actions"><a id="pdf-open" target="_blank" rel="noopener">新分頁開啟 ↗</a><a id="pdf-download" download>下載 PDF ↓</a></div><p class="pdf-hint">若下方未顯示內容，請使用「新分頁開啟」或下載檔案閱覽。</p><iframe id="pdf-frame" title="作業 PDF 閱覽"></iframe>`;
  document.body.append(viewer);
  const frame = viewer.querySelector('#pdf-frame');
  const close = viewer.querySelector('.pdf-close');
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => frame.removeAttribute('src'));
  function openPdf(path, title) {
    viewer.querySelector('#pdf-viewer-title').textContent = title;
    viewer.querySelector('#pdf-open').href = path;
    viewer.querySelector('#pdf-download').href = path;
    frame.title = title + ' PDF 閱覽';
    frame.src = path;
    viewer.showModal();
    close.focus();
  }
  function addDocumentLinks() {
    document.querySelectorAll('#cards .assignment-group').forEach(group => {
      if (group.querySelector('.assignment-files')) return;
      const heading = group.querySelector('.assignment-heading');
      const number = heading.querySelector('span').textContent.match(/Assignment (\d+)/)?.[1];
      if (!number || Number(number) > 6) return;
      const hand = heading.querySelector('strong').textContent === '必交作業';
      const path = `week-${number}-${hand ? 'hand' : 'practice-with-statements'}.pdf`;
      const title = `第 ${number} 週｜${hand ? '必交作業' : '自主練習'}`;
      const actions = document.createElement('div');
      actions.className = 'assignment-files';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.textContent = hand ? '網站內閱覽' : '閱覽作業＋課本題目';
      preview.setAttribute('aria-label', title + '：網站內閱覽');
      preview.addEventListener('click', () => openPdf(path, title));
      const download = document.createElement('a');
      download.href = path;
      download.download = path;
      download.textContent = '下載 PDF ↓';
      download.setAttribute('aria-label', title + '：下載 PDF');
      actions.append(preview, download);
      if (!hand) {
        const original = document.createElement('a');
        original.href = `week-${number}-practice.pdf`;
        original.target = '_blank';
        original.rel = 'noopener';
        original.textContent = '老師原始作業 ↗';
        original.setAttribute('aria-label', title + '：老師原始作業');
        actions.append(original);
      }
      heading.after(actions);
    });
  }
  new MutationObserver(addDocumentLinks).observe(document.querySelector('#cards'), {childList:true, subtree:true});
  addDocumentLinks();
})();
