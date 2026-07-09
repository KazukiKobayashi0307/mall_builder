// ================= YUME MALL simulation engine =================
'use strict';

function mulberry32(a){ return function(){ a|=0; a=(a+0x6D2B79F5)|0; var t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function hashStr(s){ let h=1779033703; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19);} return h>>>0; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

function fmtM(v){
  const neg = v<0; const a = Math.abs(v);
  let s;
  if (a>=10000) s = (a/10000).toFixed(a>=100000?0:1)+'億円';
  else s = Math.round(a).toLocaleString()+'万円';
  return (neg?'-':'')+s;
}
function fmtNum(v){ return Math.round(v).toLocaleString(); }

const DOW_LABEL = ['日','月','火','水','木','金','土'];
const HOUR_CURVE = [0,0,0,0,0,0,0,0,0, .35,.6,.85,1.0,.95,.8,.72,.8,.92,.88,.7,.5,.3,0,0];

const SIM = {
  st: null,
  _catNorm: null,

  // ---------- 区画生成 ----------
  buildUnits(rng){
    const seq = [12,8,8,20,8,12,8,20,8,8,12,8,20,12,8,12];
    const units = [];
    for (let f=1; f<=3; f++){
      for (const side of ['N','S']){
        let x = -92, idx = 0;
        for (const w of seq){
          idx++;
          const tier = w===8?'S':(w===12?'M':'L');
          let kind = 'shop';
          if (f===3 && side==='N' && x>=40) kind = 'fc';
          if (f===1 && x===4 && w===8) kind = 'ent'; // 北口・南口(入口通路)
          units.push({ id: f+side+String(idx).padStart(2,'0'), floor:f, side, x0:x, x1:x+w, w, tier, kind,
                       ten:null, state:'vacant', fitDays:0, monthsBad:0, monthSales:0, todaySales:0, lastMonthSales:0, lastRent:0, sat:70, openedDay:0 });
          x += w;
        }
      }
    }
    units.push({ id:'GMS1', floor:1, side:'W', x0:-130, x1:-96, w:34, tier:'XL', kind:'gms', ten:null, state:'open', fitDays:0, monthsBad:0, monthSales:0, todaySales:0, lastMonthSales:0, lastRent:0, sat:80, openedDay:0 });
    units.push({ id:'GMS2', floor:2, side:'W', x0:-130, x1:-96, w:34, tier:'XL', kind:'gms', ten:null, state:'open', fitDays:0, monthsBad:0, monthSales:0, todaySales:0, lastMonthSales:0, lastRent:0, sat:80, openedDay:0 });
    units.push({ id:'CINE', floor:3, side:'W', x0:-130, x1:-96, w:34, tier:'XL', kind:'cinema', ten:null, state:'vacant', fitDays:0, monthsBad:0, monthSales:0, todaySales:0, lastMonthSales:0, lastRent:0, sat:70, openedDay:0 });
    return units;
  },

  newGame(siteId){
    const site = SITES.find(s=>s.id===siteId) || SITES[0];
    const rng = mulberry32((Date.now()&0xffffffff)>>>0);
    const units = this.buildUnits(rng);
    // GMS直営を配備
    for (const g of GMS_FLOORS){
      const u = units.find(u=>u.kind==='gms' && u.floor===g.floor);
      u.ten = { own:true, fid:'gms'+g.floor, name:g.name, cat:g.cat, attract:g.attract, gross:g.gross, staff:g.staff, misc:g.misc, pull:3.0 };
    }
    // 開業時テナント: 専門店枠の約半分を事前リーシング
    const pool = TENANTS.slice();
    for (let i=pool.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const shopUnits = units.filter(u=>u.kind==='shop'||u.kind==='fc');
    let placed = 0, target = 42;
    for (const t of pool){
      if (placed>=target) break;
      const cands = shopUnits.filter(u=>!u.ten && this.unitFits(u,t));
      if (!cands.length) continue;
      const u = cands[Math.floor(rng()*cands.length)];
      const minRent = Math.round(t.minRent*ECON.RENT_CAL*(0.95+rng()*0.1));
      u.ten = { own:false, tid:t.id, name:t.name, cat:t.cat, attract:t.attract, rate:t.rate, minRent, pull:t.pull, demo:t.demo||null, facade:t.facade||'plain', keyMoney: minRent*ECON.KEY_MONEY_MONTHS };
      u.state = 'open';
      placed++;
    }
    this._catNorm = this.computeCatNorm();
    this.st = {
      v:2, started:true, day:1, dow:6, Y:2026, M:4, D:18,
      minutes: 540, speed: 1, cash: site.cashStart, loan: site.loanStart,
      site, expansionBought:false,
      rep: 2.6, promoLv: 0, weather: 0, event: null,
      units, news: [], todayVisitors: 0, visitorsSoFar: 0,
      acc: this.blankAcc(), lastReport: null, history: [],
      totalDays: 0, gameOver: false,
    };
    this.st.todayVisitors = this.calcVisitors();
    this.pushNews('🎉 '+MALL_NAME+'('+site.name+') グランドオープン!! 3日間はオープン景気で来館者が大幅増加');
    this.pushNews('核店舗「ユメスタイル」(直営)と専門店'+placed+'店で開業。空き区画にテナントを誘致しよう');
    return this.st;
  },

  unitFits(u, t){
    if (u.kind==='ent') return false;
    const tw = SIZES[t.size].w;
    if (u.w !== tw) return false;
    if (u.kind==='fc') return t.cat==='foodcourt';
    if (t.cat==='foodcourt') return false;
    if (t.cat==='gourmet' && u.floor!==3) return false;
    return true;
  },

  blankAcc(){ return { rent:0, fee:0, ownProfit:0, ownSales:0, tenantSales:0, promo:0, events:0, common:0, interest:0, principal:0, visitors:0, days:0 }; },

  pushNews(text){
    const st=this.st; st.news.unshift({ d:`${st.M}/${st.D}`, text });
    if (st.news.length>60) st.news.pop();
  },

  // ---------- 来館者数 ----------
  attractTotal(){
    let A = 0, vac = 0;
    for (const u of this.st.units){
      if (u.state==='open' && u.ten) A += u.ten.attract;
      else if (u.kind!=='cinema' && u.kind!=='ent') vac++;
    }
    A -= vac * ECON.VACANCY_PENALTY;
    if (this.st.expansionBought) A += ECON.EXPANSION_ATTRACT_BONUS;
    return { A: Math.max(A, 4), vac };
  },

  calcVisitors(){
    const st = this.st;
    const site = st.site;
    const { A } = this.attractTotal();
    let v = ECON.BASE_VISITORS + ECON.ATTRACT_COEF * Math.pow(A, ECON.ATTRACT_POW);
    const dowMul = st.dow===6 ? ECON.SAT_MUL : (st.dow===0 ? ECON.SUN_MUL : 1.0);
    v *= dowMul;
    v *= MONTH_MUL[st.M-1];
    v *= WEATHERS[st.weather].mul;
    if (st.D===20 || st.D===30) v *= ECON.KANSHA_MUL;
    if (st.day<=3) v *= ECON.OPEN_BOOST[st.day-1];
    v *= ECON.PROMO_LEVELS[st.promoLv].m;
    if (st.event) v *= st.event.mul;
    v *= 0.82 + 0.06*st.rep;
    // 立地要因: 駅距離・商圏規模・競合
    const stationMul = clamp(ECON.STATION_MUL_BASE - site.stationWalkMin*ECON.STATION_MUL_PER_MIN, ECON.STATION_MUL_MIN, ECON.STATION_MUL_BASE);
    v *= stationMul * site.catchmentMul;
    v *= (1 - site.competitionLevel*ECON.COMPETITION_MUL);
    // 駐車場キャパによる頭打ち(駅距離が遠いほど車依存が強く、より効く)
    const carDependency = clamp(0.32 + site.stationWalkMin*0.028, 0.18, 0.95);
    const parkingCapVisitors = site.parkingCap * ECON.PARKING_PER_SPACE / carDependency;
    v = Math.min(v, parkingCapVisitors);
    return Math.round(v);
  },

  // ---------- 客層アーキタイプ ----------
  computeCatNorm(){
    const norm = {};
    for (const c in CATS){
      let s = 0;
      for (const a in ARCHETYPES) s += ARCHETYPES[a].shareBase * ARCHETYPES[a].spendMul * (CAT_AFFIN[c][a]||1);
      norm[c] = s || 1;
    }
    return norm;
  },
  archShares(){
    const site = this.st && this.st.site;
    const skew = (site && site.demoSkew) || {};
    const raw = {}; let sum = 0;
    for (const a in ARCHETYPES){ raw[a] = ARCHETYPES[a].shareBase * (skew[a]||1); sum += raw[a]; }
    for (const a in raw) raw[a] /= sum;
    return raw;
  },
  tenantAppeal(t, a){
    if (!t.demo) return 1.0;
    const boosted = DEMOTAG_MAP[t.demo];
    return (boosted && boosted.includes(a)) ? 1.6 : 0.8;
  },

  hourMul(){
    const h = this.st.minutes/60;
    const i = Math.floor(h); const f = h-i;
    const a = HOUR_CURVE[Math.min(i,23)], b = HOUR_CURVE[Math.min(i+1,23)];
    return a+(b-a)*f;
  },

  // ---------- 日次決算 ----------
  settleDay(){
    const st = this.st;
    const V = st.todayVisitors;
    st.acc.visitors += V; st.acc.days++;
    if (!this._catNorm) this._catNorm = this.computeCatNorm();
    const arch = this.archShares();
    // カテゴリ×客層の需要プール(万円)
    const D = {};
    for (const c in CATS){
      D[c] = {};
      for (const a in ARCHETYPES){
        D[c][a] = V * arch[a] * ARCHETYPES[a].spendMul * (CAT_AFFIN[c][a]||1) / this._catNorm[c] * CATS[c].spend / 10000;
      }
    }
    // 露出度合計(カテゴリ×客層)
    const sumE = {};
    for (const c in CATS){ sumE[c] = {}; for (const a in ARCHETYPES) sumE[c][a] = CATS[c].leak; }
    const openUnits = st.units.filter(u=>u.state==='open' && u.ten);
    for (const u of openUnits){
      const base = this.baseExposure(u);
      u._app = {};
      for (const a in ARCHETYPES){ u._app[a] = base * this.tenantAppeal(u.ten, a) + 0.12; sumE[u.ten.cat][a] += u._app[a]; }
    }
    // 各店売上(客層ごとの需要を按分して合算)
    for (const u of openUnits){
      let sales = 0;
      for (const a in ARCHETYPES) sales += D[u.ten.cat][a] * u._app[a] / sumE[u.ten.cat][a];
      u.todaySales = sales; u.monthSales += sales;
      if (u.ten.own){
        const profit = sales*u.ten.gross - u.ten.staff/30.4 - sales*u.ten.misc;
        st.cash += profit;
        st.acc.ownProfit += profit; st.acc.ownSales += sales;
      } else {
        st.acc.tenantSales += sales;
      }
    }
    // 内装工事進行
    for (const u of st.units){
      if (u.state==='fitting'){
        u.fitDays--;
        if (u.fitDays<=0){ u.state='open'; u.openedDay=st.day; this.pushNews('🎊 「'+u.ten.name+'」が'+u.floor+'Fにオープン!'); }
      }
    }
    // イベント消化
    if (st.event){ st.event.daysLeft--; if (st.event.daysLeft<=0){ this.pushNews('催事「'+st.event.name+'」が終了しました'); st.event=null; } }
    // 日付前進
    st.totalDays++;
    const dim = new Date(st.Y, st.M, 0).getDate();
    const newMonth = st.D >= dim;
    st.day++; st.dow=(st.dow+1)%7;
    if (newMonth){ this.settleMonth(); st.D=1; st.M++; if(st.M>12){st.M=1;st.Y++;} }
    else st.D++;
    // 翌日準備
    st.weather = this.rollWeather();
    st.minutes = 540;
    st.todayVisitors = this.calcVisitors();
    st.visitorsSoFar = 0;
    if (st.cash < -20000 && !st.gameOver){ st.gameOver=true; }
    return { visitors:V };
  },

  rollWeather(){
    const total = WEATHERS.reduce((s,w)=>s+w.w,0);
    let r = Math.random()*total;
    for (let i=0;i<WEATHERS.length;i++){ r-=WEATHERS[i].w; if(r<=0) return i; }
    return 0;
  },

  baseExposure(u){
    const t = u.ten;
    const dest = (t.cat==='gourmet'||t.cat==='foodcourt'||t.cat==='amuse'||t.cat==='gms_food');
    let floorCoef = dest ? 1.0 : (u.floor===1?1.0:(u.floor===2?0.88:0.78));
    let pos = 1.0;
    if (u.kind!=='gms' && u.kind!=='cinema' && Math.abs((u.x0+u.x1)/2) < 30) pos = 1.08;
    return t.pull * floorCoef * pos;
  },

  // ---------- 月次決算 ----------
  settleMonth(){
    const st = this.st;
    const totalCapital = st.site.cashStart + st.site.loanStart;
    const rep = { Y:st.Y, M:st.M, rent:0, fee:0, ownProfit:st.acc.ownProfit, ownSales:st.acc.ownSales,
                  tenantSales:st.acc.tenantSales, visitors:st.acc.visitors, days:st.acc.days,
                  common:ECON.COMMON_COST_MONTH, promo:ECON.PROMO_LEVELS[st.promoLv].c, events:st.acc.events,
                  tax: totalCapital*ECON.PROPERTY_TAX_Y/12,
                  interest: st.loan*ECON.LOAN_RATE_Y/12, principal: Math.min(ECON.LOAN_PAY_MONTH, st.loan),
                  leaves: [], warns: [] };
    // 賃料徴収 & テナント健康診断
    for (const u of st.units){
      if (!u.ten || u.ten.own) { if(u.state==='open') u.lastMonthSales=u.monthSales; u.monthSales=0; continue; }
      if (u.state!=='open'){ u.monthSales=0; continue; }
      const rent = Math.max(u.ten.minRent, u.monthSales*u.ten.rate);
      const fee = SIZES[this.tierOf(u)].fee;
      rep.rent += rent; rep.fee += fee;
      u.lastRent = rent;
      const burden = (rent+fee)/(u.monthSales||1);
      const ratio = burden / (CATS[u.ten.cat].tol||0.15); // 業態別の負担率許容度に対する比
      const expect = u.ten.minRent/u.ten.rate;
      let sat = 70;
      if (ratio<=0.95) sat = 90; else if (ratio<=1.2) sat = 70; else if (ratio<=1.55) sat = 45; else sat = 25;
      if (u.monthSales > expect*1.3) sat = Math.min(100, sat+10);
      u.sat = Math.round(u.sat*0.4 + sat*0.6);
      if (u.sat < 45 && st.day - u.openedDay > 45) u.monthsBad++;
      else u.monthsBad = Math.max(0, u.monthsBad-1);
      if (u.monthsBad>=3 && Math.random()<0.55){
        rep.leaves.push(u.ten.name+'('+u.floor+'F)');
        this.pushNews('💔 「'+u.ten.name+'」が売上不振のため退店しました('+u.floor+'F)');
        st.cash -= Math.round((u.ten.keyMoney||0)*ECON.KEY_MONEY_RETURN);
        u.ten=null; u.state='vacant'; u.monthsBad=0; u.sat=70;
      } else if (u.monthsBad===2){
        rep.warns.push(u.ten.name+'('+u.floor+'F)');
      }
      u.lastMonthSales = u.monthSales; u.monthSales = 0;
    }
    st.cash += rep.rent + rep.fee;
    st.cash -= rep.common + rep.promo + rep.interest + rep.principal + rep.tax;
    st.loan -= rep.principal;
    // モール評判
    const shops = st.units.filter(u=>u.kind!=='cinema' && u.kind!=='ent');
    const occ = shops.filter(u=>u.state==='open').length / shops.length;
    const cats = new Set(st.units.filter(u=>u.state==='open'&&u.ten).map(u=>u.ten.cat));
    const cine = st.units.find(u=>u.kind==='cinema');
    st.rep = clamp(1 + occ*2.3 + (cats.size/11)*1.0 + (cine.state==='open'?0.45:0) + (st.acc.events>0?0.15:0), 1, 5);
    rep.occ = occ; rep.repStars = st.rep;
    rep.net = rep.rent + rep.fee + rep.ownProfit - rep.common - rep.promo - rep.interest - rep.principal - rep.events - rep.tax;
    st.lastReport = rep;
    st.history.push({ Y:rep.Y, M:rep.M, net:rep.net, visitors:rep.visitors, occ });
    if (st.history.length>36) st.history.shift();
    st.acc = this.blankAcc();
    if (typeof UI!=='undefined') UI.onMonthReport(rep);
  },

  tierOf(u){ return u.tier==='XL' ? 'L' : u.tier; },

  // ---------- リーシング ----------
  candidatesFor(u){
    const st = this.st;
    if (u.kind==='cinema'){
      return CINEMA_OPTIONS.map(c=>Object.assign({cinema:true},c));
    }
    const used = new Set(st.units.filter(x=>x.ten&&!x.ten.own).map(x=>x.ten.tid));
    const rng = mulberry32(hashStr(u.id + ':' + st.Y + '-' + st.M));
    const avail = TENANTS.filter(t=>!used.has(t.id) && this.unitFits(u,t));
    for (let i=avail.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [avail[i],avail[j]]=[avail[j],avail[i]]; }
    return avail.slice(0,5).map(t=>({
      tid:t.id, name:t.name, cat:t.cat, size:t.size, attract:t.attract, rate:t.rate, pull:t.pull, desc:t.desc,
      demo:t.demo||null, facade:t.facade||'plain',
      minRent: Math.round(t.minRent*ECON.RENT_CAL*(0.92+rng()*0.2)),
      locked: t.attract>=6 && st.rep < 2.8,
    }));
  },

  ownFormatsFor(u){
    if (u.kind==='cinema') return [];
    return OWN_FORMATS.filter(f=>SIZES[f.size].w===u.w && this.unitFits(u,{size:f.size,cat:f.cat}) &&
      !this.st.units.some(x=>x.ten&&x.ten.own&&x.ten.fid===f.id));
  },

  signLease(u, cand){
    if (u.ten) return false;
    if (cand.cinema){
      if (cand.own){
        if (this.st.cash < cand.fit) return 'cash';
        this.st.cash -= cand.fit;
        u.ten = { own:true, fid:cand.id, name:cand.name, cat:'amuse', attract:cand.attract, gross:cand.gross, staff:cand.staff, misc:cand.misc, pull:2.8 };
      } else {
        u.ten = { own:false, tid:cand.id, name:cand.name, cat:'amuse', attract:cand.attract, rate:cand.rate, minRent:cand.minRent, pull:2.8 };
      }
      u.state='fitting'; u.fitDays=30;
      this.pushNews('🏗️ シネマ区画で「'+cand.name+'」の工事が始まりました(30日)');
      if (typeof M3D!=='undefined') M3D.refreshUnit(u);
      return true;
    }
    const keyMoney = cand.minRent * ECON.KEY_MONEY_MONTHS;
    u.ten = { own:false, tid:cand.tid, name:cand.name, cat:cand.cat, attract:cand.attract, rate:cand.rate, minRent:cand.minRent, pull:cand.pull, demo:cand.demo||null, facade:cand.facade||'plain', keyMoney };
    u.state = 'fitting'; u.fitDays = ECON.FIT_DAYS; u.monthsBad=0; u.sat=70;
    this.st.cash += keyMoney;
    this.pushNews('📝 「'+cand.name+'」と定期借家契約を締結(保証金'+fmtM(keyMoney)+'受領)。内装工事開始('+ECON.FIT_DAYS+'日)');
    if (typeof M3D!=='undefined') M3D.refreshUnit(u);
    return true;
  },

  openOwn(u, f){
    if (u.ten) return false;
    if (this.st.cash < f.fit) return 'cash';
    this.st.cash -= f.fit;
    u.ten = { own:true, fid:f.id, name:f.name, cat:f.cat, attract:f.attract, gross:f.gross, staff:f.staff, misc:f.misc, pull:f.pull, demo:f.demo||null, facade:f.facade||'plain' };
    u.state='fitting'; u.fitDays=ECON.FIT_DAYS; u.monthsBad=0; u.sat=70;
    this.pushNews('🔨 直営「'+f.name+'」の出店工事を開始(投資'+fmtM(f.fit)+')');
    if (typeof M3D!=='undefined') M3D.refreshUnit(u);
    return true;
  },

  evict(u){
    if (!u.ten) return false;
    if (u.ten.own){
      this.st.cash -= 500;
      this.pushNews('直営「'+u.ten.name+'」を閉店しました(撤去費500万円)');
    } else {
      const pen = u.ten.minRent*3;
      const refund = Math.round((u.ten.keyMoney||0)*ECON.KEY_MONEY_RETURN);
      const net = pen + refund;
      if (this.st.cash < net) return 'cash';
      this.st.cash -= net;
      this.pushNews('「'+u.ten.name+'」に退店してもらいました(補償'+fmtM(pen)+'+保証金返還'+fmtM(refund)+')');
    }
    u.ten=null; u.state='vacant'; u.monthsBad=0; u.sat=70; u.monthSales=0;
    if (typeof M3D!=='undefined') M3D.refreshUnit(u);
    return true;
  },

  buyExpansion(){
    const st = this.st;
    if (!st.site.expansion || st.expansionBought) return false;
    if (st.cash < ECON.EXPANSION_COST) return 'cash';
    st.cash -= ECON.EXPANSION_COST;
    st.expansionBought = true;
    st.todayVisitors = this.calcVisitors();
    this.pushNews('🏗️ 増床工事が完了。モールの集客力が恒久的に向上しました');
    return true;
  },

  bookEvent(ev){
    const st=this.st;
    if (st.event) return 'busy';
    if (st.cash < ev.cost) return 'cash';
    st.cash -= ev.cost; st.acc.events += ev.cost;
    st.event = { id:ev.id, name:ev.name, daysLeft:ev.days, mul:ev.mul };
    st.todayVisitors = this.calcVisitors();
    this.pushNews('🎪 催事「'+ev.name+'」開催中! ('+ev.days+'日間)');
    return true;
  },

  setPromo(lv){ this.st.promoLv = lv; this.st.todayVisitors = this.calcVisitors(); },

  // ---------- 時間 ----------
  tick(dtSec){
    const st = this.st;
    if (!st || st.speed===0 || st.gameOver) return null;
    st.minutes += dtSec * 20 * st.speed;
    if (st.minutes >= 1260) return this.settleDay();
    return null;
  },

  occupancy(){
    const shops = this.st.units.filter(u=>u.kind!=='cinema' && u.kind!=='ent');
    return shops.filter(u=>u.state==='open').length / shops.length;
  },

  save(){
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.st)); return true; } catch(e){ return false; }
  },
  load(){
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return false;
      const st = JSON.parse(s);
      if (!st || st.v!==2 || !st.site) return false;
      for (const u of st.units) { u.todaySales=u.todaySales||0; }
      this.st = st;
      this._catNorm = this.computeCatNorm();
      return true;
    } catch(e){ return false; }
  },
  hasSave(){ try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; } },
};
