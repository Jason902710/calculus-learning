(() => {
  const account=window.CourseAccount;if(!account)return;
  let owner=null,revision=0,ready=false,positions=new Map(),lastSend=0;
  const note=document.createElement('p');note.className='muted';note.setAttribute('role','status');document.querySelector('.stats').after(note);
  const message=text=>note.textContent=text;
  account.subscribe(async({user})=>{
    if(owner===user?.id)return;owner=user?.id;const version=++revision;ready=false;positions=new Map();done=new Set();render();
    const box=document.querySelector('#done');box.disabled=!!user;
    if(!user){message('未登入：完成標記僅保留於這次瀏覽；登入後可同步帳號進度。');return}
    message('正在讀取帳號進度…');
    try{const rows=await account.progress();if(version!==revision)return;rows.forEach(r=>{if(flat.some(l=>l.id===r.lesson_id)){positions.set(r.lesson_id,r.position_seconds);if(r.completed)done.add(r.lesson_id)}});ready=true;render();message('帳號進度已同步。完成標記與 MP4 播放位置會提供授課管理者查看。')}
    catch{if(version===revision)message('無法載入進度，已暫停同步，請重新登入。')}
    finally{if(version===revision)box.disabled=!ready}
  });
  document.querySelector('#done').addEventListener('change',()=>{
    if(!account.user||!ready)return;const id=flat[current].id;account.saveProgress(id,done.has(id),positions.get(id)||0).catch(()=>message('完成標記同步失敗，請檢查連線後重新勾選。'));
  });
  new MutationObserver(()=>{
    const video=document.querySelector('#player video');if(!video)return;const id=flat[current].id,uid=account.user?.id;
    video.addEventListener('loadedmetadata',()=>{const position=positions.get(id)||0;if(position<video.duration)video.currentTime=position});
    const persist=()=>{if(!ready||!uid||account.user?.id!==uid)return;positions.set(id,video.currentTime);account.saveProgress(id,done.has(id),video.currentTime).catch(()=>message('播放位置同步失敗，請檢查連線。'))};
    video.addEventListener('pause',persist);video.addEventListener('timeupdate',()=>{if(Date.now()-lastSend>15000){lastSend=Date.now();persist()}});
  }).observe(document.querySelector('#player'),{childList:true});
})();
