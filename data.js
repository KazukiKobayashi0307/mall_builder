// ================= YUME MALL data =================
// カテゴリ定義: spend = 来館者1人あたり平均消費(円/日), leak = 需要の場外流出係数
const CATS = {
  gms_food:   { label:'食品',       spend:700, leak:1.2, tol:0.10, color:'#2e7d32' },
  gms_living: { label:'暮らし',     spend:240, leak:2.0, tol:0.12, color:'#558b2f' },
  fashion:    { label:'ファッション', spend:350, leak:4.5, tol:0.16, color:'#ad1457' },
  variety:    { label:'雑貨・生活',  spend:240, leak:3.5, tol:0.16, color:'#6a1b9a' },
  gourmet:    { label:'レストラン',  spend:215, leak:2.5, tol:0.14, color:'#e65100' },
  foodcourt:  { label:'フードコート', spend:170, leak:2, tol:0.17, color:'#f9a825' },
  cafe:       { label:'カフェ・スイーツ', spend:125, leak:2, tol:0.17, color:'#8d6e63' },
  hobby:      { label:'書店・ホビー', spend:185, leak:3,  tol:0.14, color:'#1565c0' },
  kids:       { label:'キッズ',     spend:110, leak:2, tol:0.14, color:'#00897b' },
  service:    { label:'サービス',   spend:120, leak:2,  tol:0.32, color:'#546e7a' },
  amuse:      { label:'アミューズ',  spend:150, leak:2,  tol:0.19, color:'#d81b60' },
};

// サイズ区分: 区画幅(m)とテナント規模の対応
const SIZES = {
  S: { w:8,  label:'小型(40坪)',  fee:28 },
  M: { w:12, label:'中型(80坪)',  fee:46 },
  L: { w:20, label:'大型(160坪)', fee:80 },
};

// ============ 専門店カタログ(架空・パロディ名) ============
// attract:集客力(1-9) rate:売上歩合 minRent:最低保証賃料(万円/月) pull:カテゴリ内競争力
const TENANTS = [
  // --- ファッション ---
  { id:'uniwear',  name:'ユニウェア',            cat:'fashion', size:'L', attract:8, rate:0.09, minRent:300, pull:3.0, desc:'国民的ベーシックカジュアル。圧倒的集客の柱。' },
  { id:'gandu',    name:'G&U',                  cat:'fashion', size:'L', attract:6, rate:0.09, minRent:270, pull:2.2, desc:'トレンド×低価格のヤングカジュアル。' },
  { id:'shimaroad',name:'ファッションしまロード', cat:'fashion', size:'M', attract:5, rate:0.08, minRent:170, pull:1.8, desc:'家族の普段着はここで揃う。' },
  { id:'gwalk',    name:'グローバルウォーク',     cat:'fashion', size:'M', attract:5, rate:0.10, minRent:180, pull:1.5, desc:'ファミリー向けきれいめカジュアル。' },
  { id:'earthm',   name:'アースメロディ',         cat:'fashion', size:'S', attract:4, rate:0.10, minRent:115, pull:1.1, desc:'ナチュラル系レディース。' },
  { id:'honeyb',   name:'ハニーベア',            cat:'fashion', size:'S', attract:4, rate:0.10, minRent:110, pull:1.0, desc:'プチプラレディースの定番。' },
  { id:'raitson',  name:'ライツオン',            cat:'fashion', size:'M', attract:4, rate:0.09, minRent:160, pull:1.2, desc:'ジーンズ&アメカジの老舗。' },
  { id:'aoyagi',   name:'紳士服のアオヤギ',       cat:'fashion', size:'M', attract:3, rate:0.08, minRent:150, pull:0.9, desc:'スーツ・礼服。安定の郊外需要。' },
  { id:'abz',      name:'ABZマート',             cat:'fashion', size:'M', attract:5, rate:0.09, minRent:180, pull:1.6, desc:'スニーカーから革靴まで。靴の総合店。' },
  { id:'megaten',  name:'メガネ天国',            cat:'fashion', size:'S', attract:3, rate:0.10, minRent:105, pull:0.8, desc:'薄型レンズ込み低価格メガネ。' },
  { id:'bagsbar',  name:'バッグスバー',           cat:'fashion', size:'S', attract:3, rate:0.10, minRent:100, pull:0.8, desc:'バッグ・小物のセレクト。' },
  { id:'sportsau', name:'スポーツオーソリア',     cat:'fashion', size:'L', attract:5, rate:0.09, minRent:260, pull:1.6, desc:'総合スポーツ用品。部活需要に強い。' },
  // --- 雑貨・生活 ---
  { id:'mujirushi',name:'シンプル良品',          cat:'variety', size:'L', attract:7, rate:0.10, minRent:290, pull:2.6, desc:'衣食住を貫くシンプル雑貨の巨人。' },
  { id:'daiko',    name:'ダイコー100円プラザ',    cat:'variety', size:'L', attract:6, rate:0.07, minRent:230, pull:2.4, desc:'100円均一の王者。毎日客を呼ぶ。' },
  { id:'coinpark', name:'スリーコインパーク',     cat:'variety', size:'S', attract:4, rate:0.10, minRent:115, pull:1.1, desc:'300円雑貨。ついで買いの女王。' },
  { id:'raft',     name:'ラフト',                cat:'variety', size:'L', attract:6, rate:0.10, minRent:270, pull:1.9, desc:'都会派バラエティ雑貨の百貨店。' },
  { id:'decorie',  name:'デコリエ',              cat:'variety', size:'L', attract:5, rate:0.08, minRent:240, pull:1.7, desc:'低価格ホームファッション。' },
  { id:'franfleur',name:'フランフルール',         cat:'variety', size:'M', attract:4, rate:0.11, minRent:170, pull:1.2, desc:'ときめきインテリア雑貨。' },
  { id:'seikatsukan',name:'くらしの器 やまと屋',  cat:'variety', size:'S', attract:3, rate:0.09, minRent:100, pull:0.8, desc:'和食器と台所道具。' },
  // --- カフェ・スイーツ ---
  { id:'starpacks',name:'スターパックスコーヒー', cat:'cafe', size:'S', attract:6, rate:0.11, minRent:140, pull:2.4, desc:'言わずと知れたシアトル系。モールの顔。' },
  { id:'torleys',  name:'トーリーズコーヒー',     cat:'cafe', size:'S', attract:4, rate:0.10, minRent:110, pull:1.3, desc:'落ち着いた大人のカフェ。' },
  { id:'thirty2',  name:'サーティツーアイスクリーム', cat:'cafe', size:'S', attract:5, rate:0.11, minRent:120, pull:1.6, desc:'32種類のフレーバー。家族連れの聖地。' },
  { id:'doanaana', name:'ドーナツのアナ',         cat:'cafe', size:'S', attract:4, rate:0.10, minRent:110, pull:1.4, desc:'ふわふわドーナツと100円コーヒー。' },
  { id:'kajun',    name:'果汁工房カジュン',       cat:'cafe', size:'S', attract:3, rate:0.11, minRent:100, pull:0.9, desc:'搾りたてフレッシュジュース。' },
  { id:'choupapa', name:'シューパパ工房',         cat:'cafe', size:'S', attract:3, rate:0.10, minRent:95,  pull:0.9, desc:'焼きたてシュークリーム。匂いで客を呼ぶ。' },
  { id:'kaldia',   name:'カルディア珈琲農園',     cat:'cafe', size:'M', attract:6, rate:0.09, minRent:170, pull:1.9, desc:'コーヒーと世界の食品。宝探しの店。' },
  { id:'harenohi', name:'食料品店ハレノヒ',       cat:'cafe', size:'M', attract:4, rate:0.09, minRent:160, pull:1.2, desc:'ちょっと贅沢な高質食品スーパー。' },
  // --- レストラン ---
  { id:'saizeru',  name:'ミラノ食堂サイゼール',   cat:'gourmet', size:'M', attract:6, rate:0.10, minRent:190, pull:2.2, desc:'驚異の低価格イタリアン。ファミリーの味方。' },
  { id:'gusto',    name:'ファミリー食堂グスト',   cat:'gourmet', size:'M', attract:5, rate:0.10, minRent:180, pull:1.7, desc:'何でも揃うファミレスの雄。' },
  { id:'sushiroad',name:'回転寿司スシロード',     cat:'gourmet', size:'L', attract:7, rate:0.10, minRent:290, pull:2.8, desc:'週末は2時間待ちの回転寿司。' },
  { id:'daishogun',name:'焼肉大将軍',            cat:'gourmet', size:'L', attract:5, rate:0.11, minRent:260, pull:1.7, desc:'食べ放題焼肉。夜の売上が厚い。' },
  { id:'wakotei',  name:'とんかつ和光亭',        cat:'gourmet', size:'M', attract:4, rate:0.10, minRent:165, pull:1.2, desc:'キャベツおかわり自由の老舗とんかつ。' },
  { id:'ooedoya',  name:'大江戸屋ごはん処',      cat:'gourmet', size:'M', attract:4, rate:0.10, minRent:160, pull:1.2, desc:'定食と土鍋ごはん。健康志向に人気。' },
  { id:'meisho',   name:'餃子の名将',            cat:'gourmet', size:'M', attract:5, rate:0.10, minRent:175, pull:1.6, desc:'中華の鉄板。餃子とチャーハンで無敵。' },
  // --- フードコート ---
  { id:'marukin',  name:'丸金製麺',              cat:'foodcourt', size:'S', attract:7, rate:0.11, minRent:130, pull:2.6, desc:'目の前で打つ讃岐うどん。FC最強の行列。' },
  { id:'megaburger',name:'メガバーガー',          cat:'foodcourt', size:'S', attract:7, rate:0.10, minRent:135, pull:2.6, desc:'世界的ハンバーガーチェーン(のような何か)。' },
  { id:'ohtako',   name:'銀のたこ焼 大阪丸',      cat:'foodcourt', size:'S', attract:5, rate:0.11, minRent:110, pull:1.6, desc:'外カリ中トロのたこ焼き。' },
  { id:'ichijin',  name:'一陣堂ラーメン',        cat:'foodcourt', size:'S', attract:5, rate:0.11, minRent:115, pull:1.7, desc:'豚骨ラーメンの雄。替え玉無料。' },
  { id:'champon',  name:'ちゃんぽん長崎亭',      cat:'foodcourt', size:'S', attract:4, rate:0.10, minRent:105, pull:1.2, desc:'野菜たっぷりちゃんぽん。' },
  { id:'pepstek',  name:'ペッパーステーキ工房',   cat:'foodcourt', size:'S', attract:4, rate:0.11, minRent:110, pull:1.3, desc:'鉄板でジュージュー焼くステーキ丼。' },
  // --- 書店・ホビー ---
  { id:'towerrec', name:'タワーオブレコード',     cat:'hobby', size:'M', attract:4, rate:0.09, minRent:150, pull:1.3, desc:'CDとアイドルグッズ。イベント開催可。' },
  { id:'vbungalow',name:'ビレッジバンガロー',     cat:'hobby', size:'M', attract:5, rate:0.10, minRent:165, pull:1.5, desc:'遊べる本屋。カオスな雑貨の森。' },
  { id:'zeo',      name:'ゲームとDVDのZEO',      cat:'hobby', size:'M', attract:4, rate:0.08, minRent:150, pull:1.3, desc:'ゲーム・中古ソフト・スマホも扱う。' },
  { id:'joyama',   name:'デンキのジョーヤマ',     cat:'hobby', size:'L', attract:6, rate:0.06, minRent:250, pull:2.2, desc:'モール型家電。ポイント還元で勝負。' },
  { id:'craftpan', name:'パンドラクラフト',       cat:'hobby', size:'M', attract:3, rate:0.09, minRent:140, pull:0.9, desc:'手芸・生地・ボタンの専門店。' },
  // --- キッズ ---
  { id:'higashimatsu',name:'ベビーの東松屋',      cat:'kids', size:'M', attract:5, rate:0.08, minRent:160, pull:1.8, desc:'底値のベビー・子供服。' },
  { id:'akachandpt',name:'アカチャンデパート',    cat:'kids', size:'L', attract:5, rate:0.09, minRent:240, pull:1.9, desc:'マタニティから育児用品まで全部。' },
  { id:'toyking',  name:'トイランドキング',       cat:'kids', size:'L', attract:6, rate:0.09, minRent:250, pull:2.1, desc:'おもちゃの王国。誕生日はここ。' },
  // --- サービス ---
  { id:'mobiled',  name:'モバイルプラザD',        cat:'service', size:'S', attract:3, rate:0.13, minRent:150, pull:1.2, desc:'キャリアショップ。賃料負担力は最強クラス。' },
  { id:'mobilea',  name:'モバイルプラザA',        cat:'service', size:'S', attract:3, rate:0.13, minRent:145, pull:1.1, desc:'こちらもキャリアショップ。' },
  { id:'qqcut',    name:'QQカット',              cat:'service', size:'S', attract:3, rate:0.10, minRent:95,  pull:1.0, desc:'10分1350円ヘアカット。回転率で稼ぐ。' },
  { id:'hokeniri', name:'ほけんの入口',           cat:'service', size:'S', attract:2, rate:0.12, minRent:100, pull:0.7, desc:'保険の無料相談。堅実な賃料収入源。' },
  { id:'tabisuke', name:'旅工房タビスケ',         cat:'service', size:'S', attract:2, rate:0.10, minRent:90,  pull:0.6, desc:'旅行代理店。' },
  { id:'onaoshi',  name:'お直しコンシェル',       cat:'service', size:'S', attract:2, rate:0.10, minRent:85,  pull:0.6, desc:'洋服のお直しと合鍵。地味に必須。' },
  { id:'mallpharm',name:'モール調剤薬局',         cat:'service', size:'S', attract:3, rate:0.09, minRent:100, pull:1.0, desc:'処方箋も市販薬も。高齢客の来館理由。' },
  // --- アミューズ ---
  { id:'bamco',    name:'バムコワンダーパーク',   cat:'amuse', size:'L', attract:6, rate:0.10, minRent:260, pull:2.2, desc:'クレーンゲームの森。景品原価との戦い。' },
];

// ============ 直営業態(自社出店) ============
// gross:粗利率 staff:人件費(万円/月) misc:売上比経費 fit:内装投資(万円)
const OWN_FORMATS = [
  { id:'own_book',  name:'ミライヤ書店',        cat:'hobby',   size:'L', attract:6, gross:0.32, staff:220, misc:0.05, fit:6000,  pull:2.4, desc:'グループの書店業態。文具・児童書に強い。' },
  { id:'own_merry', name:'メリーファンタジー',   cat:'amuse',   size:'L', attract:7, gross:0.55, staff:320, misc:0.10, fit:9000,  pull:2.6, desc:'キッズゲームパーク。土日の稼ぎ頭。' },
  { id:'own_rau',   name:'R.A.U',              cat:'variety', size:'M', attract:4, gross:0.34, staff:150, misc:0.05, fit:4200,  pull:1.3, desc:'"あったらいいな"の生活雑貨直営。' },
  { id:'own_cafel', name:'カフェランテール',     cat:'cafe',    size:'S', attract:4, gross:0.62, staff:120, misc:0.07, fit:2600,  pull:1.3, desc:'直営カフェ&輸入食品。' },
  { id:'own_sports',name:'スポーツオーソリア(直営)', cat:'fashion', size:'L', attract:5, gross:0.33, staff:230, misc:0.05, fit:6800, pull:1.6, desc:'スポーツ用品の直営運営版。' },
  { id:'own_100',   name:'ユメ100円プラザ',     cat:'variety', size:'L', attract:6, gross:0.36, staff:200, misc:0.05, fit:5200,  pull:2.3, desc:'直営100円ショップ。集客装置。' },
  { id:'own_bank',  name:'ユメ銀行',            cat:'service', size:'S', attract:3, gross:0.75, staff:140, misc:0.08, fit:3800,  pull:1.0, desc:'モール内銀行。ATMが来館理由になる。' },
  { id:'own_craft', name:'パンドラクラフト(直営)', cat:'hobby',  size:'M', attract:3, gross:0.40, staff:130, misc:0.05, fit:3400,  pull:0.9, desc:'手芸専門店の直営版。' },
];

// シネマ区画専用
const CINEMA_OPTIONS = [
  { id:'own_cinema', own:true,  name:'ユメシネマ',        attract:9, gross:0.55, staff:700, misc:0.12, fit:38000, desc:'直営12スクリーンシネコン。モール滞在時間を劇的に伸ばす。' },
  { id:'sunrise',    own:false, name:'シネマサンライズ',   attract:8, rate:0.08, minRent:380, desc:'大手シネコンを誘致。安定賃料だが興行収入は入らない。' },
];

// GMS(核店舗・開業時から直営固定)
const GMS_FLOORS = [
  { floor:1, name:'ユメスタイル 食品館',        cat:'gms_food',   attract:9, gross:0.245, staff:1350, misc:0.035 },
  { floor:2, name:'ユメスタイル ホーム&ファッション', cat:'gms_living', attract:6, gross:0.30,  staff:900,  misc:0.045 },
];

// ============ 催事イベント ============
const EVENTS = [
  { id:'hokkaido', name:'北海道物産展',        cost:900,  days:7, mul:1.22, desc:'海鮮・スイーツの鉄板催事。1週間来館+22%' },
  { id:'gourmetfes',name:'ご当地グルメ祭',     cost:700,  days:5, mul:1.18, desc:'全国のB級グルメ集結。5日間来館+18%' },
  { id:'heroshow', name:'キッズヒーローショー', cost:450,  days:2, mul:1.45, desc:'週末セントラルコートが家族で埋まる。2日間+45%' },
  { id:'yurufes',  name:'ゆるキャラまつり',    cost:350,  days:2, mul:1.30, desc:'県内ゆるキャラ大集合。2日間+30%' },
  { id:'idolevent',name:'ご当地アイドルLIVE',  cost:600,  days:1, mul:1.85, desc:'1日限りの爆発力。転売対策はしっかり。' },
  { id:'kimonofair',name:'新春きもの初売り市', cost:500,  days:4, mul:1.15, desc:'落ち着いた集客と高単価。4日間+15%' },
];

// 天候・季節
const WEATHERS = [
  { id:'sunny', label:'晴れ', icon:'☀', mul:1.00, w:46 },
  { id:'cloud', label:'くもり', icon:'☁', mul:0.98, w:30 },
  { id:'rain',  label:'雨',   icon:'☂', mul:0.88, w:18 },
  { id:'storm', label:'荒天', icon:'⚡', mul:0.72, w:6 },
];
const MONTH_MUL = [1.22, 0.90, 1.08, 1.00, 1.05, 0.92, 1.12, 1.18, 0.98, 1.02, 1.05, 1.30]; // 1月..12月

// 経済定数
const ECON = {
  BASE_VISITORS: 1500,     // 最低来館ベース
  ATTRACT_COEF: 95,        // 集客力→来館係数
  ATTRACT_POW: 0.85,       // 逓減
  SAT_MUL: 1.90, SUN_MUL: 2.05, // 土日係数
  KANSHA_MUL: 1.32,        // 感謝デー(20/30日)
  OPEN_BOOST: [2.0, 1.7, 1.45], // グランドオープン3日間
  VACANCY_PENALTY: 0.45,   // 空床1区画あたり集客減点
  COMMON_COST_MONTH: 4200, // 共用部管理費(万円/月)
  LOAN_INIT: 1200000,      // 借入残(万円) = 120億
  LOAN_PAY_MONTH: 5000,    // 元本返済(万円/月)
  LOAN_RATE_Y: 0.021,      // 年利
  CASH_INIT: 32000,        // 初期資金 3.2億
  RENT_CAL: 0.8,           // 実勢賃料係数(カタログ値×これ)
  FIT_DAYS: 14,            // 内装工事日数
  PROMO_LEVELS: [ {c:0,m:1.0,label:'なし'}, {c:400,m:1.05,label:'チラシ'}, {c:1000,m:1.11,label:'TVCM'}, {c:2200,m:1.18,label:'大型キャンペーン'} ],
};

const MALL_NAME = 'ユメモール';
const SAVE_KEY = 'yumemall_save_v1';
