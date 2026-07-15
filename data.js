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

// ============ 客層アーキタイプ(性別・年代セグメント) ============
// shareBase: 標準商圏での人口構成比(合計1.0) spendMul: 消費額係数 h/skin/hair/palette: NPC描画用
const ARCHETYPES = {
  kids_family: { label:'ファミリー',   shareBase:0.20, spendMul:1.15, height:0.98, skin:'#f0c9a0', hair:['#2b2019','#4a3222','#1c1c1c'], palette:['#e8664f','#4f8fe8','#5fae5f','#e8b34f'] },
  young_female:{ label:'若年女性',     shareBase:0.16, spendMul:1.05, height:1.00, skin:'#f3d2b3', hair:['#2b2019','#6b3f2a','#8a5a2a','#3a2a1a'], palette:['#e88fb0','#c98fe8','#f0d080','#8fc9e8'] },
  young_male:  { label:'若年男性',     shareBase:0.14, spendMul:0.95, height:1.05, skin:'#e8c19a', hair:['#1c1c1c','#2b2019','#403020'], palette:['#4f5a66','#3a3a3a','#5f7a8f','#8a8f6a'] },
  adult_female:{ label:'成人女性',     shareBase:0.18, spendMul:1.20, height:1.00, skin:'#f0cca6', hair:['#2b2019','#1c1c1c','#4a3222'], palette:['#a85f7a','#7a6a9a','#b08a5a','#5a8a7a'] },
  adult_male:  { label:'成人男性',     shareBase:0.17, spendMul:1.10, height:1.06, skin:'#dbb488', hair:['#1c1c1c','#2b2019','#5a5a5a'], palette:['#3a4a5a','#4a4a4a','#2a3a4a','#5a4a3a'] },
  senior:      { label:'シニア',       shareBase:0.15, spendMul:0.90, height:0.95, skin:'#e0bd9a', hair:['#c9c9c9','#e8e8e8','#9a9a9a','#5a5a5a'], palette:['#8a8a7a','#9a8a7a','#7a8a8a','#a89a8a'] },
};
// カテゴリ×客層 の相性(1.0基準、高いほどその客層がよく落とすカテゴリ)
const CAT_AFFIN = {
  gms_food:   { kids_family:1.3, young_female:0.8, young_male:0.7, adult_female:1.3, adult_male:1.0, senior:1.3 },
  gms_living: { kids_family:1.2, young_female:0.8, young_male:0.6, adult_female:1.3, adult_male:0.9, senior:1.1 },
  fashion:    { kids_family:0.7, young_female:1.6, young_male:1.1, adult_female:1.3, adult_male:0.8, senior:0.5 },
  variety:    { kids_family:1.0, young_female:1.5, young_male:0.7, adult_female:1.2, adult_male:0.6, senior:0.9 },
  gourmet:    { kids_family:1.3, young_female:1.0, young_male:1.1, adult_female:1.1, adult_male:1.2, senior:0.8 },
  foodcourt:  { kids_family:1.3, young_female:0.9, young_male:1.3, adult_female:0.8, adult_male:1.0, senior:0.6 },
  cafe:       { kids_family:0.7, young_female:1.6, young_male:0.6, adult_female:1.3, adult_male:0.7, senior:1.0 },
  hobby:      { kids_family:0.8, young_female:0.9, young_male:1.7, adult_female:0.7, adult_male:1.2, senior:0.6 },
  kids:       { kids_family:2.2, young_female:0.3, young_male:0.2, adult_female:0.6, adult_male:0.4, senior:0.3 },
  service:    { kids_family:1.0, young_female:0.9, young_male:0.8, adult_female:1.3, adult_male:1.1, senior:1.4 },
  amuse:      { kids_family:1.7, young_female:0.7, young_male:1.5, adult_female:0.5, adult_male:0.6, senior:0.3 },
};
// テナントのdemoタグ→ブーストされる客層アーキタイプ
const DEMOTAG_MAP = {
  young: ['young_female','young_male'], young_female:['young_female'], young_male:['young_male'],
  family: ['kids_family'], senior: ['senior'], adult_female:['adult_female'], adult_male:['adult_male'],
};
const DEMO_LABEL = {
  young:'若年層(男女)', young_female:'若年女性', young_male:'若年男性',
  family:'ファミリー層', senior:'シニア層', adult_female:'成人女性', adult_male:'成人男性',
};
// テナントの外観アーキタイプ一覧(mall3dの店構え生成に対応): glass/bold/boutique/warm/kids/noren/stall/tech/plain/kuzefuku/drug

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
  { id:'uniwear',  name:'ユニウェア',            cat:'fashion', size:'L', attract:8, rate:0.09, minRent:300, pull:3.0, facade:'glass',    desc:'国民的ベーシックカジュアル。圧倒的集客の柱。' },
  { id:'gandu',    name:'G&U',                  cat:'fashion', size:'L', attract:6, rate:0.09, minRent:270, pull:2.2, facade:'bold', demo:'young', desc:'トレンド×低価格のヤングカジュアル。' },
  { id:'shimaroad',name:'ファッションしまロード', cat:'fashion', size:'M', attract:5, rate:0.08, minRent:170, pull:1.8, facade:'glass', demo:'family', desc:'家族の普段着はここで揃う。' },
  { id:'gwalk',    name:'グローバルウォーク',     cat:'fashion', size:'M', attract:5, rate:0.10, minRent:180, pull:1.5, facade:'boutique', demo:'family', desc:'ファミリー向けきれいめカジュアル。' },
  { id:'earthm',   name:'アースメロディ',         cat:'fashion', size:'S', attract:4, rate:0.10, minRent:115, pull:1.1, facade:'boutique', demo:'young_female', desc:'ナチュラル系レディース。' },
  { id:'honeyb',   name:'ハニーベア',            cat:'fashion', size:'S', attract:4, rate:0.10, minRent:110, pull:1.0, facade:'boutique', demo:'young_female', desc:'プチプラレディースの定番。' },
  { id:'raitson',  name:'ライツオン',            cat:'fashion', size:'M', attract:4, rate:0.09, minRent:160, pull:1.2, facade:'bold', demo:'young_male', desc:'ジーンズ&アメカジの老舗。' },
  { id:'aoyagi',   name:'紳士服のアオヤギ',       cat:'fashion', size:'M', attract:3, rate:0.08, minRent:150, pull:0.9, facade:'plain', demo:'adult_male', desc:'スーツ・礼服。安定の郊外需要。' },
  { id:'abz',      name:'ABZマート',             cat:'fashion', size:'M', attract:5, rate:0.09, minRent:180, pull:1.6, facade:'glass',    desc:'スニーカーから革靴まで。靴の総合店。' },
  { id:'megaten',  name:'メガネ天国',            cat:'fashion', size:'S', attract:3, rate:0.10, minRent:105, pull:0.8, facade:'plain', demo:'senior', desc:'薄型レンズ込み低価格メガネ。' },
  { id:'bagsbar',  name:'バッグスバー',           cat:'fashion', size:'S', attract:3, rate:0.10, minRent:100, pull:0.8, facade:'boutique', demo:'young_female', desc:'バッグ・小物のセレクト。' },
  { id:'sportsau', name:'スポーツオーソリア',     cat:'fashion', size:'L', attract:5, rate:0.09, minRent:260, pull:1.6, facade:'bold', demo:'young_male', desc:'総合スポーツ用品。部活需要に強い。' },
  // --- 雑貨・生活 ---
  { id:'mujirushi',name:'シンプル良品',          cat:'variety', size:'L', attract:7, rate:0.10, minRent:290, pull:2.6, facade:'glass',    desc:'衣食住を貫くシンプル雑貨の巨人。' },
  { id:'daiko',    name:'ダイコー100円プラザ',    cat:'variety', size:'L', attract:6, rate:0.07, minRent:230, pull:2.4, facade:'bold',      desc:'100円均一の王者。毎日客を呼ぶ。' },
  { id:'coinpark', name:'スリーコインパーク',     cat:'variety', size:'S', attract:4, rate:0.10, minRent:115, pull:1.1, facade:'kids', demo:'young_female', desc:'300円雑貨。ついで買いの女王。' },
  { id:'raft',     name:'ラフト',                cat:'variety', size:'L', attract:6, rate:0.10, minRent:270, pull:1.9, facade:'glass', demo:'young', desc:'都会派バラエティ雑貨の百貨店。' },
  { id:'decorie',  name:'デコリエ',              cat:'variety', size:'L', attract:5, rate:0.08, minRent:240, pull:1.7, facade:'warm', demo:'adult_female', desc:'低価格ホームファッション。' },
  { id:'franfleur',name:'フランフルール',         cat:'variety', size:'M', attract:4, rate:0.11, minRent:170, pull:1.2, facade:'boutique', demo:'young_female', desc:'ときめきインテリア雑貨。' },
  { id:'seikatsukan',name:'くらしの器 やまと屋',  cat:'variety', size:'S', attract:3, rate:0.09, minRent:100, pull:0.8, facade:'warm', demo:'senior', desc:'和食器と台所道具。' },
  { id:'kikufuku',  name:'喜久福商店',           cat:'variety', size:'M', attract:6, rate:0.10, minRent:190, pull:1.9, facade:'kuzefuku', demo:'adult_female', desc:'全国の逸品を集めた食品・雑貨のセレクトショップ。福袋が名物。' },
  // --- カフェ・スイーツ ---
  { id:'starpacks',name:'スターパックスコーヒー', cat:'cafe', size:'S', attract:6, rate:0.11, minRent:140, pull:2.4, facade:'warm', demo:'young', desc:'言わずと知れたシアトル系。モールの顔。' },
  { id:'torleys',  name:'トーリーズコーヒー',     cat:'cafe', size:'S', attract:4, rate:0.10, minRent:110, pull:1.3, facade:'warm', demo:'adult_female', desc:'落ち着いた大人のカフェ。' },
  { id:'thirty2',  name:'サーティツーアイスクリーム', cat:'cafe', size:'S', attract:5, rate:0.11, minRent:120, pull:1.6, facade:'kids', demo:'family', desc:'32種類のフレーバー。家族連れの聖地。' },
  { id:'doanaana', name:'ドーナツのアナ',         cat:'cafe', size:'S', attract:4, rate:0.10, minRent:110, pull:1.4, facade:'kids', demo:'young_female', desc:'ふわふわドーナツと100円コーヒー。' },
  { id:'kajun',    name:'果汁工房カジュン',       cat:'cafe', size:'S', attract:3, rate:0.11, minRent:100, pull:0.9, facade:'kids', demo:'young_female', desc:'搾りたてフレッシュジュース。' },
  { id:'choupapa', name:'シューパパ工房',         cat:'cafe', size:'S', attract:3, rate:0.10, minRent:95,  pull:0.9, facade:'warm', demo:'young_female', desc:'焼きたてシュークリーム。匂いで客を呼ぶ。' },
  { id:'kaldia',   name:'カルディア珈琲農園',     cat:'cafe', size:'M', attract:6, rate:0.09, minRent:170, pull:1.9, facade:'warm', demo:'adult_female', desc:'コーヒーと世界の食品。宝探しの店。' },
  { id:'harenohi', name:'食料品店ハレノヒ',       cat:'cafe', size:'M', attract:4, rate:0.09, minRent:160, pull:1.2, facade:'glass', demo:'senior', desc:'ちょっと贅沢な高質食品スーパー。' },
  // --- レストラン ---
  { id:'saizeru',  name:'ミラノ食堂サイゼール',   cat:'gourmet', size:'M', attract:6, rate:0.10, minRent:190, pull:2.2, facade:'noren', demo:'family', desc:'驚異の低価格イタリアン。ファミリーの味方。' },
  { id:'gusto',    name:'ファミリー食堂グスト',   cat:'gourmet', size:'M', attract:5, rate:0.10, minRent:180, pull:1.7, facade:'noren', demo:'family', desc:'何でも揃うファミレスの雄。' },
  { id:'sushiroad',name:'回転寿司スシロード',     cat:'gourmet', size:'L', attract:7, rate:0.10, minRent:290, pull:2.8, facade:'noren', demo:'family', desc:'週末は2時間待ちの回転寿司。' },
  { id:'daishogun',name:'焼肉大将軍',            cat:'gourmet', size:'L', attract:5, rate:0.11, minRent:260, pull:1.7, facade:'noren', demo:'adult_male', desc:'食べ放題焼肉。夜の売上が厚い。' },
  { id:'wakotei',  name:'とんかつ和光亭',        cat:'gourmet', size:'M', attract:4, rate:0.10, minRent:165, pull:1.2, facade:'noren', demo:'adult_male', desc:'キャベツおかわり自由の老舗とんかつ。' },
  { id:'ooedoya',  name:'大江戸屋ごはん処',      cat:'gourmet', size:'M', attract:4, rate:0.10, minRent:160, pull:1.2, facade:'noren', demo:'senior', desc:'定食と土鍋ごはん。健康志向に人気。' },
  { id:'meisho',   name:'餃子の名将',            cat:'gourmet', size:'M', attract:5, rate:0.10, minRent:175, pull:1.6, facade:'noren', demo:'adult_male', desc:'中華の鉄板。餃子とチャーハンで無敵。' },
  // --- フードコート ---
  { id:'marukin',  name:'丸金製麺',              cat:'foodcourt', size:'S', attract:7, rate:0.11, minRent:130, pull:2.6, facade:'stall',    desc:'目の前で打つ讃岐うどん。FC最強の行列。' },
  { id:'megaburger',name:'メガバーガー',          cat:'foodcourt', size:'S', attract:7, rate:0.10, minRent:135, pull:2.6, facade:'stall', demo:'young', desc:'世界的ハンバーガーチェーン(のような何か)。' },
  { id:'ohtako',   name:'銀のたこ焼 大阪丸',      cat:'foodcourt', size:'S', attract:5, rate:0.11, minRent:110, pull:1.6, facade:'stall', demo:'family', desc:'外カリ中トロのたこ焼き。' },
  { id:'ichijin',  name:'一陣堂ラーメン',        cat:'foodcourt', size:'S', attract:5, rate:0.11, minRent:115, pull:1.7, facade:'stall', demo:'young_male', desc:'豚骨ラーメンの雄。替え玉無料。' },
  { id:'champon',  name:'ちゃんぽん長崎亭',      cat:'foodcourt', size:'S', attract:4, rate:0.10, minRent:105, pull:1.2, facade:'stall', demo:'senior', desc:'野菜たっぷりちゃんぽん。' },
  { id:'pepstek',  name:'ペッパーステーキ工房',   cat:'foodcourt', size:'S', attract:4, rate:0.11, minRent:110, pull:1.3, facade:'stall', demo:'young_male', desc:'鉄板でジュージュー焼くステーキ丼。' },
  // --- 書店・ホビー ---
  { id:'towerrec', name:'タワーオブレコード',     cat:'hobby', size:'M', attract:4, rate:0.09, minRent:150, pull:1.3, facade:'tech', demo:'young', desc:'CDとアイドルグッズ。イベント開催可。' },
  { id:'vbungalow',name:'ビレッジバンガロー',     cat:'hobby', size:'M', attract:5, rate:0.10, minRent:165, pull:1.5, facade:'tech', demo:'young', desc:'遊べる本屋。カオスな雑貨の森。' },
  { id:'zeo',      name:'ゲームとDVDのZEO',      cat:'hobby', size:'M', attract:4, rate:0.08, minRent:150, pull:1.3, facade:'tech', demo:'young_male', desc:'ゲーム・中古ソフト・スマホも扱う。' },
  { id:'joyama',   name:'デンキのジョーヤマ',     cat:'hobby', size:'L', attract:6, rate:0.06, minRent:250, pull:2.2, facade:'bold', demo:'adult_male', desc:'モール型家電。ポイント還元で勝負。' },
  { id:'craftpan', name:'パンドラクラフト',       cat:'hobby', size:'M', attract:3, rate:0.09, minRent:140, pull:0.9, facade:'warm', demo:'senior', desc:'手芸・生地・ボタンの専門店。' },
  // --- キッズ ---
  { id:'higashimatsu',name:'ベビーの東松屋',      cat:'kids', size:'M', attract:5, rate:0.08, minRent:160, pull:1.8, facade:'kids', demo:'family', desc:'底値のベビー・子供服。' },
  { id:'akachandpt',name:'アカチャンデパート',    cat:'kids', size:'L', attract:5, rate:0.09, minRent:240, pull:1.9, facade:'kids', demo:'family', desc:'マタニティから育児用品まで全部。' },
  { id:'toyking',  name:'トイランドキング',       cat:'kids', size:'L', attract:6, rate:0.09, minRent:250, pull:2.1, facade:'kids', demo:'family', desc:'おもちゃの王国。誕生日はここ。' },
  // --- サービス ---
  { id:'mobiled',  name:'モバイルプラザD',        cat:'service', size:'S', attract:3, rate:0.13, minRent:150, pull:1.2, facade:'tech', demo:'young', desc:'キャリアショップ。賃料負担力は最強クラス。' },
  { id:'mobilea',  name:'モバイルプラザA',        cat:'service', size:'S', attract:3, rate:0.13, minRent:145, pull:1.1, facade:'tech', demo:'young', desc:'こちらもキャリアショップ。' },
  { id:'qqcut',    name:'QQカット',              cat:'service', size:'S', attract:3, rate:0.10, minRent:95,  pull:1.0, facade:'plain', demo:'adult_male', desc:'10分1350円ヘアカット。回転率で稼ぐ。' },
  { id:'hokeniri', name:'ほけんの入口',           cat:'service', size:'S', attract:2, rate:0.12, minRent:100, pull:0.7, facade:'plain', demo:'adult_female', desc:'保険の無料相談。堅実な賃料収入源。' },
  { id:'tabisuke', name:'旅工房タビスケ',         cat:'service', size:'S', attract:2, rate:0.10, minRent:90,  pull:0.6, facade:'plain', demo:'senior', desc:'旅行代理店。' },
  { id:'onaoshi',  name:'お直しコンシェル',       cat:'service', size:'S', attract:2, rate:0.10, minRent:85,  pull:0.6, facade:'plain', demo:'senior', desc:'洋服のお直しと合鍵。地味に必須。' },
  { id:'mallpharm',name:'モール調剤薬局',         cat:'service', size:'S', attract:3, rate:0.09, minRent:100, pull:1.0, facade:'plain', demo:'senior', desc:'処方箋も市販薬も。高齢客の来館理由。' },
  { id:'harmonydrug',name:'ハーモニードラッグ',    cat:'service', size:'L', attract:6, rate:0.08, minRent:230, pull:2.0, facade:'drug', demo:'adult_female', desc:'医薬品からコスメ・日用品まで。毎日の買い物が集まる大型ドラッグストア。' },
  // --- アミューズ ---
  { id:'bamco',    name:'バムコワンダーパーク',   cat:'amuse', size:'L', attract:6, rate:0.10, minRent:260, pull:2.2, facade:'tech', demo:'young_male', desc:'クレーンゲームの森。景品原価との戦い。' },
];

// ============ テナント手続き生成(カタログ規模を約500店まで拡張) ============
// 手作業では非現実的な規模のため、カテゴリごとの語彙テンプレート×決定論的PRNGで大量生成する。
(function(){
  function pgHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function pgRng(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }

  const NAME_PARTS = {
    fashion:   { pre:['グローバル','ユナイテッド','コネクト','スタイル','ベーシック','トレンド','シンプル','カジュアル','プレミアム','リアル','デイリー','アーバン','ノーブル','モダン','フレッシュ'], suf:['ウォーク','クローゼット','ワードローブ','スタジオ','ファクトリー','マーケット','ボックス','ラボ','ガレージ','アトリエ','コレクション','ドレッサー'] },
    variety:   { pre:['くらしの','てまえ','ふらっと','ここちの','ゆとりの','まいにちの','てのひら','すこやか','にっぽんの','わたしの','きせつの','てづくりの'], suf:['雑貨店','マーケット','コレクション','ストア','バザール','ラボ','工房','ギャラリー','くらぶ','ショップ'] },
    cafe:      { pre:['アロマ','森の','麦の','木もれ日','水辺の','陽だまり','煉瓦','石窯','薫る','丸の内','ベイクド','ハニー'], suf:['珈琲舎','カフェテラス','喫茶室','ドルチェ','ベーカリー','キッチン','パーラー','ラウンジ','工房'] },
    gourmet:   { pre:['大将の','四季の','旬彩','炭火','鉄板','手打ち','母の味','匠の','古今','花咲','八十八','蔵前'], suf:['食堂','厨房','酒場','キッチン','ダイニング','屋台','亭','茶寮','食卓'] },
    foodcourt: { pre:['元気','爆盛り','秘伝','本格','特製','ご当地','絶品','熱々','ボリューム','ザ・'], suf:['丼','麺場','屋台','キッチン','食堂','スタンド','コーナー'] },
    hobby:     { pre:['アニメイト','ホビー','コレクターズ','ゲーマーズ','カルチャー','トイズ','コミック','フィギュア','サブカル'], suf:['ステーション','ワールド','ベース','ギャラリー','パーク','ハウス','ラボ'] },
    kids:      { pre:['キッズ','ベビー','すくすく','にこにこ','ちびっこ','ぴよぴよ','わんぱく','ことりの'], suf:['ランド','パーク','ガーデン','ハウス','ワールド','ステーション','くらぶ'] },
    service:   { pre:['クイック','スマート','あんしん','まちの','セーフティ','パーフェクト','フレンドリー','てきぱき'], suf:['サービス','窓口','相談所','ステーション','デスク','プラザ','センター'] },
    amuse:     { pre:['ワンダー','ドリーム','ファン','ゲームズ','プレイ','スター','ラッキー','ハッピー'], suf:['パーク','アリーナ','ワールド','スクエア','ステーション','ランド'] },
    gms_food:  { pre:['マルシェ','フレッシュ','旬の'], suf:['市場','フーズ','食品館'] },
    gms_living:{ pre:['くらし','ホーム','リビング'], suf:['館','プラザ','センター'] },
  };
  const FACADE_POOL = {
    fashion:['glass','bold','boutique'], variety:['glass','bold','boutique','warm','kuzefuku'], cafe:['warm','kids'],
    gourmet:['noren'], foodcourt:['stall'], hobby:['tech','warm','bold'], kids:['kids'],
    service:['plain','tech','drug'], amuse:['tech','bold'], gms_food:['glass','kuzefuku'], gms_living:['glass'],
  };
  const DEMO_POOL = ['young','young_female','young_male','family','senior','adult_female','adult_male', null, null];
  const BASE_STAT = {
    fashion:{attract:[2,6],rate:[0.08,0.11],rent:[80,220],pull:[0.6,1.8]},
    variety:{attract:[2,6],rate:[0.08,0.12],rent:[75,210],pull:[0.6,1.7]},
    cafe:{attract:[2,5],rate:[0.09,0.12],rent:[75,150],pull:[0.6,1.5]},
    gourmet:{attract:[2,5],rate:[0.09,0.11],rent:[110,190],pull:[0.7,1.6]},
    foodcourt:{attract:[3,6],rate:[0.10,0.12],rent:[85,130],pull:[0.9,1.9]},
    hobby:{attract:[2,5],rate:[0.07,0.10],rent:[100,200],pull:[0.6,1.6]},
    kids:{attract:[2,5],rate:[0.08,0.10],rent:[110,220],pull:[0.7,1.6]},
    service:{attract:[1,3],rate:[0.09,0.13],rent:[70,140],pull:[0.5,1.1]},
    amuse:{attract:[3,6],rate:[0.09,0.11],rent:[130,240],pull:[0.8,1.9]},
    gms_food:{attract:[3,6],rate:[0.09,0.12],rent:[100,200],pull:[0.7,1.5]},
    gms_living:{attract:[3,6],rate:[0.08,0.11],rent:[90,190],pull:[0.6,1.4]},
  };
  const SIZE_ORDER=['S','M','L'], SIZE_W={S:0.46,M:0.34,L:0.20};

  function pickSize(r){ const x=r(); return x<SIZE_W.S?'S':(x<SIZE_W.S+SIZE_W.M?'M':'L'); }
  function pickFrom(arr,r){ return arr[Math.floor(r()*arr.length)]; }
  function range(lo,hi,r){ return lo+(hi-lo)*r(); }

  let genCount=0, gi=0;
  for (const cat in NAME_PARTS){
    const parts = NAME_PARTS[cat], stat = BASE_STAT[cat], facades = FACADE_POOL[cat];
    const combos = parts.pre.length*parts.suf.length;
    const target = (cat==='gms_food'||cat==='gms_living') ? 10 : 95;
    for (let i=0;i<target;i++){
      const idx = (gi*97 + i*13) % combos;
      const pi = Math.floor(idx/parts.suf.length), si = idx%parts.suf.length;
      const name = parts.pre[pi]+parts.suf[si];
      const id = 'p_'+cat+'_'+pi+'_'+si+'_'+i;
      const r = pgRng(pgHash(id));
      const size = pickSize(r);
      const sizeMul = size==='S'?0.75:(size==='M'?1.0:1.4);
      const attract = Math.round(clampNum(range(stat.attract[0],stat.attract[1],r)*(size==='L'?1.15:1),1,9));
      const rate = +range(stat.rate[0],stat.rate[1],r).toFixed(2);
      const minRent = Math.round(range(stat.rent[0],stat.rent[1],r)*sizeMul);
      const pull = +range(stat.pull[0],stat.pull[1],r).toFixed(2);
      const facade = pickFrom(facades,r);
      const demo = pickFrom(DEMO_POOL,r);
      TENANTS.push({ id, name, cat, size, attract, rate, minRent, pull, facade, demo, desc:name+'。'+CATS[cat].label+'業態の専門店。' });
      genCount++;
    }
    gi++;
  }
  function clampNum(v,a,b){ return v<a?a:(v>b?b:v); }
})();

// ============ 直営業態(自社出店) ============
// gross:粗利率 staff:人件費(万円/月) misc:売上比経費 fit:内装投資(万円)
const OWN_FORMATS = [
  { id:'own_book',  name:'ミライヤ書店',        cat:'hobby',   size:'L', attract:6, gross:0.32, staff:220, misc:0.05, fit:6000,  pull:2.4, facade:'warm', demo:'family', desc:'グループの書店業態。文具・児童書に強い。' },
  { id:'own_merry', name:'メリーファンタジー',   cat:'amuse',   size:'L', attract:7, gross:0.55, staff:320, misc:0.10, fit:9000,  pull:2.6, facade:'kids', demo:'family', desc:'キッズゲームパーク。土日の稼ぎ頭。' },
  { id:'own_rau',   name:'R.A.U',              cat:'variety', size:'M', attract:4, gross:0.34, staff:150, misc:0.05, fit:4200,  pull:1.3, facade:'glass', demo:'young_female', desc:'"あったらいいな"の生活雑貨直営。' },
  { id:'own_cafel', name:'カフェランテール',     cat:'cafe',    size:'S', attract:4, gross:0.62, staff:120, misc:0.07, fit:2600,  pull:1.3, facade:'warm', demo:'adult_female', desc:'直営カフェ&輸入食品。' },
  { id:'own_sports',name:'スポーツオーソリア(直営)', cat:'fashion', size:'L', attract:5, gross:0.33, staff:230, misc:0.05, fit:6800, pull:1.6, facade:'bold', demo:'young_male', desc:'スポーツ用品の直営運営版。' },
  { id:'own_100',   name:'ユメ100円プラザ',     cat:'variety', size:'L', attract:6, gross:0.36, staff:200, misc:0.05, fit:5200,  pull:2.3, facade:'bold',     desc:'直営100円ショップ。集客装置。' },
  { id:'own_bank',  name:'ユメ銀行',            cat:'service', size:'S', attract:3, gross:0.75, staff:140, misc:0.08, fit:3800,  pull:1.0, facade:'plain',    desc:'モール内銀行。ATMが来館理由になる。' },
  { id:'own_craft', name:'パンドラクラフト(直営)', cat:'hobby',  size:'M', attract:3, gross:0.40, staff:130, misc:0.05, fit:3400,  pull:0.9, facade:'warm', demo:'senior', desc:'手芸専門店の直営版。' },
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

// ============ 出店候補地(ゲーム開始時に1つ選択) ============
// stationWalkMin:最寄駅徒歩分 parkingCap:駐車場台数 cashStart/loanStart:開業時資金構成
// catchmentMul:商圏人口による需要係数 competitionLevel:周辺競合の強さ(0-3) expansion:増築余地の有無
// demoSkew:客層アーキタイプの人口構成の偏り(1.0基準)
const SITES = [
  { id:'station', name:'中央駅前地区',
    desc:'最寄駅から徒歩3分の再開発区画。電車で来る客が多く天候に左右されにくいが、地価が高く駐車場は手狭。競合の大型商業施設も近い。',
    stationWalkMin:3, parkingCap:6500, cashStart:75000, loanStart:6200000, catchmentMul:1.15, competitionLevel:3, expansion:false,
    demoSkew:{ kids_family:0.7, young_female:1.6, young_male:1.5, adult_female:1.2, adult_male:1.2, senior:0.8 } },
  { id:'suburb', name:'郊外バイパス沿い',
    desc:'幹線道路沿いの広大な土地。建築費が安く駐車場も大きく取れるが、最寄駅から遠く集客は車利用にほぼ依存する。',
    stationWalkMin:25, parkingCap:22000, cashStart:145000, loanStart:4400000, catchmentMul:1.00, competitionLevel:1, expansion:true,
    demoSkew:{ kids_family:1.6, young_female:0.9, young_male:0.9, adult_female:1.1, adult_male:1.0, senior:1.2 } },
  { id:'newtown', name:'ニュータウン中央地区',
    desc:'計画的に開発された住宅街の中心部。ファミリー層が厚く周辺の競合も少ない、伸び代のあるバランス型の立地。',
    stationWalkMin:12, parkingCap:14000, cashStart:110000, loanStart:4800000, catchmentMul:0.92, competitionLevel:1, expansion:true,
    demoSkew:{ kids_family:1.4, young_female:1.0, young_male:0.9, adult_female:1.2, adult_male:1.0, senior:1.3 } },
  { id:'redev', name:'工業跡地再開発区',
    desc:'旧工業団地の再開発地。地価が安く敷地も広いが、まだ知名度がなく商圏の質もこれから。うまく育てば化ける立地。',
    stationWalkMin:18, parkingCap:17500, cashStart:125000, loanStart:3900000,  catchmentMul:0.85, competitionLevel:2, expansion:true,
    demoSkew:{ kids_family:1.1, young_female:1.0, young_male:1.1, adult_female:1.0, adult_male:1.1, senior:1.1 } },
];

// ============ 催事イベント ============
const EVENTS = [
  { id:'hokkaido', name:'北海道物産展',        cost:4500,  days:7, mul:1.22, desc:'海鮮・スイーツの鉄板催事。1週間来館+22%' },
  { id:'gourmetfes',name:'ご当地グルメ祭',     cost:3500,  days:5, mul:1.18, desc:'全国のB級グルメ集結。5日間来館+18%' },
  { id:'heroshow', name:'キッズヒーローショー', cost:2200,  days:2, mul:1.45, desc:'週末セントラルコートが家族で埋まる。2日間+45%' },
  { id:'yurufes',  name:'ゆるキャラまつり',    cost:1800,  days:2, mul:1.30, desc:'県内ゆるキャラ大集合。2日間+30%' },
  { id:'idolevent',name:'ご当地アイドルLIVE',  cost:3000,  days:1, mul:1.85, desc:'1日限りの爆発力。転売対策はしっかり。' },
  { id:'kimonofair',name:'新春きもの初売り市', cost:2500,  days:4, mul:1.15, desc:'落ち着いた集客と高単価。4日間+15%' },
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
  BASE_VISITORS: 4500,     // 最低来館ベース(レイクタウン級複合施設)
  ATTRACT_COEF: 210,       // 集客力→来館係数
  ATTRACT_POW: 0.78,       // 逓減(区画数が桁違いに多いため強めに逓減)
  SAT_MUL: 1.90, SUN_MUL: 2.05, // 土日係数
  KANSHA_MUL: 1.32,        // 感謝デー(20/30日)
  OPEN_BOOST: [2.0, 1.7, 1.45], // グランドオープン3日間
  VACANCY_PENALTY: 0.07,   // 空床1区画あたり集客減点(区画数が多いため小さめ)
  COMMON_COST_MONTH: 22000,// 共用部管理費(万円/月)
  LOAN_INIT: 4800000,      // 借入残(万円・立地未選択時フォールバック)
  LOAN_PAY_MONTH: 22000,   // 元本返済(万円/月)
  LOAN_RATE_Y: 0.021,      // 年利
  CASH_INIT: 110000,       // 初期資金フォールバック
  RENT_CAL: 0.8,           // 実勢賃料係数(カタログ値×これ)
  FIT_DAYS: 14,            // 内装工事日数
  PROPERTY_TAX_Y: 0.007,   // 固定資産税・都市計画税(年率、投下資本ベースの簡易モデル)
  KEY_MONEY_MONTHS: 4,     // 保証金(敷金) = 最低保証賃料の何ヶ月分。契約時に受領、退店時に一部返還
  KEY_MONEY_RETURN: 0.6,   // 退店時に返還する割合(残りは償却分として収益計上)
  PARKING_PER_SPACE: 4.5,  // 駐車場1台あたりが1日に支えられる来館者数の目安(回転率込み)
  STATION_MUL_BASE: 1.30, STATION_MUL_PER_MIN: 0.022, STATION_MUL_MIN: 0.72, // 駅距離→来館係数
  COMPETITION_MUL: 0.055,  // 競合レベル1につき来館-5.5%
  EXPANSION_COST: 45000,   // 増築投資(万円、expansion:trueの立地のみ)
  EXPANSION_ATTRACT_BONUS: 35, // 増築後の集客力ボーナス
  PROMO_LEVELS: [ {c:0,m:1.0,label:'なし'}, {c:2000,m:1.05,label:'チラシ'}, {c:5000,m:1.11,label:'TVCM'}, {c:11000,m:1.18,label:'大型キャンペーン'} ],
};

const MALL_NAME = 'ユメモール';
const SAVE_KEY = 'yumemall_save_v2';

// ============ 複数棟コンプレックス構成(レイクタウン級の大規模化) ============
// kaze棟は既存の単一корриドー建物(原点中心)。outlet/mori棟を新設し橋で接続する。
const UNIT_PATTERN = [12,8,8,20,8,12,8,20,8,8,12,8,20,12,8,12];
const BUILDINGS = {
  kaze:   { label:'kaze棟',   originX:0,    originZ:0,   color:'#2a6ea8' },
  outlet: { label:'LakeTown OUTLET棟', originX:-360, originZ:-220,
            rows:[-80,-40,0,40,80], rowLen:260, floors:[1], color:'#1f8f6e' },
  mori:   { label:'mori棟',   originX:340,  originZ:-260,
            rows:[-100,-60,-20,20,60,100], rowLen:260, floors:[1], color:'#5a8f2a' },
};
// 橋(2点間を結ぶ歩行可能な直線通路)
const BRIDGES = [
  { id:'lakeside', name:'レイクサイドブリッジ', a:{x:-100,z:-140}, b:{x:-130,z:-9},  w:6 },
  { id:'center',   name:'センターブリッジ',     a:{x:104,z:0},     b:{x:340,z:-160}, w:6 },
  { id:'forest',   name:'フォレストブリッジ',   a:{x:-100,z:-160}, b:{x:340,z:-260}, w:6 },
];
