(() => {
  const account=window.CourseAccount,$=s=>document.querySelector(s);let busy=false,version=0;
  const slots=[...Array.from({length:16},(_,i)=>['week-'+(i+1),'第 '+(i+1)+' 週']),['midterm','期中考'],['final','期末考'],['bonus','期末加分作業']];
  slots.forEach(([value,text])=>$('#slot').add(new Option(text,value)));
  const status=text=>$('#status').textContent=text;
  const lock=value=>{busy=value;document.querySelectorAll('#workspace button,#workspace input,#workspace select').forEach(e=>e.disabled=value)};
  if(!account){status('登入程式載入失敗，請檢查連線並重新整理。');return}
  $('#google-login').onclick=()=>account.login().catch(e=>status(e.message));$('#logout').onclick=()=>account.logout().catch(()=>status('登出失敗，請重試。'));
  account.subscribe(async({user,admin,google})=>{
    const turn=++version;$('#workspace').hidden=!admin;$('#dashboard').hidden=!admin;$('#logout').hidden=!user;$('#google-login').hidden=!!user;$('#google-login').disabled=!google;$('#setup-note').hidden=google;
    $('#identity').textContent=user?(user.user_metadata?.full_name||'已登入')+(admin?'｜管理者':'｜一般學習者，沒有教材修改權限'):google?'請使用你的 Google 帳號登入。':'Google 登入服務尚未啟用。';
    $('#students').replaceChildren();$('#file-list').replaceChildren();if(!user)$('#file').value='';
    if(admin)try{await Promise.all([materials(turn),dashboard(turn)])}catch{status('管理資料載入失敗，請重新登入並確認權限。')}
  });
  async function materials(turn=version){
    const docs=await account.materials();if(turn!==version||!account.admin)return;
    const list=$('#file-list');list.replaceChildren();
    docs.forEach(doc=>{
      const row=document.createElement('div');row.className='file-row';const name=document.createElement('strong'),actions=document.createElement('div'),view=document.createElement('a'),remove=document.createElement('button');
      name.textContent=doc.title+(doc.hidden?'（已移除）':'');view.href=account.url(doc);view.textContent='閱覽 ↗';view.target='_blank';view.rel='noopener';remove.type='button';remove.textContent=doc.hidden?'重試刪除檔案':'移除教材';
      remove.onclick=async()=>{if(busy||!confirm('移除「'+doc.title+'」？學生將無法從網站開啟此教材。'))return;lock(true);try{await account.remove(doc);status('教材已移除。');await materials()}catch{status('移除未完成，請重試；若連結已隱藏但檔案刪除失敗，請在後端檢查。')}finally{lock(false)}};
      if(!doc.hidden)actions.append(view);actions.append(remove);row.append(name,actions);list.append(row);
    });
  }
  async function dashboard(turn=version){
    const data=await account.dashboard();if(turn!==version||!account.admin)return;const host=$('#students');host.replaceChildren();
    if(!data.profiles.length){host.textContent='尚無學生登入。';return}
    data.profiles.forEach(profile=>{
      const rows=data.progress.filter(p=>p.user_id===profile.user_id),details=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('p');const latest=rows.map(p=>p.updated_at).sort().at(-1);
      summary.textContent=profile.display_name+'（'+profile.user_id.slice(0,8)+'） · '+rows.filter(p=>p.completed).length+' 題完成 · '+(latest?new Date(latest).toLocaleString('zh-TW'):'尚無進度');
      content.textContent=rows.length?rows.map(r=>r.lesson_id+'：'+(r.completed?'已標記完成':'未完成')+'；播放位置 '+Math.floor(r.position_seconds)+' 秒').join('\n'):'尚無學習紀錄';content.style.whiteSpace='pre-wrap';details.append(summary,content);host.append(details);
    });
  }
  $('#refresh').onclick=()=>dashboard().catch(()=>status('讀取進度失敗，請重試。'));
  $('#upload-form').onsubmit=async e=>{
    e.preventDefault();if(busy||!account.admin)return;if(!confirm('發布此 PDF？相同位置與分類的舊教材會被更換，所有訪客可閱覽。'))return;
    lock(true);status('正在上傳…');try{status(await account.upload({slot:$('#slot').value,kind:$('#kind').value,title:$('#title').value.trim(),file:$('#file').files[0]}));$('#file').value='';await materials()}catch(e){status(e.message||'上傳失敗，請重試。')}finally{lock(false)}
  };
})();
