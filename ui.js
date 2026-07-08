// ================= YUME MALL UI =================
'use strict';

const UI = {
  el(id){ return document.getElementById(id); },
  activeTab:null, _hudCache:'', _joyEl:null, _prevSpeed:1,

  init(){
    this.el('btnNew').onclick = ()=>{ if(SIM.hasSave() && !confirm('セーブデータを消して最初から始めますか?')) return; SIM.newGame(); this.startGame(); };
    const bc=this.el('btnContinue');
    if (SIM.hasSave()) bc.style.display='';
    bc.onclick = ()=>{ if(SIM.load()) this.startGame(); };
    this.el('btnHelp').onclick = ()=>this.el('helpModal').style.display='flex';
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=e=>{ e.target.closest('.modal-wrap').style.display='none'; if(e.target.dataset.close==='resume') SIM.st.speed=this._prevSpeed||1; });
  },

  startGame(){
    this.el('title').style.display='none';
    this.el('hud').style.display='';
    M3D.init(this.el('game'));
    // 速度ボタン
    document.querySelectorAll('#speedBtns button').forEach(b=>{
      b.onclick=()=>{ SIM.st.speed=+b.dataset.s; this.syncSpeedBtns(); };
    });
    this.syncSpeedBtns();
    // フロアボタン
    document.querySelectorAll('#floorBtns button').forEach(b=>{
      b.onclick=()=>{ M3D.setFloorView(+b.dataset.f); document.querySelectorAll('#floorBtns button').forEach(x=>x.classList.toggle('on', x===b)); };
    });
    // タブ
    document.querySelectorAll('#tabs button').forEach(b=>{
      b.onclick=()=>this.switchTab(b.dataset.tab);
    });
    this.el('btnWalk').onclick=()=>this.toggleWalk();
    this.switchTab('mall');
  },

  syncSpeedBtns(){
    document.querySelectorAll('#speedBtns button').forEach(b=>b.classList.toggle('on', +b.dataset.s===SIM.st.speed));
  },

  toggleWalk(){
    if (M3D.mode==='orbit'){
      M3D.enterWalk();
      document.body.classList.add('walk');
      this.closePanel();
      this.el('btnWalk').textContent='📊 経営モードへ';
    } else {
      M3D.exitWalk();
      document.body.classList.remove('walk');
      this.setNearLabel(null);
      this.el('btnWalk').textContent='🚶 歩く';
    }
  },

  switchTab(tab){
    if (this.activeTab===tab && tab!=='mall'){ this.switchTab('mall'); return; }
    this.activeTab=tab;
    document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
    const p=this.el('panel');
    if (tab==='mall'){ p.style.display='none'; return; }
    p.style.display='';
    if (tab==='tenants') this.renderTenants();
    else if (tab==='mgmt') this.renderMgmt();
    else if (tab==='news') this.renderNews();
    else if (tab==='settings') this.renderSettings();
  },
  closePanel(){ this.activeTab='mall'; this.el('panel').style.display='none'; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab==='mall')); },

  // ---------- HUD ----------
  tickHUD(){
    const st=SIM.st; if(!st) return;
    const h=Math.floor(st.minutes/60), m=Math.floor(st.minutes%60);
    const key = [st.D,h,Math.floor(m/10),Math.round(st.cash),st.todayVisitors].join('|');
    if (key===this._hudCache) return;
    this._hudCache=key;
    const w=WEATHERS[st.weather];
    this.el('hudDate').textContent = `${st.Y}年${st.M}月${st.D}日(${DOW_LABEL[st.dow]}) ${String(h).padStart(2,'0')}:${String(Math.floor(m/10)*10).padStart(2,'0')} ${w.icon}`;
    this.el('hudCash').textContent = fmtM(st.cash);
    this.el('hudCash').className = st.cash<0?'neg':'';
    this.el('hudVis').textContent = fmtNum(st.todayVisitors)+'人';
    this.el('hudOcc').textContent = Math.round(SIM.occupancy()*100)+'%';
    this.el('hudRep').textContent = '★'+st.rep.toFixed(1);
    const evEl=this.el('hudEvent');
    if (st.event){ evEl.style.display=''; evEl.textContent='🎪 '+st.event.name+' あと'+st.event.daysLeft+'日'; }
    else if (st.D===20||st.D===30){ evEl.style.display=''; evEl.textContent='💳 ユメ感謝デー開催中!'; }
    else evEl.style.display='none';
    if (st.gameOver) this.el('goModal').style.display='flex';
  },

  onDaySettled(res){
    const st=SIM.st;
    this.toast(`📊 ${st.M}/${st.D===1?'末':st.D-1} 来館 ${fmtNum(res.visitors)}人で営業終了`);
    M3D.setEventVisual(st.event? st.event.name : null);
    if (this.activeTab==='tenants') this.renderTenants();
  },

  onMonthReport(rep){
    this._prevSpeed = SIM.st.speed||1;
    SIM.st.speed=0; this.syncSpeedBtns();
    SIM.save();
    const b=this.el('monthBody');
    const line=(l,v,cls)=>`<div class="row"><span>${l}</span><b class="${cls||''}">${v}</b></div>`;
    b.innerHTML =
      `<h3>${rep.Y}年${rep.M}月 決算</h3>`+
      line('専門店 賃料収入', '+'+fmtM(rep.rent), 'pos')+
      line('共益費収入', '+'+fmtM(rep.fee), 'pos')+
      line('直営店 営業利益', (rep.ownProfit>=0?'+':'')+fmtM(rep.ownProfit), rep.ownProfit>=0?'pos':'neg')+
      line('共用部管理費', '-'+fmtM(rep.common), 'neg')+
      (rep.promo? line('販促費', '-'+fmtM(rep.promo), 'neg'):'')+
      (rep.events? line('催事費', '-'+fmtM(rep.events), 'neg'):'')+
      line('支払利息', '-'+fmtM(rep.interest), 'neg')+
      line('借入元本返済', '-'+fmtM(rep.principal), 'neg')+
      `<div class="row total"><span>月次収支</span><b class="${rep.net>=0?'pos':'neg'}">${rep.net>=0?'+':''}${fmtM(rep.net)}</b></div>`+
      line('月間来館者', fmtNum(rep.visitors)+'人')+
      line('専門店売上(館全体)', fmtM(rep.tenantSales+rep.ownSales))+
      line('稼働率', Math.round(rep.occ*100)+'%')+
      line('モール評判', '★'+rep.repStars.toFixed(1))+
      (rep.leaves.length? `<div class="warn">💔 退店: ${rep.leaves.join('、')}</div>`:'')+
      (rep.warns.length? `<div class="warn">⚠️ 退店リスク: ${rep.warns.join('、')}(賃料負担が重い)</div>`:'');
    this.el('monthModal').style.display='flex';
  },

  // ---------- 区画モーダル ----------
  openUnit(uid){
    const u=SIM.st.units.find(x=>x.id===uid);
    if (!u || u.kind==='ent') return;
    this._unit=u;
    const b=this.el('unitBody');
    const sizeName = u.tier==='XL' ? (u.kind==='cinema'?'シネマ区画(核)':'核店舗') : SIZES[u.tier].label;
    let html = `<h3>${u.floor}F ${u.id} <small>${sizeName}</small></h3>`;
    if (u.state==='open' && u.ten){
      const t=u.ten;
      const cat=CATS[t.cat];
      html += `<div class="tcard on">
        <div class="tname"><span class="chip" style="background:${cat.color}">${cat.label}</span> ${t.name} ${t.own?'<span class="ownchip">直営</span>':''}</div>
        <div class="trow">今月売上: <b>${fmtM(u.monthSales)}</b> / 前月: ${fmtM(u.lastMonthSales)}</div>`;
      if (t.own){
        html += `<div class="trow">粗利率 ${(t.gross*100).toFixed(0)}% / 人件費 ${fmtM(t.staff)}/月</div>
        <div class="trow">※直営店は来館者が増えるほど儲かります</div>`;
      } else {
        html += `<div class="trow">契約: 最低保証 ${fmtM(t.minRent)}/月 + 売上歩合 ${(t.rate*100).toFixed(0)}%</div>
        <div class="trow">前月賃料: <b>${fmtM(u.lastRent||t.minRent)}</b> / 満足度 ${this.satFace(u.sat)} ${u.sat}</div>`;
        if (u.monthsBad>=2) html += `<div class="warn">⚠️ 売上不振が続いています。退店リスク大!</div>`;
      }
      html += `</div><button class="btn danger" id="btnEvict">${t.own?'閉店する(撤去費500万円)':'退店してもらう(補償3ヶ月分)'}</button>`;
    } else if (u.state==='fitting'){
      html += `<div class="tcard"><div class="tname">🏗️ ${u.ten.name}</div><div class="trow">内装工事中... あと${u.fitDays}日でオープン</div></div>`;
    } else {
      // 空床: 誘致 or 直営
      html += `<div class="seg"><button class="on" data-seg="lease">テナント誘致</button><button data-seg="own">直営出店</button></div><div id="unitSeg"></div>`;
    }
    b.innerHTML=html;
    if (u.state==='vacant'){
      b.querySelectorAll('.seg button').forEach(sb=>{
        sb.onclick=()=>{ b.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===sb)); this.renderUnitSeg(sb.dataset.seg); };
      });
      this.renderUnitSeg('lease');
    }
    const ev=this.el('btnEvict');
    if (ev) ev.onclick=()=>{
      const r=SIM.evict(u);
      if (r==='cash') this.toast('資金が足りません');
      else { this.openUnit(uid); }
    };
    this.el('unitModal').style.display='flex';
  },

  renderUnitSeg(seg){
    const u=this._unit;
    const c=this.el('unitSeg');
    if (seg==='lease'){
      const cands=SIM.candidatesFor(u);
      if (!cands.length){ c.innerHTML='<div class="empty">今月の出店候補はありません(毎月更新されます)</div>'; return; }
      c.innerHTML = cands.map((t,i)=>{
        if (t.cinema){
          return `<div class="tcard"><div class="tname">${t.name} ${t.own?'<span class="ownchip">直営</span>':''}</div>
            <div class="trow">${t.desc}</div>
            <div class="trow">${t.own? '投資額 '+fmtM(t.fit)+' / 粗利'+(t.gross*100).toFixed(0)+'% / 人件費'+fmtM(t.staff)+'/月' : '最低保証 '+fmtM(t.minRent)+'/月 + 歩合'+(t.rate*100).toFixed(0)+'%'}</div>
            <div class="trow">集客力 ${'★'.repeat(Math.min(5,Math.ceil(t.attract/2)))}</div>
            <button class="btn" data-sign="${i}">${t.own?'直営で出店する':'誘致する'}</button></div>`;
        }
        const cat=CATS[t.cat];
        return `<div class="tcard ${t.locked?'locked':''}">
          <div class="tname"><span class="chip" style="background:${cat.color}">${cat.label}</span> ${t.name}</div>
          <div class="trow">${t.desc}</div>
          <div class="trow">最低保証 <b>${fmtM(t.minRent)}</b>/月 + 売上歩合 ${(t.rate*100).toFixed(0)}% / 集客力 ${'★'.repeat(Math.min(5,Math.ceil(t.attract/2)))}</div>
          ${t.locked? '<div class="warn">🔒 モール評判★2.8以上で誘致可能(人気テナントは選り好みします)</div>' : `<button class="btn" data-sign="${i}">誘致する(内装${ECON.FIT_DAYS}日)</button>`}
        </div>`;
      }).join('');
      c.querySelectorAll('[data-sign]').forEach(btn=>{
        btn.onclick=()=>{
          const t=cands[+btn.dataset.sign];
          const r=SIM.signLease(u,t);
          if (r==='cash') this.toast('資金が足りません');
          else if (r===true){ this.toast('📝 契約成立!'); this.openUnit(u.id); }
        };
      });
    } else {
      const fmts=SIM.ownFormatsFor(u);
      if (!fmts.length){ c.innerHTML='<div class="empty">この区画サイズに合う直営業態がありません</div>'; return; }
      c.innerHTML = fmts.map((f,i)=>{
        const cat=CATS[f.cat];
        return `<div class="tcard">
          <div class="tname"><span class="chip" style="background:${cat.color}">${cat.label}</span> ${f.name} <span class="ownchip">直営</span></div>
          <div class="trow">${f.desc}</div>
          <div class="trow">初期投資 <b>${fmtM(f.fit)}</b> / 粗利率 ${(f.gross*100).toFixed(0)}% / 人件費 ${fmtM(f.staff)}/月</div>
          <div class="trow">※賃料は入らないが、繁盛すれば賃料以上に稼げる。閑古鳥なら大赤字。</div>
          <button class="btn" data-own="${i}">出店する</button></div>`;
      }).join('');
      c.querySelectorAll('[data-own]').forEach(btn=>{
        btn.onclick=()=>{
          const f=fmts[+btn.dataset.own];
          const r=SIM.openOwn(u,f);
          if (r==='cash') this.toast('資金が足りません('+fmtM(f.fit)+'必要)');
          else if (r===true){ this.toast('🔨 直営出店を開始しました'); this.openUnit(u.id); }
        };
      });
    }
  },

  satFace(s){ return s>=75?'😊':(s>=55?'🙂':(s>=40?'😐':'😠')); },

  // ---------- テナント一覧 ----------
  renderTenants(){
    const st=SIM.st;
    let html='<h3>テナント一覧</h3>';
    for (let f=3; f>=1; f--){
      const list=st.units.filter(u=>u.floor===f && u.kind!=='ent');
      const open=list.filter(u=>u.state==='open').length;
      html+=`<div class="fhead">${f}F <small>${open}/${list.length}区画 稼働</small></div>`;
      html+=list.map(u=>{
        if (u.state==='open'&&u.ten){
          const cat=CATS[u.ten.cat];
          return `<div class="trow-item" data-u="${u.id}"><span class="chip" style="background:${cat.color}">${cat.label}</span>
            <span class="nm">${u.ten.name}${u.ten.own?' <span class="ownchip">直営</span>':''}</span>
            <span class="val">${fmtM(u.monthSales)}</span>${u.ten.own?'':' '+this.satFace(u.sat)}${u.monthsBad>=2?'⚠️':''}</div>`;
        }
        if (u.state==='fitting') return `<div class="trow-item" data-u="${u.id}"><span class="chip" style="background:#888">工事</span><span class="nm">🏗️ ${u.ten.name} あと${u.fitDays}日</span></div>`;
        return `<div class="trow-item vac" data-u="${u.id}"><span class="chip" style="background:#aaa">空床</span><span class="nm">${u.id} ${u.tier==='XL'?'核区画':SIZES[u.tier].label}</span><span class="val">募集する →</span></div>`;
      }).join('');
    }
    this.el('panelBody').innerHTML=html;
    document.querySelectorAll('[data-u]').forEach(r=>r.onclick=()=>this.openUnit(r.dataset.u));
  },

  // ---------- 経営 ----------
  renderMgmt(){
    const st=SIM.st;
    const lr=st.lastReport;
    const kpi=(l,v,cls)=>`<div class="kpi"><small>${l}</small><b class="${cls||''}">${v}</b></div>`;
    let html='<h3>経営ダッシュボード</h3><div class="kpis">'+
      kpi('現金', fmtM(st.cash), st.cash<0?'neg':'')+
      kpi('借入残高', fmtM(st.loan))+
      kpi('前月収支', lr? (lr.net>=0?'+':'')+fmtM(lr.net) : '—', lr&&lr.net<0?'neg':'pos')+
      kpi('稼働率', Math.round(SIM.occupancy()*100)+'%')+
      kpi('本日来館(予測)', fmtNum(st.todayVisitors)+'人')+
      kpi('モール評判', '★'+st.rep.toFixed(1))+
      '</div>';
    // 販促
    html+='<div class="fhead">販促(毎月の広告宣伝)</div><div class="promo">'+
      ECON.PROMO_LEVELS.map((p,i)=>`<button class="pbtn ${st.promoLv===i?'on':''}" data-p="${i}">${p.label}<small>${p.c?fmtM(p.c)+'/月 来館+'+Math.round((p.m-1)*100)+'%':'0円'}</small></button>`).join('')+'</div>';
    // 催事
    html+='<div class="fhead">催事イベント(セントラルコート)</div>';
    if (st.event) html+=`<div class="empty">🎪 「${st.event.name}」開催中(あと${st.event.daysLeft}日)</div>`;
    else html+='<div class="events">'+EVENTS.map((e,i)=>`<div class="tcard"><div class="tname">${e.name}</div><div class="trow">${e.desc}</div><div class="trow">費用 <b>${fmtM(e.cost)}</b></div><button class="btn" data-ev="${i}">開催する</button></div>`).join('')+'</div>';
    // 月次履歴
    if (st.history.length){
      const max=Math.max(...st.history.map(h=>Math.abs(h.net)),1);
      html+='<div class="fhead">月次収支の推移</div><div class="chart">'+
        st.history.slice(-12).map(h=>`<div class="bar"><i style="height:${Math.round(Math.abs(h.net)/max*54)+3}px" class="${h.net>=0?'':'neg'}"></i><small>${h.M}月</small></div>`).join('')+'</div>';
    }
    this.el('panelBody').innerHTML=html;
    document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ SIM.setPromo(+b.dataset.p); this.renderMgmt(); });
    document.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{
      const r=SIM.bookEvent(EVENTS[+b.dataset.ev]);
      if (r==='cash') this.toast('資金が足りません');
      else if (r==='busy') this.toast('すでに催事を開催中です');
      else { this.toast('🎪 催事を開始しました!'); M3D.setEventVisual(SIM.st.event.name); this.renderMgmt(); }
    });
  },

  renderNews(){
    const st=SIM.st;
    this.el('panelBody').innerHTML='<h3>モールニュース</h3>'+
      (st.news.length? st.news.map(n=>`<div class="news"><small>${n.d}</small> ${n.text}</div>`).join('') : '<div class="empty">まだニュースはありません</div>');
  },

  renderSettings(){
    this.el('panelBody').innerHTML=`<h3>設定</h3>
      <button class="btn" id="sSave">セーブする</button>
      <button class="btn" id="sHelp">遊び方を見る</button>
      <button class="btn danger" id="sReset">データを消して最初から</button>
      <div class="empty" style="margin-top:12px">ユメモール 〜理想のショッピングモール経営記〜<br>セーブは月次決算ごとに自動でも行われます</div>`;
    this.el('sSave').onclick=()=>{ SIM.save(); this.toast('💾 セーブしました'); };
    this.el('sHelp').onclick=()=>this.el('helpModal').style.display='flex';
    this.el('sReset').onclick=()=>{ if(confirm('本当に最初からやり直しますか?')){ localStorage.removeItem(SAVE_KEY); location.reload(); } };
  },

  // ---------- 歩行UI ----------
  setNearLabel(u){
    const el=this.el('nearLabel');
    if (!u){ el.style.display='none'; return; }
    const cat=CATS[u.ten.cat];
    el.style.display='';
    el.innerHTML=`<span class="chip" style="background:${cat.color}">${cat.label}</span> <b>${u.ten.name}</b>${u.ten.own?' <span class="ownchip">直営</span>':''} <small>本日売上 ${fmtM(u.todaySales)}</small>`;
  },
  showJoy(x,y){
    let j=this._joyEl;
    if (!j){ j=document.createElement('div'); j.id='joy'; j.innerHTML='<div id="joyKnob"></div>'; document.body.appendChild(j); this._joyEl=j; }
    j.style.display=''; j.style.left=(x-50)+'px'; j.style.top=(y-50)+'px';
  },
  moveJoy(dx,dy){
    const k=document.getElementById('joyKnob');
    if (k) k.style.transform=`translate(${dx*30}px,${dy*30}px)`;
  },
  hideJoy(){ if(this._joyEl) this._joyEl.style.display='none'; },

  toast(msg){
    const c=this.el('toasts');
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    c.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 400); }, 3400);
    while (c.children.length>4) c.firstChild.remove();
  },
};

window.addEventListener('DOMContentLoaded', ()=>UI.init());
