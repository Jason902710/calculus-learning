(() => {
  'use strict';
  const cfg=window.COURSE_AUTH_CONFIG, listeners=new Set();
  const sdk=window.supabase;
  const client=sdk&&cfg?sdk.createClient(cfg.url,cfg.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true}}):null;
  let user=null,admin=false,google=false,generation=0;
  const checked=result=>{if(result.error)throw result.error;return result.data};
  const notify=()=>listeners.forEach(fn=>fn({user,admin,google}));
  function errorText(){document.querySelectorAll('[data-account-status]').forEach(e=>e.textContent='帳號連線失敗，請重新整理或稍後重試。')}
  async function refresh(){
    if(!client){notify();return}
    const version=++generation,session=checked(await client.auth.getSession());
    const next=session.session?checked(await client.auth.getUser()).user:null;
    const allowed=next?checked(await client.rpc('course_is_admin')):false;
    if(version!==generation)return;
    user=next;admin=allowed===true;notify();
    if(next)checked(await client.from('course_profiles').upsert({user_id:next.id,display_name:String(next.user_metadata?.full_name||'學習者').slice(0,100)}));
  }
  const account=window.CourseAccount={
    client,get user(){return user},get admin(){return admin},get google(){return google},
    subscribe(fn){listeners.add(fn);fn({user,admin,google});return()=>listeners.delete(fn)},
    async login(){
      if(!google)throw Error('Google 登入設定尚未完成，請稍後再試。');
      checked(await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,scopes:'openid email profile'}}));
    },
    async logout(){checked(await client.auth.signOut());generation++;user=null;admin=false;notify()},
    async progress(){if(!user)return [];return checked(await client.from('course_progress').select('*').eq('user_id',user.id))},
    async saveProgress(lesson_id,completed,position_seconds=0){
      if(!user)throw Error('請先登入');
      checked(await client.from('course_progress').upsert({user_id:user.id,lesson_id,completed,position_seconds:Math.max(0,Math.min(86400,Number(position_seconds)||0))}));
    },
    async materials(){if(!client)throw Error('後端連線無法載入');return checked(await client.from('course_materials').select('*').order('id'))},
    url(doc){return doc.object_path?client.storage.from('course-pdfs').getPublicUrl(doc.object_path).data.publicUrl:doc.legacy_path},
    async dashboard(){
      if(!admin)throw Error('只有管理者可查看學生進度');
      return {profiles:checked(await client.from('course_profiles').select('*')),progress:checked(await client.from('course_progress').select('*'))};
    },
    async upload({slot,kind,title,file}){
      if(!admin)throw Error('只有管理者可上傳教材');
      if(!file||file.size>20971520||new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('請選擇 20 MB 以下的有效 PDF');
      const id=slot+'-'+kind,object_path='materials/'+crypto.randomUUID()+'.pdf';
      const old=checked(await client.from('course_materials').select('*').eq('id',id).maybeSingle());
      checked(await client.storage.from('course-pdfs').upload(object_path,file,{contentType:'application/pdf',upsert:false}));
      try{checked(await client.from('course_materials').upsert({id,slot,kind,title,object_path,legacy_path:null,hidden:false}))}
      catch(error){await client.storage.from('course-pdfs').remove([object_path]);throw error}
      if(old?.object_path){const clean=await client.storage.from('course-pdfs').remove([old.object_path]);if(clean.error)return '教材已更新，舊檔清理失敗，請在後端儲存空間檢查。'}
      return '教材已發布，學生重新整理即可看到。';
    },
    async remove(doc){
      if(!admin)throw Error('只有管理者可移除教材');
      checked(await client.from('course_materials').update({hidden:true}).eq('id',doc.id).select('id').single());
      if(doc.object_path)checked(await client.storage.from('course-pdfs').remove([doc.object_path]));
    }
  };
  if(client){
    fetch(cfg.url+'/auth/v1/settings',{headers:{apikey:cfg.publishableKey}}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(settings=>{google=settings.external?.google===true;notify()}).catch(errorText);
    client.auth.onAuthStateChange(()=>setTimeout(()=>refresh().catch(()=>{user=null;admin=false;notify();errorText()}),0));
    refresh().catch(errorText);
  }
  const host=document.querySelector('.side-bottom');
  if(host){
    const status=document.createElement('p'),button=document.createElement('button'),privacy=document.createElement('a');status.dataset.accountStatus='';status.className='small';button.className='outline';button.type='button';privacy.href='privacy.html';privacy.textContent='觀看紀錄說明';privacy.style.cssText='display:block;font-size:12px;margin:8px 0';host.prepend(status,button,privacy);
    button.onclick=()=>{if(user)account.logout().catch(errorText);else if(confirm('登入後會保存姓名、完成標記、MP4 播放位置與更新時間，授課管理者可查看。是否繼續 Google 登入？'))account.login().catch(e=>status.textContent=e.message)};
    account.subscribe(({user,google})=>{button.textContent=user?'登出':'使用 Google 登入';button.disabled=!user&&!google;status.textContent=user?'已登入：'+(user.user_metadata?.full_name||'學習者'):google?'登入後可跨裝置保存進度':'Google 登入設定中；教材仍可閱覽';});
  }
})();
