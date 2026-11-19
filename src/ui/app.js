import {badge,glyph,palette,rarityNames} from './badges.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const desktop=Boolean(window.tokenGo),repo='https://github.com/DragonYJ/TokenGo';
let state,view='collection',tab='all',category='all',query='',rarity='all',page=1,selected=null,sharing=[],busy=false;
const categoryLabels={tokens:'能量足迹',tasks:'冒险旅程',tools:'工具大师',exploration:'探索世界',time:'时间旅人',code:'代码工坊',creative:'造物空间',collaboration:'协作艺术',hidden:'秘密档案'};
const viewLabels={collection:'成就图鉴',hidden:'秘密档案',cabinet:'我的展柜',activity:'解锁足迹',community:'社区共创',settings:'偏好设置'};
const sourceNames={history:'历史发现',live:'实时记录',migration:'规则更新',demo:'演示记录'};
const fmt=n=>new Intl.NumberFormat('zh-CN',{notation:n>=10000?'compact':'standard',maximumFractionDigits:1}).format(n||0);
const earned=()=>state.achievements.filter(a=>!a.locked);
const pinsKey=()=>`tokengo.pins.${state.demo?'demo':'local'}`;
function pins(){try{return JSON.parse(localStorage.getItem(pinsKey())||'[]').filter(id=>state.achievements.some(a=>a.id===id&&!a.locked));}catch{return [];}}
function notify(message){$('#snackbar').textContent=message;$('#snackbar').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#snackbar').classList.remove('visible'),3200);}
async function invoke(action,payload){
 try{
  if(desktop)return await window.tokenGo.invoke(action,payload);
  if(action==='open-repo'){window.open(repo,'_blank','noopener,noreferrer');return true;}
  if(action==='copy-text'){await navigator.clipboard.writeText(payload);return true;}
  if(action==='save-image'){const a=document.createElement('a');a.href=payload;a.download='TokenGo-achievement.png';a.click();return true;}
  if(action==='copy-image'){const blob=await new Promise(resolve=>$('#share-canvas').toBlob(resolve));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);return true;}
  if(action==='share'){
   const url=payload.platform==='x'?`https://x.com/intent/post?text=${encodeURIComponent(payload.text)}`:`https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(payload.title)}&text=${encodeURIComponent(payload.text)}`;
   window.open(url,'_blank','noopener,noreferrer');return true;
  }
  if(action==='demo-toast'){webToast();return true;}
  notify('这是演示展馆。安装桌面版后，可在本机采集真实成就。');return null;
 }catch(error){notify(`操作未完成：${error.message}`);return null;}
}
function updateChrome(){
 $('#view-label').textContent=viewLabels[view];$('#nav-total').textContent=state.achievements.length.toLocaleString();
 $('#profile-mode').textContent=state.demo?'演示探险家 · 示例记录':`${earned().length} 枚成就 · 本地记录`;
 $('#mode-indicator').innerHTML=`<i class="status-dot"></i> ${state.demo?'演示展馆':state.settings.watching?'本地采集中':'采集已暂停'}`;
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('#banner').hidden=!state.demo;
 $('#banner').textContent='你正在浏览演示展馆：所有进度均为示例，分享图片也会标明「演示」。真实记录始终保存在你的电脑上。';
}
function stat(icon,value,label){return `<div class="stat"><span class="stat-icon">${glyph(icon)}</span><div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>`;}
function featuredCard(a){return `<button class="featured ${a.rarity}" data-achievement="${a.id}" style="--rarity:${palette[a.rarity][0]}"><div class="featured-badge">${badge(a.icon,a.rarity,a.locked)}</div><div class="featured-info"><span class="rarity-tag">${rarityNames[a.rarity]}${a.hidden?' · 隐藏成就':''}</span><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><small>${a.locked?'下一段旅程，等你发现':`${state.demo?'演示解锁':sourceNames[a.award.source]||'本地记录'}　✧`}</small></div></button>`;}
function card(a){
 const progress=Math.round(a.progress*100),current=a.conditions?.[0];
 return `<button class="achievement ${a.locked?'locked':'unlocked'}" data-achievement="${a.id}" style="--rarity:${palette[a.rarity][0]}" aria-label="${esc(a.name)}，${a.locked?'未解锁':'已解锁'}"><span class="rarity-corner">${rarityNames[a.rarity]}</span>${!a.locked?'<span class="earned-check">✓</span>':''}${pins().includes(a.id)?'<span class="pin-mark">✦</span>':''}<div class="achievement-badge">${badge(a.icon,a.rarity,a.hidden&&a.locked)}</div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><div class="progress"><span style="width:${progress}%"></span></div><div class="progress-label"><span>${a.hidden&&a.locked?'条件未揭晓':a.locked&&current?`${fmt(current.current)} / ${fmt(current.gte)}`:'已收入收藏'}</span><span>${a.hidden&&a.locked?'✧':`${progress}%`}</span></div></button>`;
}
function collection(){
 const total=state.achievements.length,unlocked=earned().length;
 const picks=state.demo?['secrets.still-working','secrets.returning','secrets.million'].map(id=>state.achievements.find(a=>a.id===id)):
   earned().filter(a=>a.hidden).slice(-3);
 if(picks.length<3)picks.push(...state.achievements.filter(a=>!a.hidden&&a.tier===1&&!picks.includes(a)).slice(0,3-picks.length));
 return `<section class="hero"><div class="hero-copy"><div class="chapter">每个好奇心，都有自己的远征</div><h1>每一次探索，<br>都值得被收藏。</h1><p>那些认真完成的任务、不经意的尝试，<br>终会成为你的独特印记。下一枚惊喜，正在路上。</p><div class="hero-buttons"><button class="button" data-action="${state.demo?'install':state.settings.watching?'preview':'watch'}">${state.demo?'开始我的旅程 ↗':state.settings.watching?'✦ 体验解锁时刻':'✦ 开启本地采集'}</button><button class="button ghost" data-action="cabinet">查看我的展柜</button></div></div><div class="hero-art" aria-hidden="true"><div class="orbit-ring"></div><div class="orbit-ring two"></div><div class="orbit-ring three"></div><span class="art-star one">✦</span><span class="art-star two">✦</span><span class="art-star three">✧</span><div class="hero-medal">${badge('compass','legendary')}</div><span class="floating-label">好奇心，是你的罗盘。</span></div></section>
 <section class="stats" aria-label="成就统计">${stat('trophy',`${unlocked}<small> / ${total.toLocaleString()}</small>`,'已收集成就')}${stat('spark',fmt(state.metrics['tokens.total']),'累计 token 足迹')}${stat('flag',fmt(state.metrics['tasks.completed']),'已结束任务')}${stat('flame',`${state.metrics.streak||0}<small> 天</small>`,'最长活跃连击')}</section>
 <section><div class="section-header"><h2>${unlocked?'旅途中的高光':'第一枚，从这里开始'} <small>${unlocked?'每一枚，都有一段故事':'无需刻意，正常使用就好'}</small></h2><button class="text-button" data-action="activity">查看解锁足迹 ↗</button></div><div class="featured-grid">${picks.map(featuredCard).join('')}</div></section>
 <section><div class="section-header"><h2>探索成就图鉴 <small>${total.toLocaleString()} 个等待被发现的瞬间</small></h2><span class="muted" style="font-size:10px">60 个成长系列 · 24 个秘密</span></div>${filters()}<div id="results"></div></section>`;
}
function filters(){return `<div class="toolbar"><div class="tabs" role="tablist" aria-label="成就状态">${[['all','全部成就',state.achievements.length],['earned','已解锁',earned().length],['progress','进行中',state.achievements.filter(a=>a.locked&&a.progress>0).length]].map(([id,label,count])=>`<button role="tab" aria-selected="${tab===id}" class="tab ${tab===id?'active':''}" data-tab="${id}">${label}<small>${count}</small></button>`).join('')}</div><div class="filter-controls"><label class="search-wrap"><span>⌕</span><input id="search" type="search" placeholder="寻找一枚成就…" aria-label="搜索成就" value="${esc(query)}"></label><select id="rarity" aria-label="按稀有度筛选"><option value="all">全部稀有度</option>${Object.entries(rarityNames).map(([id,label])=>`<option value="${id}" ${rarity===id?'selected':''}>${label}</option>`).join('')}</select></div></div>${view==='hidden'?'':`<div class="categories"><button class="chip ${category==='all'?'active':''}" data-category="all">全部领域</button>${Object.entries(categoryLabels).map(([id,label])=>`<button class="chip ${category===id?'active':''}" data-category="${id}">${label}</button>`).join('')}</div>`}`;}
function renderResults(){
 let all=state.achievements.filter(a=>(view!=='hidden'||a.hidden)&&(category==='all'||a.category===category)&&(rarity==='all'||a.rarity===rarity)&&(tab==='all'||(tab==='earned'?!a.locked:a.locked&&a.progress>0))&&(`${a.name} ${a.description}`).toLowerCase().includes(query.toLowerCase()));
 // Interleave tiers so the first page is a world of possibilities, not twenty token thresholds.
 all.sort((a,b)=>(a.tier||1.5)-(b.tier||1.5) || a.category.localeCompare(b.category));
 const pages=Math.max(1,Math.ceil(all.length/24));page=Math.min(page,pages);
 $('#results').innerHTML=all.length?`<div class="achievement-grid">${all.slice((page-1)*24,page*24).map(card).join('')}</div><div class="pagination"><span>共 ${all.length.toLocaleString()} 枚成就 · 第 ${page} / ${pages} 页</span><div><button data-page="${page-1}" ${page===1?'disabled':''}>上一页</button><button data-page="${page+1}" ${page===pages?'disabled':''}>下一页</button></div></div>`:`<div class="empty"><div class="empty-icon">${glyph('compass')}</div><h3>这里还没有足迹</h3><p>${query?'换个关键词，或调整筛选条件。':'照常探索，新的成就会在旅途中出现。'}</p><button class="button secondary" data-action="clear">查看全部成就</button></div>`;
}
function hidden(){return `<div class="page-heading"><h1>有些惊喜，不能提前剧透。</h1><p>24 个隐藏成就，藏在你平常的工作里。解锁之前，名称与条件都保持神秘。</p></div>${filters()}<div id="results"></div>`;}
function cabinet(){
 const selectedPins=pins(),awards=selectedPins.map(id=>state.achievements.find(a=>a.id===id));
 return `<div class="page-heading"><h1>这就是，我的冒险。</h1><p>挑选至多 6 枚最能代表你的成就。展柜只保存在本机，分享时生成图片。</p></div><div class="cabinet-stage"><div class="section-header"><div><h2>本地探险家的收藏</h2><p>${state.demo?'演示展柜 · 不代表真实使用记录':'每一枚徽章，都是一个属于你的瞬间。'}</p></div><button class="button" data-action="share-cabinet" ${!awards.length?'disabled':''}>分享展柜 ↗</button></div><div class="cabinet-slots">${Array.from({length:6},(_,i)=>awards[i]?`<div class="cabinet-slot filled"><div class="medal">${badge(awards[i].icon,awards[i].rarity)}</div><strong>${esc(awards[i].name)}</strong><button data-unpin="${awards[i].id}">从展柜移除</button></div>`:'<div class="cabinet-slot"><span style="font-size:28px">＋</span>为下一枚骄傲留个位置</div>').join('')}</div></div><div class="section-header"><h2>挑选你的代表作</h2><span class="muted" style="font-size:11px">点击成就，选择「加入展柜」</span></div>${earned().length?`<div class="achievement-grid">${earned().filter(a=>!selectedPins.includes(a.id)).sort((a,b)=>Number(b.hidden)-Number(a.hidden)).slice(0,24).map(card).join('')}</div>`:'<div class="empty"><h3>展柜在等你的第一枚成就</h3><p>开启本地采集，或扫描历史记录，开始收藏。</p></div>'}`;
}
function activity(){return `<div class="page-heading"><h1>把高光，串成一段旅程。</h1><p>记录解锁的时间与来源。这里的每条记录都留在你的电脑上。</p></div>${earned().length?earned().sort((a,b)=>b.award.at.localeCompare(a.award.at)).slice(0,100).map(a=>`<div class="timeline-row"><div class="timeline-badge">${badge(a.icon,a.rarity)}</div><div><h3>${esc(a.name)}</h3><p>${sourceNames[a.award.source]||'本地记录'} · ${rarityNames[a.rarity]}${a.hidden?' · 隐藏成就':''}</p></div><time>${new Date(a.award.at).toLocaleString('zh-CN')}</time><button data-achievement="${a.id}">查看</button></div>`).join(''):'<div class="empty"><div class="empty-icon">'+glyph('flag')+'</div><h3>新的故事，从这里开始</h3><p>还没有解锁记录。扫描本地 Codex 历史，或开启后台采集。</p><button class="button" data-action="scan">扫描历史记录</button></div>'}${earned().length>100?'<p class="muted">显示最近 100 枚成就；全部记录可在设置中导出。</p>':''}`;}
function settings(){return `<div class="page-heading"><h1>按你的节奏，收集惊喜。</h1><p>没有账号，没有上传。需要联网的分享操作，始终由你主动发起。</p></div><section class="settings-panel"><h2>后台与提醒</h2><div class="setting-row"><div>本地后台采集<p>每 5 秒检查 Codex 日志变化，增量读取。关闭主窗口后，桌面程序仍可在托盘运行。</p></div><label class="switch"><input id="watch-toggle" type="checkbox" aria-label="本地后台采集" ${state.settings.watching?'checked':''}></label></div><div class="setting-row"><div>免打扰<p>继续收集成就，暂停右下角解锁弹卡。演示弹卡仍可手动预览。</p></div><label class="switch"><input id="quiet-toggle" type="checkbox" aria-label="免打扰" ${state.settings.quiet?'checked':''}></label></div><div class="setting-row"><div>登录后启动<p>使用系统登录项启动 TokenGo；默认关闭。建议安装打包版后开启。</p></div><label class="switch"><input id="startup-toggle" type="checkbox" aria-label="登录后启动" ${state.startup?'checked':''}></label></div><div class="setting-row"><div>解锁弹卡<p>试试你的下一次 aha 时刻。演示不会写入真实成就。</p></div><button class="button secondary" data-action="preview">预览弹卡</button></div></section><section class="settings-panel"><h2>记录与信任</h2><div class="setting-row"><div>发现历史成就<p>只读扫描本机 Codex 日志。历史解锁会注明「历史发现」，不会逐个弹卡。</p></div><button class="button secondary" data-action="scan">扫描历史</button></div><div class="setting-row"><div>导出成就记录<p>导出徽章 ID、解锁时间和指标依据，不包含对话、代码、文件路径。</p></div><button class="button secondary" data-action="export">导出 JSON</button></div><div class="setting-row"><div>本地记录，不是官方认证<p>完整性校验能检测简单改档。掌控设备的人仍可伪造数据，本地徽章不等同于可信竞技排名。</p></div></div><div class="setting-row"><div>最近一次扫描<p>${state.lastScan?`${new Date(state.lastScan.at).toLocaleString('zh-CN')} · ${state.lastScan.files} 个变化文件 · ${state.lastScan.events} 个标准事件 · ${state.lastScan.forksSkipped} 个分叉文件跳过`:'还没有读取你的 Codex 日志。首次扫描或开启采集时才开始读取。'}</p></div></div></section>`;}
function community(){return `<div class="page-heading"><h1>下一个彩蛋，由你定义。</h1><p>TokenGo 是一座开放的成就工坊。贡献有趣的成就，或创造自己的扩展。</p></div><div class="community-grid"><article class="community-card"><span class="symbol">✧</span><h3>贡献一枚成就</h3><p>一个有趣的名字，一条可验证的规则。JSON 成就包无需修改引擎，也不执行任意代码。</p></article><article class="community-card"><span class="symbol">◇</span><h3>创造全新外观</h3><p>为徽章、分享卡和成就展柜设计新的主题。让不同的冒险，有不同的模样。</p></article><article class="community-card"><span class="symbol">⌘</span><h3>探索更多可能</h3><p>为其他 Agent 编写本地适配器，或开发明确征求用户选择的可选联网扩展。</p></article></div><section class="settings-panel" style="margin-top:24px"><div class="section-header"><h2>一个成就，从这些开始</h2><button class="button secondary" data-action="install">在 GitHub 上参与 ↗</button></div><pre class="code-sample">${esc(JSON.stringify({id:'community.still-working',name:'它还在努力',description:'你去吃了顿饭，它还没下班。',category:'hidden',rarity:'legendary',hidden:true,icon:'hourglass',conditions:[{metric:'run.max_minutes',gte:120}]},null,2))}</pre><p class="muted" style="font-size:12px;line-height:1.8">MIT 开源 · 可审查的规则 · 可持续扩展<br>分享链接指向开源仓库。没有个人追踪码，也不需要部署付费服务器。</p></section>`;}
function render(){updateChrome();$('#content').innerHTML=({collection,hidden,cabinet,activity,settings,community}[view])();if(['collection','hidden'].includes(view))renderResults();}
function go(next){view=next;page=1;category='all';query='';tab='all';rarity='all';render();window.scrollTo({top:0,behavior:'instant'});}
function showDetail(id){
 selected=state.achievements.find(a=>a.id===id);if(!selected)return;const a=selected;
 $('#detail-body').innerHTML=`<div class="detail-badge">${badge(a.icon,a.rarity,a.hidden&&a.locked)}</div><span class="rarity-tag" style="justify-content:center;--rarity:${palette[a.rarity][0]}">${rarityNames[a.rarity]}${a.hidden?' · 隐藏成就':''}</span><h2 class="detail-title">${esc(a.name)}</h2><p class="detail-desc">${esc(a.description)}</p><div class="detail-conditions">${a.hidden&&a.locked?'这份秘密还没有被发现。保持好奇，正常工作就好。':`<strong>${a.locked?'解锁条件':'达成依据'}</strong><br>${a.conditions.map(c=>`${esc(c.metric)}：${fmt(c.current)} / ${fmt(c.gte)}`).join('<br>')}${a.award?`<br><br>${sourceNames[a.award.source]||'本地记录'} · ${new Date(a.award.at).toLocaleString('zh-CN')}`:''}`}</div>${!a.locked?`<div class="detail-actions"><button class="button secondary" data-action="pin">${pins().includes(a.id)?'从展柜移除':'✦ 加入展柜'}</button><button class="button" data-action="share">分享这一刻 ↗</button></div>`:''}<p class="detail-footnote">${state.demo?'演示数据 · 不代表真实成就':'本地记录 · 非官方认证'}<br>解锁依据存于本机，不上传。</p>`;
 if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function togglePin(id){let ids=pins();if(ids.includes(id))ids=ids.filter(x=>x!==id);else{if(ids.length>=6){notify('展柜最多展示 6 枚，请先移除一枚。');return;}ids.push(id);}localStorage.setItem(pinsKey(),JSON.stringify(ids));render();if($('#detail-dialog').open)showDetail(id);notify(ids.includes(id)?'已加入你的展柜':'已从展柜移除');}
async function drawShare(awards){
 const canvas=$('#share-canvas'),ctx=canvas.getContext('2d');
 ctx.fillStyle='#132033';ctx.fillRect(0,0,1200,675);
 const grad=ctx.createRadialGradient(900,230,10,900,230,620);grad.addColorStop(0,'#36445b');grad.addColorStop(1,'#142033');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,675);
 ctx.strokeStyle='#7d8da233';ctx.lineWidth=1;for(const radius of [180,245,310]){ctx.beginPath();ctx.arc(930,270,radius,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle='#e8cc92';ctx.font='bold 30px -apple-system, sans-serif';ctx.fillText('✦ TokenGo',60,65);
 ctx.fillStyle='#9fb0c7';ctx.font='18px -apple-system, sans-serif';ctx.fillText(state.demo?'演示成就 · 示例数据':'本地成就 · 非官方认证',60,100);
 const drawBadge=async(a,x,y,w)=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(badge(a.icon,a.rarity));await img.decode();ctx.drawImage(img,x,y,w,w*156/140);};
 if(awards.length===1){
  const a=awards[0];await drawBadge(a,815,145,250);
  ctx.fillStyle=palette[a.rarity][0];ctx.font='20px -apple-system, sans-serif';ctx.fillText(`${a.hidden?'隐藏成就已解锁':'成就已解锁'}  /  ${rarityNames[a.rarity]}`,60,218);
  ctx.fillStyle='#f0f3f8';ctx.font='bold 54px -apple-system, sans-serif';ctx.fillText(a.name,56,302,720);
  ctx.fillStyle='#b0bed2';ctx.font='24px -apple-system, sans-serif';wrapText(ctx,a.description,60,364,680,38);
  ctx.fillStyle='#8da1bb';ctx.font='18px -apple-system, sans-serif';ctx.fillText(`${sourceNames[a.award.source]||'本地记录'} · ${new Date(a.award.at).toLocaleDateString('zh-CN')}`,60,470);
 }else{
  ctx.fillStyle='#f0f3f8';ctx.font='bold 34px -apple-system, sans-serif';ctx.fillText('这就是，我的冒险。',60,162);
  const width=1080/awards.length;
  for(let i=0;i<awards.length;i++){const a=awards[i],x=60+i*width;await drawBadge(a,x+(width-115)/2,225,115);ctx.fillStyle=palette[a.rarity][0];ctx.font='16px -apple-system, sans-serif';ctx.textAlign='center';ctx.fillText(a.name,x+width/2,392,width-12);ctx.fillStyle='#94a7c1';ctx.font='14px -apple-system, sans-serif';ctx.fillText(rarityNames[a.rarity],x+width/2,425);ctx.textAlign='left';}
 }
 ctx.strokeStyle='#506078';ctx.beginPath();ctx.moveTo(60,540);ctx.lineTo(1140,540);ctx.stroke();
 ctx.fillStyle='#d1dfed';ctx.font='20px -apple-system, sans-serif';ctx.fillText('你的 Codex，还藏着多少惊喜？',60,588);
 ctx.fillStyle='#a3b4cb';ctx.font='17px -apple-system, sans-serif';ctx.fillText('github.com/DragonYJ/TokenGo',60,623);
 ctx.fillStyle='#dec48f';ctx.textAlign='right';ctx.fillText('离线收集  ·  开源免费',1140,608);ctx.textAlign='left';
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const ch of text){if(ctx.measureText(line+ch).width>maxWidth){ctx.fillText(line,x,y);line=ch;y+=lineHeight;}else line+=ch;}ctx.fillText(line,x,y);}
async function showShare(awards){
 sharing=awards.filter(a=>a&&!a.locked);if(!sharing.length)return;
 $('#detail-dialog').close();$('#share-dialog').showModal();
 await drawShare(sharing);
 const names=sharing.map(a=>`「${a.name}」`).join('、');
 $('#share-text').value=`${state.demo?'[演示] ':''}我在 TokenGo ${sharing.length>1?'收集了':'解锁了'}${names}！\n${sharing.length===1?sharing[0].description:'这就是我的 Codex 成就展柜。'}\n离线收集，开源免费。看看你的 Codex 藏着哪些惊喜：\n${repo}`;
}
function webToast(){
 const a=state.achievements.find(a=>a.id==='secrets.still-working'&&!a.locked)||{id:'demo',name:'它还在努力',description:'Agent 连续活跃 120 分钟',rarity:'legendary',icon:'hourglass'};
 $('#web-toast').innerHTML=`<div class="toast-card"><button class="toast-dismiss" aria-label="关闭弹卡">×</button><div class="toast-badge">${badge(a.icon,a.rarity)}</div><div class="toast-copy"><div class="toast-eyebrow">✦ 隐藏成就已解锁 <span class="toast-demo">演示</span></div><h3>${esc(a.name)}</h3><p>你去吃了顿饭，它还没下班。</p><button class="toast-share">查看这一刻 ↗</button></div><div class="native-toast-progress"></div></div>`;
 const hide=()=>{$('#web-toast').innerHTML='';};let t=setTimeout(hide,6500);$('#web-toast').onmouseenter=()=>clearTimeout(t);$('#web-toast').onmouseleave=()=>{t=setTimeout(hide,6500);};$('.toast-dismiss').onclick=hide;$('.toast-share').onclick=()=>{hide();if(a.id!=='demo')showDetail(a.id);};
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('button');if(!target)return;
 if(target.hasAttribute('data-close')){target.closest('dialog').close();return;}
 if(target.dataset.view){go(target.dataset.view);return;}
 if(target.dataset.achievement){showDetail(target.dataset.achievement);return;}
 if(target.dataset.tab){tab=target.dataset.tab;page=1;render();return;}
 if(target.dataset.category){category=target.dataset.category;page=1;render();return;}
 if(target.dataset.page){page=Number(target.dataset.page);renderResults();return;}
 if(target.dataset.unpin){togglePin(target.dataset.unpin);return;}
 const action=target.dataset.action;
 if(['activity','cabinet'].includes(action)){go(action);return;}
 if(action==='clear'){query='';category='all';tab='all';rarity='all';render();return;}
 if(action==='install'){invoke('open-repo');return;}
 if(action==='preview'){invoke('demo-toast');return;}
 if(action==='pin'){togglePin(selected.id);return;}
 if(action==='share'){await showShare([selected]);return;}
 if(action==='share-cabinet'){await showShare(pins().map(id=>state.achievements.find(a=>a.id===id)));return;}
 if(action==='export'){if(await invoke('export'))notify('成就记录已导出');return;}
 if(['watch','scan'].includes(action)&&!busy){busy=true;target.disabled=true;const old=target.textContent;target.textContent='正在本地扫描…';try{const result=await invoke(action,action==='watch'?true:undefined);if(result){state=result;render();notify(action==='watch'?'后台采集已开启。所有记录保存在本机。':'历史扫描完成，查看你的新成就。');}}finally{busy=false;target.disabled=false;target.textContent=old;}}
});
document.addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;page=1;renderResults();}});
document.addEventListener('change',async event=>{
 if(event.target.id==='rarity'){rarity=event.target.value;page=1;renderResults();}
 const actions={'watch-toggle':'watch','quiet-toggle':'quiet','startup-toggle':'startup'};
 if(actions[event.target.id]){const result=await invoke(actions[event.target.id],event.target.checked);if(result){state=result;render();}else event.target.checked=!event.target.checked;}
});
$('#preview-toast').onclick=()=>invoke('demo-toast');
$('#copy-image').onclick=async()=>{if(await invoke('copy-image',$('#share-canvas').toDataURL('image/png')))notify('图片已复制，可在平台编辑器粘贴');};
$('#save-image').onclick=async()=>{if(await invoke('save-image',$('#share-canvas').toDataURL('image/png')))notify('图片已保存');};
$('#copy-text').onclick=async()=>{if(await invoke('copy-text',$('#share-text').value))notify('分享文案已复制');};
for(const platform of ['x','reddit'])$(`#share-${platform}`).onclick=()=>invoke('share',{platform,text:$('#share-text').value,title:`${state.demo?'[Demo] ':''}My TokenGo achievement: ${sharing.map(a=>a.name).join(', ')}`});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
try{
 state=desktop?await window.tokenGo.invoke('snapshot'):(await import('./demo-data.js')).default;
 if(state.demo&&!localStorage.getItem(pinsKey()))localStorage.setItem(pinsKey(),JSON.stringify(['secrets.still-working','secrets.returning','secrets.million']));
 render();
 if(desktop)window.tokenGo.onUpdate(next=>{state=next;render();if(next.error)notify(next.error);if(next.openAchievement){const a=state.achievements.find(a=>a.id===next.openAchievement);if(a&&!a.locked){if(next.shareAchievement)showShare([a]);else showDetail(a.id);}else notify('这是弹卡演示，不会写入真实成就。');}});
}catch(error){$('#content').innerHTML=`<div class="empty"><h3>暂时无法打开成就记录</h3><p>${esc(error.message)}</p><p>请用 npm start 启动桌面版，或先运行 npm run site 生成演示网站。</p></div>`;}
