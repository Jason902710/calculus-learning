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
    frame.title = title + ' PDF 閱覽';frame.src = path;viewer.showModal();close.focus();
  }
  let documents=[];
  function safePath(path){return typeof path==='string'&&/^(?:week-\d+-(?:hand|practice|practice-with-statements)|materials\/(?:week-\d+|midterm|final|bonus)-(?:hand|practice|original|notes))\.pdf$/.test(path)}
  function actionsFor(doc){
    const actions=document.createElement('div');actions.className='assignment-files';
    const preview=document.createElement('button');preview.type='button';preview.textContent=doc.kind==='practice'?'閱覽自主練習 PDF':doc.kind==='original'?'閱覽老師原始作業':'網站內閱覽';preview.setAttribute('aria-label',doc.title+'：網站內閱覽');preview.onclick=()=>openPdf(doc.path,doc.title);
    const download=document.createElement('a');download.href=doc.path;download.download=doc.path.split('/').pop();download.textContent='下載 PDF ↓';download.setAttribute('aria-label',doc.title+'：下載 PDF');
    actions.append(preview,download);return actions;
  }
  function addDocumentLinks(){
    document.querySelectorAll('#cards [data-slot]').forEach(card=>{
      if(card.dataset.documentsReady)return;card.dataset.documentsReady='true';
      documents.filter(d=>d.slot===card.dataset.slot&&safePath(d.path)).forEach(doc=>{
        const groups=[...card.querySelectorAll('.assignment-group')].filter(g=>g.querySelector('.assignment-heading'));
        const target=groups[doc.kind==='hand'?0:doc.kind==='practice'||doc.kind==='original'?1:-1];
        if(target){target.querySelector('.assignment-heading').after(actionsFor(doc));}
        else{const group=document.createElement('section');group.className='assignment-group';const title=document.createElement('strong');title.textContent=doc.title;group.append(title,actionsFor(doc));card.append(group)}
      });
    });
  }
  async function load(){
    try{
      const r=await fetch('documents.json',{cache:'no-store'});if(!r.ok)throw new Error('manifest');
      const data=await r.json();if(data.version!==1||!Array.isArray(data.documents))throw new Error('manifest');documents=data.documents;addDocumentLinks();
    }catch{
      const notice=document.createElement('p');notice.className='muted';notice.textContent='教材清單暫時無法載入，請重新整理或稍後再試。';document.querySelector('#cards').before(notice);
    }
  }
  new MutationObserver(()=>{if(documents.length)addDocumentLinks()}).observe(document.querySelector('#cards'),{childList:true,subtree:true});
  load();
})();
