(() => {
  'use strict';
  const repo = 'Jason902710/calculus-learning', api = 'https://api.github.com/repos/' + repo;
  const $ = s => document.querySelector(s);
  let token = '', manifest, head, tree, busy = false;
  const slots = [...Array.from({length:16},(_,i)=>['week-'+(i+1),'第 '+(i+1)+' 週']),['midterm','期中考'],['final','期末考'],['bonus','期末加分作業']];
  const labels = {hand:'必交作業',practice:'自主練習',original:'老師原始作業',notes:'講義／補充教材'};
  slots.forEach(([value,text])=>$('#slot').add(new Option(text,value)));
  function status(text,error=false){$('#status').textContent=text;$('#status').classList.toggle('error',error)}
  function lock(value){busy=value;document.querySelectorAll('button,input,select').forEach(e=>e.disabled=value)}
  async function request(path,method='GET',body){
    const r=await fetch(api+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2026-03-10',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
    if(!r.ok){const errors={401:'金鑰無效或已到期，請重新登入。',403:'沒有足夠權限，請確認金鑰僅授權此儲存庫，且 Contents 設為 Read and write；也可能是 API 暫時限流。',404:'找不到教材或儲存庫，請確認金鑰已選取 calculus-learning。',409:'網站有其他更新，請重新登入後再試，避免覆蓋最新教材。',422:'更新與目前版本衝突，請重新登入後再試。'};throw new Error(errors[r.status]||'GitHub 連線失敗（'+r.status+'），請稍後再試。')}
    return r.json();
  }
  async function load(){
    const ref=await request('/git/ref/heads/main');head=ref.object.sha;
    const commit=await request('/git/commits/'+head);tree=commit.tree.sha;
    const data=await request('/contents/documents.json?ref='+head);
    manifest=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
    if(manifest.version!==1||!Array.isArray(manifest.documents))throw new Error('教材清單格式有誤，請聯絡網站維護者。');
    render();
  }
  function render(){
    const list=$('#file-list');list.replaceChildren();
    const title=document.createElement('h3');title.textContent='已發布教材（'+manifest.documents.length+'）';list.append(title);
    manifest.documents.forEach(doc=>{
      const row=document.createElement('div');row.className='file-row';
      const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('span');
      name.textContent=doc.title;meta.textContent=(slots.find(s=>s[0]===doc.slot)?.[1]||doc.slot)+' · '+(labels[doc.kind]||doc.kind);
      info.append(name,meta);
      const actions=document.createElement('div'),view=document.createElement('a'),remove=document.createElement('button');
      view.textContent='閱覽 ↗';view.href='./'+doc.path;view.target='_blank';view.rel='noopener';
      remove.type='button';remove.textContent='刪除';remove.setAttribute('aria-label','刪除 '+doc.title);
      remove.onclick=()=>deleteDocument(doc);actions.append(view,remove);row.append(info,actions);list.append(row);
    });
  }
  async function publish(next,entries,message){
    const current=await request('/git/ref/heads/main');if(current.object.sha!==head)throw new Error('網站已被其他操作更新，請重新登入載入最新清單後再試。');
    const created=await request('/git/trees','POST',{base_tree:tree,tree:[...entries,{path:'documents.json',mode:'100644',type:'blob',content:JSON.stringify(next,null,2)+'\n'}]});
    const commit=await request('/git/commits','POST',{message,tree:created.sha,parents:[head]});
    await request('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
    head=commit.sha;tree=created.sha;manifest=next;render();
    $('#commit').href='https://github.com/'+repo+'/commit/'+head;$('#commit').hidden=false;
    status('已送出更新。請等待約 1–3 分鐘，學生網站部署完成後才會顯示新版。');
  }
  $('#login-form').onsubmit=async e=>{
    e.preventDefault();if(busy)return;token=$('#token').value.trim();$('#token').value='';lock(true);status('正在驗證管理權限並讀取教材…');
    try{const metadata=await request('');if(!metadata.permissions?.push)throw new Error('此帳號沒有此網站的管理權限。');await load();$('#login').hidden=true;$('#workspace').hidden=false;status('已登入。可以上傳、更換或刪除教材。')}
    catch(err){token='';status(err.message,true)}finally{lock(false)}
  };
  $('#logout').onclick=()=>{token='';manifest=null;$('#workspace').hidden=true;$('#login').hidden=false;$('#commit').hidden=true;$('#file-list').replaceChildren();$('#file').value='';status('已登出，管理金鑰已從本分頁清除。')};
  $('#upload-form').onsubmit=async e=>{
    e.preventDefault();if(busy||!token)return;
    const file=$('#file').files[0],slot=$('#slot').value,kind=$('#kind').value,title=$('#title').value.trim();
    if(!file||!title)return;
    if(file.size>20*1024*1024){status('PDF 超過 20 MB，請先壓縮後再上傳。',true);return}
    const signature=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
    if(signature!=='%PDF-'){status('請選擇有效的 PDF 檔案。',true);return}
    const old=manifest.documents.find(d=>d.slot===slot&&d.kind===kind);
    if(old&&!confirm('將更換「'+old.title+'」。發布後學生會看到新 PDF，確定更換？'))return;
    lock(true);status('正在上傳並發布，請保持此分頁開啟…');
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
      const blob=await request('/git/blobs','POST',{content:btoa(binary),encoding:'base64'});
      const path=old?.path||'materials/'+slot+'-'+kind+'.pdf';
      const doc={id:slot+'-'+kind,slot,kind,title,path};
      const next={version:1,documents:[...manifest.documents.filter(d=>d.id!==old?.id),doc]};
      await publish(next,[{path,mode:'100644',type:'blob',sha:blob.sha}],'Update teaching PDF: '+slot+' '+kind);$('#file').value='';
    }catch(err){status(err.message,true)}finally{lock(false)}
  };
  async function deleteDocument(doc){
    if(busy||!token||!confirm('刪除「'+doc.title+'」？學生網站將移除此教材，目前檔案也會移除。GitHub 版本紀錄仍保留。'))return;
    lock(true);status('正在移除教材並發布…');
    try{const next={version:1,documents:manifest.documents.filter(d=>d.id!==doc.id)};const shared=next.documents.some(d=>d.path===doc.path);await publish(next,shared?[]:[{path:doc.path,mode:'100644',type:'blob',sha:null}],'Remove teaching PDF: '+doc.id)}catch(err){status(err.message,true)}finally{lock(false)}
  }
})();
