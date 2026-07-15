// ================= YUME MALL 3D engine (three.js r128) =================
'use strict';

const M3D = {
  scene:null, renderer:null, camera:null, orbit:null,
  mode:'orbit', floorView:0,
  gFloors:[null,null,null,null], gShellWalls:[null,null,null,null], gRoof:null, gOutside:null,
  unitGroups:{}, pickMeshes:[], npcs:[], carMesh:null, maxCars:110,
  player:{ x:90, z:0, y:0, f:1, yaw:Math.PI/2, pitch:0, vy:0 },
  keys:{}, joy:{ active:false, dx:0, dy:0 }, lookTouch:null, dragLook:null,
  escTexUp:null, escTexDown:null, eventBanner:null, texCache:{},
  clock:null, _running:false, container:null,

  FH:6, // 階高
  CORR_FRONT:5.4, // 通路中心から店舗ファサードまでの距離(通路の広さ)
  ESC: {
    W: { x0:-38, x1:-26, fLow:1, upZ:-1.7, dnZ:1.7 },
    E: { x0:26,  x1:38,  fLow:2, upZ:-1.7, dnZ:1.7 },
  },

  // ---------- helpers ----------
  box(w,h,d,mat,x,y,z,parent){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    m.position.set(x,y,z); (parent||this.scene).add(m); return m;
  },
  plane(w,h,mat,x,y,z,ry,parent){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
    m.position.set(x,y,z); m.rotation.y = ry||0; (parent||this.scene).add(m); return m;
  },
  texSign(text, bg, fg, opts){
    opts = opts||{};
    const key = text+'|'+bg+'|'+fg+'|'+(opts.sub||'');
    if (this.texCache[key]) return this.texCache[key];
    const W=opts.w||512, H=opts.h||128;
    const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
    const c = cv.getContext('2d');
    c.fillStyle=bg; c.fillRect(0,0,W,H);
    if (opts.border){ c.strokeStyle=opts.border; c.lineWidth=8; c.strokeRect(4,4,W-8,H-8); }
    c.fillStyle=fg; c.textAlign='center'; c.textBaseline='middle';
    let fs = opts.fs || 58;
    c.font = '700 '+fs+'px "Hiragino Sans","Yu Gothic",sans-serif';
    while (c.measureText(text).width > W-40 && fs>18){ fs-=4; c.font='700 '+fs+'px "Hiragino Sans","Yu Gothic",sans-serif'; }
    c.fillText(text, W/2, opts.sub? H*0.38 : H/2);
    if (opts.sub){ c.font='400 '+Math.round(fs*0.42)+'px sans-serif'; c.fillText(opts.sub, W/2, H*0.78); }
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    this.texCache[key]=t; return t;
  },
  signMat(text,bg,fg,opts){
    return new THREE.MeshBasicMaterial({ map:this.texSign(text,bg,fg,opts) });
  },
  litMat(hex){
    const key = 'lit|'+hex;
    if (!this._matCache) this._matCache={};
    if (!this._matCache[key]) this._matCache[key] = new THREE.MeshLambertMaterial({color:hex});
    return this._matCache[key];
  },
  basicMat(hex){
    const key = 'basic|'+hex;
    if (!this._matCache) this._matCache={};
    if (!this._matCache[key]) this._matCache[key] = new THREE.MeshBasicMaterial({color:hex});
    return this._matCache[key];
  },
  woodFloorMat(repX, repY){
    const key='woodplank';
    let tex=this.texCache[key];
    if (!tex){
      const cv=document.createElement('canvas'); cv.width=cv.height=128;
      const c=cv.getContext('2d');
      c.fillStyle='#cdae7f'; c.fillRect(0,0,128,128);
      const rows=6, rowH=128/rows;
      for (let r=0;r<rows;r++){
        const y=r*rowH, offset=(r%2)*32;
        c.fillStyle = r%2===0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
        c.fillRect(0,y,128,rowH);
        c.strokeStyle='rgba(104,76,44,0.55)'; c.lineWidth=1.4;
        c.beginPath(); c.moveTo(0,y); c.lineTo(128,y); c.stroke();
        for (let x=-offset; x<128; x+=64){
          c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+rowH); c.stroke();
          c.strokeStyle='rgba(255,255,255,0.12)';
          c.beginPath(); c.moveTo(x+10,y+rowH*0.35); c.lineTo(x+48,y+rowH*0.4); c.stroke();
          c.strokeStyle='rgba(104,76,44,0.55)';
        }
      }
      tex=new THREE.CanvasTexture(cv);
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      this.texCache[key]=tex;
    }
    const t2=tex.clone(); t2.needsUpdate=true; t2.wrapS=t2.wrapT=THREE.RepeatWrapping; t2.repeat.set(repX,repY);
    return new THREE.MeshLambertMaterial({map:t2});
  },
  menuBoardTex(name, accent){
    const key='menuboard|'+name+'|'+accent;
    if (this.texCache[key]) return this.texCache[key];
    const W=512,H=272;
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    const c=cv.getContext('2d');
    c.fillStyle='#161616'; c.fillRect(0,0,W,H);
    c.fillStyle=accent; c.fillRect(0,0,W,58);
    c.fillStyle='#ffffff'; c.textAlign='center'; c.textBaseline='middle';
    let fs=32; c.font='700 '+fs+'px "Hiragino Sans","Yu Gothic",sans-serif';
    while (c.measureText(name).width>W-30 && fs>16){ fs-=2; c.font='700 '+fs+'px "Hiragino Sans","Yu Gothic",sans-serif'; }
    c.fillText(name, W/2, 30);
    const cols=4, rows=2, pad=10, cw=(W-pad*(cols+1))/cols, ch=(H-58-pad*(rows+1))/rows;
    const photoPal=['#e0a24a','#c9573a','#7a9e4a','#d4b23a','#a85a8a','#5a9ea0','#c98a3a','#8a5a3a'];
    let pi=hashStr(name)%photoPal.length;
    for (let r=0;r<rows;r++) for (let ci=0;ci<cols;ci++){
      const x=pad+ci*(cw+pad), y=58+pad+r*(ch+pad);
      c.fillStyle=photoPal[pi%photoPal.length]; pi++;
      if (c.roundRect){ c.beginPath(); c.roundRect(x,y,cw,ch,5); c.fill(); } else c.fillRect(x,y,cw,ch);
      c.fillStyle='rgba(255,255,255,0.18)'; c.fillRect(x,y,cw,ch*0.4);
      c.fillStyle='rgba(0,0,0,0.35)'; c.fillRect(x,y+ch-16,cw,16);
      c.fillStyle='#ffffff'; c.font='600 12px sans-serif'; c.textAlign='left';
      c.fillText('¥'+(380+pi*30), x+4, y+ch-8);
      c.textAlign='center';
    }
    const tex=new THREE.CanvasTexture(cv);
    this.texCache[key]=tex;
    return tex;
  },
  floorMat(bg, line, repX, repY){
    const key = 'floor|'+bg+'|'+line;
    let tex = this.texCache[key];
    if (!tex){
      const cv=document.createElement('canvas'); cv.width=cv.height=128;
      const c=cv.getContext('2d');
      c.fillStyle=bg; c.fillRect(0,0,128,128);
      c.fillStyle='rgba(255,255,255,0.35)'; c.fillRect(0,0,64,64); c.fillRect(64,64,64,64);
      c.strokeStyle=line; c.lineWidth=3; c.strokeRect(1.5,1.5,125,125);
      tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      this.texCache[key]=tex;
    }
    const t2 = tex.clone(); t2.needsUpdate=true;
    t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
    t2.repeat.set(repX, repY);
    return new THREE.MeshLambertMaterial({ map:t2 });
  },

  // ---------- init ----------
  init(container){
    this.container = container;
    const w = container.clientWidth, h = container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfe4f5);
    this.scene.fog = new THREE.Fog(0xcfe4f5, 380, 820);
    this.camera = new THREE.PerspectiveCamera(52, w/h, 0.1, 900);
    this.camera.position.set(150, 130, 190);
    this.renderer = new THREE.WebGLRenderer({ antialias:true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(w,h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(-10, 8, 0);
    this.orbit.enableDamping = true; this.orbit.dampingFactor = 0.08;
    this.orbit.maxPolarAngle = Math.PI*0.495;
    this.orbit.minDistance = 14; this.orbit.maxDistance = 420;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8d897d, 0.72); this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.58); dir.position.set(90,140,60); this.scene.add(dir);

    this.MAT = {
      wall:   new THREE.MeshLambertMaterial({ color:0xf2eee5 }),
      wallIn: new THREE.MeshLambertMaterial({ color:0xf7f4ee }),
      accent: new THREE.MeshLambertMaterial({ color:0x8e2a6b }),
      corr:   new THREE.MeshLambertMaterial({ color:0xe9e4d9 }),
      unitFl: new THREE.MeshLambertMaterial({ color:0xf3efe6 }),
      roof:   new THREE.MeshLambertMaterial({ color:0xd6d2c8 }),
      dark:   new THREE.MeshLambertMaterial({ color:0x3a3a3c }),
      glass:  new THREE.MeshLambertMaterial({ color:0xaacfdd, transparent:true, opacity:0.38 }),
      sky:    new THREE.MeshLambertMaterial({ color:0xbfe0f5, transparent:true, opacity:0.45 }),
      shutter:new THREE.MeshLambertMaterial({ color:0xb7b2a8 }),
      esc:    new THREE.MeshLambertMaterial({ color:0x9aa0a8 }),
      rail:   new THREE.MeshLambertMaterial({ color:0xcfd6da, transparent:true, opacity:0.5 }),
      railBar:new THREE.MeshLambertMaterial({ color:0x777d82 }),
      lightP: new THREE.MeshBasicMaterial({ color:0xffffff }),
      asphalt:new THREE.MeshLambertMaterial({ color:0x8f8f8d }),
      grass:  new THREE.MeshLambertMaterial({ color:0xa8bd8e }),
      stage:  new THREE.MeshLambertMaterial({ color:0xc9b8d8 }),
      wood:   new THREE.MeshLambertMaterial({ color:0xb99a6b }),
      white:  new THREE.MeshLambertMaterial({ color:0xffffff }),
    };

    this.buildStatic();
    this.buildOutlet();
    this.buildMori();
    this.buildLakeAndBridges();
    this.buildAllUnits();
    this.buildOutside();
    this.initNPC();
    this.initInput();
    this.clock = new THREE.Clock();
    this.startLoop();
    window.addEventListener('resize', ()=>this.onResize());
  },
  onResize(){
    const w=this.container.clientWidth, h=this.container.clientHeight;
    this.camera.aspect=w/h; this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(w,h);
  },

  // ---------- 静的建物 ----------
  corridorSegs(f){
    if (f===1) return { full:[[-92,92]], strips:[] };
    if (f===2) return { full:[[-92,-38],[-26,-22],[22,92]], strips:[[-38,-26],[-22,22]] };
    return { full:[[-92,-22],[22,26],[38,92]], strips:[[-22,22],[26,38]] };
  },
  holesAt(f,x,z){
    if (Math.abs(z)>=2.6) return false;
    if (f===2) return (x>-38&&x<-26)||(x>-22&&x<22);
    if (f===3) return (x>-22&&x<22)||(x>26&&x<38);
    return false;
  },
  rampAt(x,z){
    for (const k of ['W','E']){
      const e = this.ESC[k];
      if (x>=e.x0-0.3 && x<=e.x1+0.3 && Math.abs(Math.abs(z)-1.7)<1.0){
        const t = THREE.MathUtils.clamp((x-e.x0)/(e.x1-e.x0),0,1);
        return (e.fLow-1)*6 + t*6;
      }
    }
    return null;
  },

  buildStatic(){
    const M=this.MAT, FH=this.FH;
    for (let f=1; f<=3; f++){ this.gFloors[f]=new THREE.Group(); this.scene.add(this.gFloors[f]); this.gShellWalls[f]=new THREE.Group(); this.scene.add(this.gShellWalls[f]); }
    this.gRoof = new THREE.Group(); this.scene.add(this.gRoof);

    const shopFloorMat = this.floorMat('#efe9dc', '#cfc6ae', 46, 3.5);
    const gmsFloorMat  = this.floorMat('#e7e2d3', '#c9c0a6', 8, 9);
    for (let f=1; f<=3; f++){
      const g=this.gFloors[f], y=(f-1)*FH;
      // 店舗ゾーン床
      this.box(184,0.4,14, shopFloorMat, 0, y-0.2, 11, g);
      this.box(184,0.4,14, shopFloorMat.clone(), 0, y-0.2, -11, g);
      this.box(34,0.4,36,  gmsFloorMat, -113, y-0.2, 0, g);  // GMS/シネマ棟
      this.box(4,0.4,36,   this.floorMat('#eef0ea','#c7ccc0',1,9),  -94, y-0.2, 0, g);
      this.box(8,0.4,36,   this.floorMat('#eef0ea','#c7ccc0',2,9),  96, y-0.2, 0, g);     // 東側ホール
      // 通路床(吹き抜け・ESC開口を避けて構築)
      const segs=this.corridorSegs(f);
      for (const s of segs.full) this.box(s[1]-s[0],0.4,8, this.floorMat('#eef0ea','#c7ccc0',(s[1]-s[0])/4,2),(s[0]+s[1])/2, y-0.2, 0, g);
      for (const s of segs.strips){
        const stripMat = this.floorMat('#eef0ea','#c7ccc0', Math.max(1,Math.round((s[1]-s[0])/4)), 1);
        this.box(s[1]-s[0],0.4,1.4, stripMat, (s[0]+s[1])/2, y-0.2, 3.3, g);
        this.box(s[1]-s[0],0.4,1.4, stripMat.clone(), (s[0]+s[1])/2, y-0.2, -3.3, g);
      }
      // 吹き抜け手すり(ガラス)
      if (f>=2){
        for (const s of segs.strips){
          const len=s[1]-s[0], cx=(s[0]+s[1])/2;
          for (const zz of [2.6,-2.6]){
            this.box(len,1.1,0.06, M.rail, cx, y+0.75, zz, g);
            this.box(len,0.07,0.1, M.railBar, cx, y+1.32, zz, g);
          }
        }
        const ends = f===2? [[-22,'cap'],[22,'cap']] : [[-22,'cap'],[22,'cap']];
        for (const [ex] of ends){
          this.box(0.06,1.1,5.2, M.rail, ex, y+0.75, 0, g);
          this.box(0.1,0.07,5.2, M.railBar, ex, y+1.32, 0, g);
        }
      }
      // 間仕切り壁+天井照明(インスタンス一括)
      const seq=[12,8,8,20,8,12,8,20,8,8,12,8,20,12,8,12];
      const bounds=[-92]; { let bx=-92; for(const w of seq){ bx+=w; bounds.push(bx); } }
      const parts=new THREE.InstancedMesh(new THREE.BoxGeometry(0.24,FH,14), M.wallIn, bounds.length*2);
      { let pi=0; const pm=new THREE.Matrix4();
        for (const zz of [11,-11]) for (const b of bounds){ pm.makeTranslation(b, y+FH/2, zz); parts.setMatrixAt(pi++, pm); } }
      g.add(parts);
      const lightPts=[];
      { let lx=-92; for (const w of seq){ lightPts.push([lx+w/2,11],[lx+w/2,-11]); lx+=w; } }
      for (let x=-88; x<=88; x+=12) lightPts.push([x,0]);
      const lights=new THREE.InstancedMesh(new THREE.PlaneGeometry(6,1.3), M.lightP, lightPts.length);
      { const lm=new THREE.Matrix4(); let li2=0;
        for (const [lx,lz] of lightPts){ lm.makeRotationX(-Math.PI/2); lm.setPosition(lx, y+FH-0.45, lz); lights.setMatrixAt(li2++, lm); } }
      g.add(lights);
      // ベンチ&植栽(インスタンス)
      const benchPts=[];
      for (let x=-80; x<=84; x+=24){ if (f>=2 && Math.abs(x)<40) continue; benchPts.push(x); }
      if (benchPts.length){
        const bm=new THREE.Matrix4();
        const benches=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,0.45,0.7), M.wood, benchPts.length);
        const pots=new THREE.InstancedMesh(new THREE.BoxGeometry(0.7,0.5,0.7), M.white, benchPts.length);
        const bushes=new THREE.InstancedMesh(new THREE.SphereGeometry(0.62,10,8), new THREE.MeshLambertMaterial({color:0x4e7d43}), benchPts.length);
        benchPts.forEach((x,i)=>{
          bm.makeTranslation(x, y+0.42, 2.9); benches.setMatrixAt(i,bm);
          bm.makeTranslation(x+3, y+0.45, -2.9); pots.setMatrixAt(i,bm);
          bm.makeTranslation(x+3, y+1.25, -2.9); bushes.setMatrixAt(i,bm);
        });
        g.add(benches); g.add(pots); g.add(bushes);
        // ゴミ箱ペア(可燃/資源)
        const binPts=benchPts.filter((_,i)=>i%2===0);
        if (binPts.length){
          const binsA=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22,0.2,0.62,10), new THREE.MeshLambertMaterial({color:0x3a6b4a}), binPts.length);
          const binsB=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22,0.2,0.62,10), new THREE.MeshLambertMaterial({color:0x3a5a8a}), binPts.length);
          binPts.forEach((x,i)=>{ bm.makeTranslation(x-1.6,y+0.31,2.9); binsA.setMatrixAt(i,bm); bm.makeTranslation(x-1.15,y+0.31,2.9); binsB.setMatrixAt(i,bm); });
          g.add(binsA); g.add(binsB);
        }
      }
      // 案内板(フロア中央付近に1〜2箇所、通路端に寄せて動線を塞がない位置)
      const kioskXs = f===1? [-40,50] : [-55,35];
      for (const kx of kioskXs){
        this.box(0.9,1.5,0.5, M.dark, kx, y+0.75, -3.5, g);
        this.plane(0.8,1.3, this.signMat((f)+'F MAP','#f5f2ea','#2a2016',{fs:44}), kx, y+1.5, -3.24, 0, g);
        this.plane(0.8,1.3, this.signMat((f)+'F MAP','#f5f2ea','#2a2016',{fs:44}), kx, y+1.5, -3.76, Math.PI, g);
      }
      // 天井の案内バナー(業種ウェイファインディング)
      const bannerTexts = ['◀ ファッション  レストラン ▶','◀ 雑貨・生活  カフェ ▶','◀ ホビー  サービス ▶'];
      for (let i=0;i<3;i++){
        const bx = -66 + i*66;
        this.plane(9,0.85, this.signMat(bannerTexts[i%bannerTexts.length], '#ffffff', '#5a4a3a', {fs:34,border:'#c9c2ae'}), bx, y+FH-1.0, 0, 0, g);
      }
    }

    // ===== エスカレーター =====
    const stepCv=document.createElement('canvas'); stepCv.width=64; stepCv.height=256;
    const sc=stepCv.getContext('2d'); sc.fillStyle='#b9bfc7'; sc.fillRect(0,0,64,256);
    sc.fillStyle='#8b9198'; for(let yy=0;yy<256;yy+=16) sc.fillRect(0,yy,64,7);
    this.escTexUp = new THREE.CanvasTexture(stepCv); this.escTexUp.wrapS=this.escTexUp.wrapT=THREE.RepeatWrapping; this.escTexUp.repeat.set(1,6);
    this.escTexDown = this.escTexUp.clone(); this.escTexDown.needsUpdate=true; this.escTexDown.wrapS=this.escTexDown.wrapT=THREE.RepeatWrapping; this.escTexDown.repeat.set(1,6);
    for (const k of ['W','E']){
      const e=this.ESC[k], g=this.gFloors[e.fLow+1];
      const len=Math.hypot(e.x1-e.x0, 6), ang=Math.atan2(6, e.x1-e.x0);
      for (const [zz,tex] of [[e.upZ,this.escTexUp],[e.dnZ,this.escTexDown]]){
        const beltMat = new THREE.MeshBasicMaterial({ map:tex });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(len,0.55,1.35), beltMat);
        belt.position.set((e.x0+e.x1)/2, (e.fLow-1)*6+3-0.28, zz);
        belt.rotation.z = ang; g.add(belt);
        for (const s of [-0.78,0.78]){
          const bal = new THREE.Mesh(new THREE.BoxGeometry(len+1.2,1.05,0.07), this.MAT.rail);
          bal.position.set((e.x0+e.x1)/2, (e.fLow-1)*6+3+0.62, zz+s);
          bal.rotation.z = ang; g.add(bal);
          const hr = new THREE.Mesh(new THREE.BoxGeometry(len+1.2,0.09,0.12), this.MAT.dark);
          hr.position.set((e.x0+e.x1)/2, (e.fLow-1)*6+3+1.2, zz+s);
          hr.rotation.z = ang; g.add(hr);
        }
      }
      const und = new THREE.Mesh(new THREE.BoxGeometry(len,0.5,3.6), this.MAT.wall);
      und.position.set((e.x0+e.x1)/2, (e.fLow-1)*6+2.5, 0); und.rotation.z=ang; g.add(und);
    }

    // ===== 1Fセントラルコート =====
    const g1=this.gFloors[1];
    const stage=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.6,0.45,24), this.MAT.stage);
    stage.position.set(0,0.23,0); g1.add(stage);
    this.eventBanner = this.plane(16,2.2, this.signMat('YUME MALL セントラルコート','#8e2a6b','#ffffff',{fs:46}), 0, 15.6, 0, 0, this.gFloors[3]);
    const banner2 = this.plane(16,2.2, this.signMat('YUME MALL セントラルコート','#8e2a6b','#ffffff',{fs:46}), 0, 15.6, -0.01, Math.PI, this.gFloors[3]);
    this.eventBanner2 = banner2;

    // ===== フードコート(3F東)実店舗を参考に作り込み =====
    const g3=this.gFloors[3];
    const FC_X0=44, FC_X1=90, FC_CX=(FC_X0+FC_X1)/2, FC_W=FC_X1-FC_X0;
    // 木目調の専用床
    this.box(FC_W,0.42,8, this.woodFloorMat(FC_W/2.2,3.6), FC_CX, 12-0.19, 0, g3);
    this.plane(20,2.4, this.signMat('FOOD COURT フードコート','#c0392b','#ffffff',{fs:44,w:768,h:100}), FC_CX, 12+5.35, 0, 0, g3);
    // 装飾柱(縦ルーバー+アクセントライト)2本
    for (const px of [FC_X0+6, FC_X1-6]){
      this.box(0.7,6,0.7, this.litMat(0x8a5a34), px, 12+3, -3.5, g3);
      for (let i=-3;i<=3;i++) this.box(0.08,5.6,0.06, this.litMat(i%2?0xc9702e:0xe8dcc6), px+i*0.09, 12+3, -3.12, g3);
      this.box(0.1,5.4,0.1, this.basicMat(0xff9a4a), px, 12+3, -3.34, g3);
    }
    { const dummy=new THREE.Object3D();
      // 丸テーブル+ツートン椅子4脚(背もたれ付き)
      const roundPos=[]; for (let x=FC_X0+3; x<=FC_X1-3; x+=8) roundPos.push([x,-2.4]);
      const tops=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.72,0.72,0.08,16), this.MAT.white, roundPos.length);
      const rlegs=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07,0.11,0.75,10), this.MAT.dark, roundPos.length);
      const chairColors=[0x3a6b9e,0x4a9e5f,0xc9573a,0xc9a03a];
      const chairSeatSets = chairColors.map(hex=>new THREE.InstancedMesh(new THREE.BoxGeometry(0.4,0.07,0.4), this.litMat(hex), roundPos.length));
      const chairBackSets = chairColors.map(hex=>new THREE.InstancedMesh(new THREE.BoxGeometry(0.4,0.42,0.06), this.litMat(hex), roundPos.length));
      const chairLegs=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025,0.03,0.43,6), this.MAT.dark, roundPos.length*4);
      let cli=0;
      const chairCounters=[0,0,0,0];
      roundPos.forEach(([x,zz],i)=>{
        dummy.position.set(x,12.78,zz); dummy.rotation.set(0,0,0); dummy.updateMatrix(); tops.setMatrixAt(i,dummy.matrix);
        dummy.position.set(x,12.39,zz); dummy.updateMatrix(); rlegs.setMatrixAt(i,dummy.matrix);
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx,dz],ci)=>{
          const px=x+dx*1.02, pz=zz+dz*1.02, ang=Math.atan2(dx,dz);
          const colorIdx=(i+ci)%4;
          const seatIdx=chairCounters[colorIdx]++;
          dummy.position.set(px,12.42,pz); dummy.rotation.set(0,ang,0); dummy.updateMatrix();
          chairSeatSets[colorIdx].setMatrixAt(seatIdx,dummy.matrix);
          dummy.position.set(px-dx*0.21,12.62,pz-dz*0.21); dummy.rotation.set(0,ang,0); dummy.updateMatrix();
          chairBackSets[colorIdx].setMatrixAt(seatIdx,dummy.matrix);
          dummy.position.set(px,12.19,pz); dummy.rotation.set(0,0,0); dummy.updateMatrix();
          chairLegs.setMatrixAt(cli++,dummy.matrix);
        });
      });
      g3.add(tops); g3.add(rlegs); g3.add(chairLegs);
      chairSeatSets.forEach(m=>g3.add(m)); chairBackSets.forEach(m=>g3.add(m));
      // ファミリー向け長方形テーブル+ベンチ2列
      const rectPos=[]; for (let x=FC_X0+7; x<=FC_X1-7; x+=10) rectPos.push([x,2.4]);
      const rTops=new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,0.08,0.9), this.MAT.white, rectPos.length);
      const rLegs=new THREE.InstancedMesh(new THREE.BoxGeometry(0.1,0.75,0.1), this.MAT.dark, rectPos.length*2);
      const rBench=new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,0.4,0.32), this.MAT.wood, rectPos.length*2);
      let rli=0, rbi=0;
      rectPos.forEach(([x,zz],i)=>{
        dummy.position.set(x,12.76,zz); dummy.rotation.set(0,0,0); dummy.updateMatrix(); rTops.setMatrixAt(i,dummy.matrix);
        for (const dx of [-0.7,0.7]){ dummy.position.set(x+dx,12.35,zz); dummy.updateMatrix(); rLegs.setMatrixAt(rli++,dummy.matrix); }
        for (const dz of [-0.62,0.62]){ dummy.position.set(x,12.42,zz+dz); dummy.updateMatrix(); rBench.setMatrixAt(rbi++,dummy.matrix); }
      });
      g3.add(rTops); g3.add(rLegs); g3.add(rBench);
      // 丸型ペンダント照明(3灯クラスター、実店舗を参考)
      const pendClusters=[]; for (let x=FC_X0+8; x<=FC_X1-8; x+=11) for (const zz of [-2.4,2.4]) pendClusters.push([x,zz]);
      const cords=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01,0.01,1.3,4), this.MAT.dark, pendClusters.length*3);
      const globes=new THREE.InstancedMesh(new THREE.SphereGeometry(0.16,12,10), this.basicMat(0xfff6e0), pendClusters.length*3);
      let pgi=0;
      pendClusters.forEach(([x,zz])=>{
        [-0.32,0,0.32].forEach(off=>{
          const gx=x+off, gy=16.55;
          dummy.position.set(gx,gy+0.65,zz); dummy.rotation.set(0,0,0); dummy.updateMatrix(); cords.setMatrixAt(pgi,dummy.matrix);
          dummy.position.set(gx,gy,zz); dummy.updateMatrix(); globes.setMatrixAt(pgi,dummy.matrix);
          pgi++;
        });
      });
      g3.add(cords); g3.add(globes);
      // 天井の斜めスラットパネル(実店舗のオレンジ×木目天井を参考)
      const slatPal=[0xc9702e,0xe0dcc9,0xb98a5a,0xd98a3a];
      const slatPts=[]; for (let x=FC_X0-2; x<=FC_X1+2; x+=2.2) for (let zr=0; zr<3; zr++) slatPts.push([x, -3+zr*3, (Math.random()-0.5)*0.5]);
      const slats=new THREE.InstancedMesh(new THREE.BoxGeometry(1.9,0.1,0.5), this.MAT.wood, slatPts.length);
      slatPts.forEach(([x,zz,rot],i)=>{ dummy.position.set(x,17.78,zz); dummy.rotation.set(0,rot,0); dummy.updateMatrix(); slats.setMatrixAt(i,dummy.matrix); });
      g3.add(slats);
      for (let i=0;i<slatPts.length;i+=3){
        const [x,zz]=slatPts[i];
        this.box(1.9,0.11,0.5, this.litMat(slatPal[i%slatPal.length]), x, 17.9, zz, g3);
      }
      // 中央の緑地アイランド
      const planterM = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.2,0.5,16), this.MAT.white);
      planterM.position.set(FC_CX,12.25,0); g3.add(planterM);
      for (let i=0;i<3;i++){
        const bush=new THREE.Mesh(new THREE.SphereGeometry(0.5-i*0.08,10,8), this.litMat(0x4e7d43));
        bush.position.set(FC_CX+(i-1)*0.5, 12.75+i*0.15, (i-1)*0.3); g3.add(bush);
      }
    }

    // ===== 外壁(階層別・カットアウェイ対応) =====
    const wallSegs = (f)=>{
      const y=(f-1)*FH+FH/2;
      const segs=[];
      if (f===1){
        segs.push({x0:-130,x1:4,z:-18},{x0:12,x1:100,z:-18});
        segs.push({x0:-130,x1:4,z:18},{x0:12,x1:100,z:18});
      } else {
        segs.push({x0:-130,x1:100,z:-18},{x0:-130,x1:100,z:18});
      }
      return segs;
    };
    for (let f=1; f<=3; f++){
      const gw=this.gShellWalls[f], y=(f-1)*FH+FH/2;
      for (const s of wallSegs(f)) this.box(s.x1-s.x0, FH, 0.5, this.MAT.wall, (s.x0+s.x1)/2, y, s.z, gw);
      // 西壁 / 東壁
      this.box(0.5, FH, 36, this.MAT.wall, -130, y, 0, gw);
      if (f===1){
        this.box(0.5, FH, 13, this.MAT.wall, 100, y, -11.5, gw);
        this.box(0.5, FH, 13, this.MAT.wall, 100, y, 11.5, gw);
        this.plane(10, 5.2, this.MAT.glass, 100, 2.8, 0, -Math.PI/2, gw); // 東正面ガラス
      } else {
        this.box(0.5, FH, 36, this.MAT.wall, 100, y, 0, gw);
      }
      // 窓帯(2/3F装飾)
      if (f>=2){
        for (const zz of [-18.3, 18.3]){
          this.box(180, 1.6, 0.1, this.MAT.dark, -15, y+0.6, zz, gw);
        }
      }
    }
    // 屋上
    const gr=this.gRoof;
    this.box(92,0.5,36, this.MAT.roof, -84, 18.25, 0, gr);
    this.box(62,0.5,36, this.MAT.roof, 69, 18.25, 0, gr);
    this.box(76,0.5,15, this.MAT.roof, 0, 18.25, -10.5, gr);
    this.box(76,0.5,15, this.MAT.roof, 0, 18.25, 10.5, gr);
    this.box(76,0.3,6, this.MAT.sky, 0, 18.3, 0, gr); // トップライト
    for (let i=0;i<7;i++) this.box(0.3,0.4,6, this.MAT.white, -33+i*11, 18.4, 0, gr);
    for (const [hx,hz,hw] of [[-90,8,6],[-60,-8,5],[-20,10,7],[30,-9,6],[70,7,5]]){
      this.box(hw,2.2,4, this.MAT.esc, hx, 19.4, hz, gr);
    }
    // パラペット&アクセント帯
    for (const zz of [-18,18]) this.box(230,1.4,0.5, this.MAT.accent, -15, 18.4, zz, gr);
    this.box(0.5,1.4,36, this.MAT.accent, -130, 18.4, 0, gr);
    this.box(0.5,1.4,36, this.MAT.accent, 100, 18.4, 0, gr);
    // 大型看板
    const bigLogo = this.signMat('YUME MALL ユメモール','#8e2a6b','#ffffff',{fs:64,w:1024,h:128});
    this.plane(46,5.4, bigLogo, -15, 14.5, -18.5, Math.PI, gr);
    this.plane(46,5.4, bigLogo, -15, 14.5, 18.5, 0, gr);
    this.plane(30,3.6, bigLogo, 100.4, 12.5, 0, Math.PI/2, gr);
    const towerG = new THREE.Group(); gr.add(towerG);
    this.box(5,22,1.2, this.MAT.white, 88, 11, -19.5, towerG);
    this.plane(4.4,18, this.signMat('ユ\nメ\nモ\ー\nル','#ffffff','#8e2a6b',{fs:70,w:128,h:512}), 88, 12, -20.2, Math.PI, towerG);
  },

  // ---------- outlet/mori棟(平屋の複数列構成) ----------
  buildRowShell(g, B, rowLocalZ, label, accentHex){
    const M=this.MAT;
    const rz = B.originZ+rowLocalZ;
    const cx = B.originX + B.rowLen/2;
    this.box(B.rowLen, 0.4, 36, this.woodFloorMat(B.rowLen/8, 4.5), cx, -0.2, rz, g);
    // 天井照明(インスタンス)
    const lightPts=[]; for (let x=B.originX+6; x<=B.originX+B.rowLen-6; x+=12) lightPts.push(x);
    const lights=new THREE.InstancedMesh(new THREE.PlaneGeometry(6,1.3), M.lightP, lightPts.length);
    { const lm=new THREE.Matrix4(); lightPts.forEach((x,i)=>{ lm.makeRotationX(-Math.PI/2); lm.setPosition(x,5.55,rz); lights.setMatrixAt(i,lm); }); }
    g.add(lights);
    // 屋根+外壁
    this.box(B.rowLen+1.6, 0.4, 37, M.roof, cx, 6.2, rz, g);
    this.box(0.4,6,37, M.wall, B.originX, 3, rz, g);
    this.box(0.4,6,37, M.wall, B.originX+B.rowLen, 3, rz, g);
    this.box(B.rowLen+0.4,6,0.4, M.wall, cx, 3, rz-18, g);
    this.box(B.rowLen+0.4,6,0.4, M.wall, cx, 3, rz+18, g);
    // アクセント帯+サイン(両端)
    this.box(B.rowLen+1.6,1.0,0.5, this.litMat(accentHex), cx, 6.6, rz-18.1, g);
    this.box(B.rowLen+1.6,1.0,0.5, this.litMat(accentHex), cx, 6.6, rz+18.1, g);
    this.plane(18,2.2, this.signMat(label, accentHex, '#ffffff', {fs:44,w:768,h:100}), cx, 4.9, rz-18.3, 0, g);
    this.plane(18,2.2, this.signMat(label, accentHex, '#ffffff', {fs:44,w:768,h:100}), cx, 4.9, rz+18.3, Math.PI, g);
    // 間仕切り(店舗境界の目安、インスタンス)
    const seq = SIM.genSeq(B.rowLen);
    const bounds=[B.originX]; { let bx=B.originX; for (const w of seq){ bx+=w; bounds.push(bx); } }
    const parts=new THREE.InstancedMesh(new THREE.BoxGeometry(0.2,6,14), M.wallIn, bounds.length*2);
    { const pm=new THREE.Matrix4(); let pi=0;
      for (const zz of [rz+11, rz-11]) for (const b of bounds){ pm.makeTranslation(b, 3, zz); parts.setMatrixAt(pi++, pm); } }
    g.add(parts);
  },
  buildOutlet(){
    const B = BUILDINGS.outlet, g=this.gFloors[1];
    B.rows.forEach(rz=>this.buildRowShell(g, B, rz, 'LakeTown OUTLET', '#1f8f6e'));
    // 連絡通路(南北)を各端に
    const zMin=B.originZ+Math.min(...B.rows)-18, zMax=B.originZ+Math.max(...B.rows)+18;
    for (const cxOff of [B.rowLen*0.12, B.rowLen*0.88]){
      const cx=B.originX+cxOff;
      this.box(5.2,0.4,zMax-zMin, this.floorMat('#eef0ea','#c7ccc0',2,Math.round((zMax-zMin)/8)), cx, -0.2, (zMin+zMax)/2, g);
      this.box(5.6,0.3,zMax-zMin, this.MAT.lightP, cx, 5.9, (zMin+zMax)/2, g);
    }
  },
  buildMori(){
    const B = BUILDINGS.mori, g=this.gFloors[1];
    B.rows.forEach(rz=>this.buildRowShell(g, B, rz, 'mori', '#3f7a1f'));
    const zMin=B.originZ+Math.min(...B.rows)-18, zMax=B.originZ+Math.max(...B.rows)+18;
    for (const cxOff of [B.rowLen*0.12, B.rowLen*0.88]){
      const cx=B.originX+cxOff;
      this.box(5.2,0.4,zMax-zMin, this.floorMat('#eaf2e4','#c3d4b6',2,Math.round((zMax-zMin)/8)), cx, -0.2, (zMin+zMax)/2, g);
      this.box(5.6,0.3,zMax-zMin, this.MAT.lightP, cx, 5.9, (zMin+zMax)/2, g);
    }
    // フォレストテーブル(mori北端のフードコート的休憩エリア)
    const fcRow = B.rows[2], fz = B.originZ+fcRow;
    const fcx = B.originX + B.rowLen*0.78;
    this.plane(14,1.8, this.signMat('FOREST TABLE','#3f7a1f','#ffffff',{fs:40}), fcx, 5.2, fz+18.2, 0, g);
    for (let i=0;i<4;i++){
      const tx=fcx-9+i*6;
      const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,0.07,12), this.MAT.white);
      tb.position.set(tx,0.78,fz+9); g.add(tb);
      this.box(0.08,0.78,0.08, this.MAT.dark, tx, 0.39, fz+9, g);
    }
  },
  buildLakeAndBridges(){
    const M=this.MAT;
    const lakeMat = new THREE.MeshLambertMaterial({ color:0x5aa0c8, transparent:true, opacity:0.92 });
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(440,180), lakeMat);
    lake.rotation.x = -Math.PI/2;
    lake.position.set(120, 0.02, -220);
    this.scene.add(lake);
    this.gLake = lake;
    // 橋
    for (const br of BRIDGES){
      const dx=br.b.x-br.a.x, dz=br.b.z-br.a.z, len=Math.hypot(dx,dz), ang=Math.atan2(dx,dz);
      const cx=(br.a.x+br.b.x)/2, cz=(br.a.z+br.b.z)/2;
      const deck=this.box(br.w, 0.5, len, this.MAT.wood, cx, -0.15, cz, this.scene);
      deck.rotation.y = ang;
      for (const side of [-1,1]){
        const rail=this.box(0.15, 1.1, len, this.MAT.railBar, cx+Math.cos(ang)*side*br.w/2, 0.55, cz-Math.sin(ang)*side*br.w/2, this.scene);
        rail.rotation.y = ang;
      }
      const mid=this.plane(3,0.9, this.signMat(br.name,'#ffffff','#2a6ea8',{fs:36}), cx, 1.4, cz, ang, this.scene);
    }
  },

  buildOutside(){
    const M=this.MAT; const g=new THREE.Group(); this.gOutside=g; this.scene.add(g);
    const ground = this.box(760,0.2,560, M.grass, 0, -0.35, 0, g);
    this.box(320,0.24,200, M.asphalt, -10, -0.3, 60, g);   // 南駐車場
    this.box(300,0.24,60, M.asphalt, -10, -0.3, -50, g);   // 北駐車場
    this.box(40,0.24,40, M.asphalt, 120, -0.3, 0, g);
    // 白線
    const lineGeo=new THREE.BoxGeometry(0.18,0.03,5.4);
    const lines=new THREE.InstancedMesh(lineGeo, new THREE.MeshBasicMaterial({color:0xe8e8e8}), 220);
    let li=0; const mtx=new THREE.Matrix4();
    for (let row=0; row<4; row++){
      const zc=30+row*18;
      for (let x=-120; x<=90 && li<220; x+=3.4){
        mtx.makeTranslation(x, -0.16, zc); lines.setMatrixAt(li++, mtx);
      }
    }
    lines.count=li; g.add(lines);
    // 車
    const carGeo=new THREE.BoxGeometry(2.0,1.35,4.6);
    const carMat=new THREE.MeshLambertMaterial({ color:0xffffff });
    this.carMesh=new THREE.InstancedMesh(carGeo, carMat, this.maxCars);
    const palette=[0xd8d8d8,0x2c2c34,0x8a1f2f,0x2d4a7a,0xc0c8cf,0x4c4c52,0x7d8a96,0xa63b52,0xffffff,0x1f6f5c];
    const col=new THREE.Color();
    this._carPos=[];
    let ci=0;
    for (let row=0; row<4 && ci<this.maxCars; row++){
      const zc=30+row*18+3.2;
      for (let x=-118.3; x<=90 && ci<this.maxCars; x+=3.4){
        if (Math.random()<0.25) continue;
        this._carPos.push([x+1.7, 0.55, zc + (row%2?9:0)]);
        ci++;
      }
    }
    for (let i=0;i<this._carPos.length;i++){
      const p=this._carPos[i];
      mtx.makeTranslation(p[0],p[1],p[2]); this.carMesh.setMatrixAt(i,mtx);
      col.setHex(palette[Math.floor(Math.random()*palette.length)]);
      this.carMesh.setColorAt(i,col);
    }
    this.carMesh.count = Math.floor(this._carPos.length*0.5);
    g.add(this.carMesh);
    // 植栽
    const trunkG=new THREE.CylinderGeometry(0.16,0.2,1.6,6);
    const crownG=new THREE.SphereGeometry(1.15,8,6);
    const trunks=new THREE.InstancedMesh(trunkG, M.wood, 40);
    const crowns=new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({color:0x557a45}), 40);
    for (let i=0;i<40;i++){
      const x=-140+Math.random()*280, z= (Math.random()<0.5? 24+Math.random()*8 : (Math.random()<0.5? -24-Math.random()*6 : 90+Math.random()*30));
      mtx.makeTranslation(x,0.8,z); trunks.setMatrixAt(i,mtx);
      mtx.makeTranslation(x,2.2,z); crowns.setMatrixAt(i,mtx);
    }
    g.add(trunks); g.add(crowns);
    // 入口キャノピー
    for (const [ex,ez,label] of [[8,-18,'南入口 SOUTH'],[8,18,'北入口 NORTH']]){
      const dirn = ez>0?1:-1;
      this.box(14,0.5,5, M.accent, ex, 4.9, ez+dirn*2.5, g);
      this.plane(9,1.4, this.signMat(label,'#ffffff','#8e2a6b',{fs:52}), ex, 3.6, ez+dirn*5.05, dirn>0?0:Math.PI, g);
      for (const px of [ex-6, ex+6]) this.box(0.4,4.7,0.4, M.dark, px, 2.35, ez+dirn*4.5, g);
    }
    this.box(16,0.6,7, M.accent, 100+3.5, 5.4, 0, g);
    this.plane(11,1.7, this.signMat('東入口 MAIN ENTRANCE','#ffffff','#8e2a6b',{fs:48}), 104, 4.1, 0, Math.PI/2, g); // 東
  },

  // ---------- 区画ビジュアル ----------
  buildAllUnits(){
    for (const u of SIM.st.units){
      if (u.bld && u.bld!=='kaze' && (u.kind==='shop'||u.kind==='fc')) u._lod='far';
      this.refreshUnit(u);
    }
  },
  updateLOD(){
    const cx=this.camera.position.x, cz=this.camera.position.z;
    for (const u of SIM.st.units){
      if (!u.bld || u.bld==='kaze' || (u.kind!=='shop'&&u.kind!=='fc')) continue;
      const ux=(u.x0+u.x1)/2, uz=u.rowZ||0;
      const d = Math.hypot(cx-ux, cz-uz);
      const want = d<80 ? 'near' : 'far';
      if (u._lod!==want){ u._lod=want; this.refreshUnit(u); }
    }
  },
  refreshUnit(u){
    const old=this.unitGroups[u.id];
    if (old){ old.parent.remove(old); this.disposeGroup(old); const pi=this.pickMeshes.findIndex(m=>m.userData.uid===u.id); if(pi>=0){ this.pickMeshes.splice(pi,1); } }
    const g = new THREE.Group();
    this.gFloors[u.floor].add(g);
    this.unitGroups[u.id]=g;
    const y=(u.floor-1)*this.FH;
    if (u.kind==='gms' || u.kind==='cinema') this.buildAnchor(u,g,y);
    else if (u.kind==='ent') this.buildEntranceUnit(u,g,y);
    else this.buildShopUnit(u,g,y);
    // ピッキング用
    if (u.kind!=='ent'){
      const w = u.kind==='gms'||u.kind==='cinema' ? 34 : u.w;
      const cx = u.kind==='gms'||u.kind==='cinema' ? -113 : (u.x0+u.x1)/2;
      const cz = u.kind==='gms'||u.kind==='cinema' ? 0 : (u.rowZ||0) + (u.side==='N'? 11 : -11);
      const d = u.kind==='gms'||u.kind==='cinema' ? 36 : 14;
      const pm=new THREE.Mesh(new THREE.BoxGeometry(w, this.FH-0.5, d), new THREE.MeshBasicMaterial({visible:false}));
      pm.position.set(cx, y+this.FH/2, cz);
      pm.userData.uid=u.id; g.add(pm); this.pickMeshes.push(pm);
    }
  },
  disposeGroup(g){
    g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  },
  catColor(cat){ return CATS[cat]? CATS[cat].color : '#666666'; },

  FACADE_PALETTES: {
    glass:    ['#33424f','#274a63','#3a3a3a','#2d5c4a'],
    bold:     ['#e0212f','#0a63c9','#e08c14','#159e5e'],
    boutique: ['#c9a63d','#b56b8f','#7d6bb5','#3d8f8f'],
    warm:     ['#8a5a34','#a9734a','#6b4423','#b8925c'],
    kids:     ['#ff8fb3','#5fb8ff','#ffc94d','#7bd48a'],
    noren:    ['#7a1f1f','#1f4a2f','#2f2f6b','#6b3a1f'],
    stall:    ['#d4382c','#c98a12','#2c7dd4','#2f9a55'],
    tech:     ['#00d4b8','#e0208f','#7a2fe0','#1fa0e0'],
    plain:    ['#6a6a6a','#5a7a8a','#7a6a5a','#5a6a5a'],
    kuzefuku: ['#c9a24a','#b8923f','#d4ae54','#a8863a'],
    drug:     ['#d81b6b','#e0207a','#c9155e','#e8407f'],
  },
  tenantAccent(t, facade){
    const pal = this.FACADE_PALETTES[facade] || this.FACADE_PALETTES.plain;
    const h = hashStr((t.tid||t.fid||t.name||'x')+(facade||''));
    return pal[h % pal.length];
  },

  buildShopUnitSimple(u,g,y){
    // LOD遠景版: 安価な看板ボックスのみ(店構えの作り込みは近くに寄った時だけ)
    const M=this.MAT;
    const rz=u.rowZ||0;
    const cx=(u.x0+u.x1)/2, front = rz+(u.side==='N'? this.CORR_FRONT : -this.CORR_FRONT), dirn = u.side==='N'? 1 : -1;
    const faceRy = u.side==='N'? Math.PI : 0;
    if (u.state==='open' && u.ten){
      const col = this.catColor(u.ten.cat);
      this.box(u.w-0.3, 4.2, 0.2, this.litMat(col), cx, y+2.2, front+dirn*0.08, g);
    } else if (u.state==='fitting'){
      this.box(u.w-0.3, 4.2, 0.2, this.litMat(0xcfcac0), cx, y+2.2, front+dirn*0.08, g);
    } else {
      this.box(u.w-0.3, 4.2, 0.1, M.shutter, cx, y+2.2, front+dirn*0.08, g);
    }
  },
  buildShopUnit(u,g,y){
    if (u._lod==='far'){ this.buildShopUnitSimple(u,g,y); return; }
    const M=this.MAT;
    const rz=u.rowZ||0;
    const cx=(u.x0+u.x1)/2, front = rz+(u.side==='N'? this.CORR_FRONT : -this.CORR_FRONT), dirn = u.side==='N'? 1 : -1;
    const faceRy = u.side==='N'? Math.PI : 0;
    if (u.state==='open' && u.ten){
      const t = u.ten;
      const col = this.catColor(t.cat);
      const facade = t.facade || 'plain';
      const accent = this.tenantAccent(t, facade);
      const ctx = { u,g,y,cx,front,dirn,faceRy,col,accent,t,M };
      const fn = this.FACADE_BUILDERS[facade] || this.FACADE_BUILDERS.plain;
      fn.call(this, ctx);
      if (u.kind==='fc'){
        this.box(u.w-1.2, 1.05, 1.3, M.white, cx, y+0.53, front+dirn*1.4, g);
        this.plane(u.w-1.5, 0.8, this.signMat('MENU','#333333','#ffffff',{fs:40}), cx, y+3.3, front+dirn*1.2, faceRy, g);
      }
    } else if (u.state==='fitting'){
      this.plane(u.w-0.3, 4.4, this.signMat('近日OPEN', '#ffffff', '#8e2a6b', {fs:64, sub:u.ten?u.ten.name:'', border:'#8e2a6b'}), cx, y+2.35, front+dirn*0.05, faceRy, g);
    } else {
      // 空床: シャッター + 募集
      this.box(u.w-0.3, 4.3, 0.1, M.shutter, cx, y+2.2, front+dirn*0.06, g);
      this.plane(Math.min(u.w-1,6), 1.5, this.signMat('テナント募集','#f5f5f2','#c0392b',{fs:58,border:'#c0392b'}), cx, y+2.4, front+dirn*0.14, faceRy, g);
    }
  },

  // ---- 店構えアーキタイプ別ビルダー群 ----
  storeGlass(ctx, gw){
    const { u,g,y,cx,front,dirn,M } = ctx;
    const w = gw!=null ? gw : u.w*0.29;
    this.box(w, 3.6, 0.08, M.glass, u.x0+0.35+w/2, y+1.8, front+dirn*0.04, g);
    this.box(w, 3.6, 0.08, M.glass, u.x1-0.35-w/2, y+1.8, front+dirn*0.04, g);
  },
  storeInterior(ctx, shelfLerp, kind){
    const { u,g,y,cx,front,dirn,faceRy,col,accent,M } = ctx;
    const lerpAmt = shelfLerp!=null?shelfLerp:0.72;
    const inMatHex = '#'+new THREE.Color(col).lerp(new THREE.Color(0xffffff), lerpAmt).getHexString();
    const inMat = this.litMat(inMatHex);
    const accMat = this.litMat(accent||col);
    const backHex = '#'+new THREE.Color(col).lerp(new THREE.Color(0xffffff),0.35).getHexString();
    this.plane(u.w-1, 3.2, this.basicMat(backHex), cx, y+2.4, front+dirn*12.5, faceRy+Math.PI, g);
    if (kind==='rack'){ // 洋服ラック
      for (const off of [-0.22,0.22]){
        const rx=cx+u.w*off;
        this.box(1.5,0.05,0.34, M.dark, rx, y+1.55, front+dirn*5.6, g);
        for (let i=-1;i<=1;i++) this.box(0.24,0.5,0.16, accMat, rx+i*0.42, y+1.15, front+dirn*5.6, g);
      }
    } else if (kind==='gondola'){ // 陳列棚
      for (let row=0; row<2; row++){
        const rz=front+dirn*(4.4+row*3.0);
        this.box(u.w*0.6, 1.35, 0.55, inMat, cx, y+0.7, rz, g);
        for (let i=0;i<3;i++) this.box(0.42,0.2,0.5, accMat, cx-u.w*0.2+i*u.w*0.2, y+1.32, rz, g);
      }
    } else if (kind==='case'){ // ショーケース(ベーカリー等)
      this.box(u.w*0.6, 1.0, 0.7, M.glass, cx, y+0.55, front+dirn*4.2, g);
      this.box(u.w*0.6, 0.08, 0.7, inMat, cx, y+0.16, front+dirn*4.2, g);
      for (let i=0;i<4;i++){
        const bun=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6), accMat);
        bun.position.set(cx-u.w*0.2+i*u.w*0.14, y+0.37, front+dirn*4.2); bun.scale.set(1,0.6,1); g.add(bun);
      }
    } else if (kind==='cube'){ // カラフルキューブ什器
      for (let i=0;i<3;i++){
        this.box(0.7,0.7,0.6, i%2? accMat: inMat, u.x0+0.85+i*(u.w-1.7)/2, y+0.4, front+dirn*4.6, g);
      }
    } else if (kind==='counter'){
      this.box(u.w*0.5, 1.0, 0.55, inMat, cx, y+0.5, front+dirn*2.7, g);
      this.box(u.w*0.5, 0.06, 0.55, accMat, cx, y+1.02, front+dirn*2.7, g);
    } else if (kind==='island'){ // 中央木製陳列アイランド(久世福商店風)
      const woodMat = this.litMat('#8a6a3a');
      this.box(1.0,1.7,1.0, woodMat, cx, y+0.85, front+dirn*6.5, g);
      for (let lv=0; lv<3; lv++){
        this.box(1.4,0.06,1.4, accMat, cx, y+0.35+lv*0.5, front+dirn*6.5, g);
      }
      for (const [dx,dz] of [[-0.9,0],[0.9,0],[0,-0.9],[0,0.9]]){
        this.box(0.7,1.1,0.4, inMat, cx+dx, y+0.55, front+dirn*6.5+dz, g);
      }
    } else {
      this.box(u.w*0.55, 1.25, 0.9, inMat, cx, y+0.63, front+dirn*4, g);
      this.box(u.w*0.55, 1.25, 0.9, inMat, cx, y+0.63, front+dirn*7.5, g);
    }
  },
  storeBladeSign(ctx, bg, fg){
    const { u,g,y,cx,front,dirn,t } = ctx;
    const bx = u.x0 + Math.min(1.6, u.w*0.18);
    const bm = this.signMat(t.name, bg, fg, {fs:44, w:256, h:256});
    const blade = this.plane(1.5, 1.5, bm, bx, y+3.5, front+dirn*0.75, Math.PI/2, g);
    blade.rotation.y = dirn>0 ? Math.PI/2 : -Math.PI/2;
    this.box(0.08, 1.7, 0.08, this.MAT.dark, bx, y+3.5, front+dirn*0.05, g);
  },
  FACADE_BUILDERS: {
    // モダンガラス張り(生活雑貨・靴・大型店)
    glass(ctx){
      const { u,g,y,cx,front,dirn,faceRy,col,accent,t,M } = ctx;
      this.plane(u.w-0.7, 1.15, this.signMat(t.name, col, '#ffffff', {fs:56}), cx, y+4.7, front+dirn*0.03, faceRy, g);
      this.box(u.w-0.4, 0.14, 0.3, this.litMat(accent), cx, y+4.05, front+dirn*0.1, g);
      this.box(u.w-0.5, 3.9, 0.06, M.glass, cx, y+1.95, front+dirn*0.06, g);
      this.box(0.12, 3.9, 0.12, this.litMat(accent), u.x0+0.3, y+1.95, front+dirn*0.08, g);
      this.box(0.12, 3.9, 0.12, this.litMat(accent), u.x1-0.3, y+1.95, front+dirn*0.08, g);
      this.storeInterior(ctx, 0.72, 'gondola');
    },
    // 元気カラーブロック(ディスカウント・スポーツ・家電)
    bold(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      this.box(u.w-0.3, 1.5, 0.28, this.litMat(accent), cx, y+3.95, front+dirn*0.08, g);
      this.plane(u.w-0.8, 1.05, this.signMat(t.name, accent, '#ffffff', {fs:54}), cx, y+3.95, front+dirn*0.23, faceRy, g);
      this.box(u.w*0.5, 0.35, 0.3, M.white, u.x0+u.w*0.27, y+3.15, front+dirn*0.1, g).rotation.z = dirn*0.12;
      this.storeGlass(ctx);
      this.storeInterior(ctx, 0.65, 'gondola');
    },
    // 上品なブティック(レディース・雑貨)
    boutique(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      this.box(u.w-0.6, 0.1, 0.22, this.litMat(accent), cx, y+4.15, front+dirn*0.08, g);
      this.box(u.w-0.6, 0.1, 0.22, this.litMat(accent), cx, y+1.35, front+dirn*0.08, g);
      this.plane(u.w-1.2, 0.9, this.signMat(t.name, '#f7f3ea', accent, {fs:44}), cx, y+4.55, front+dirn*0.03, faceRy, g);
      this.box(u.w-0.5, 3.9, 0.06, M.glass, cx, y+1.95, front+dirn*0.06, g);
      // マネキン(トルソー)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.4,1.0,10), this.litMat(0xe8e0d0));
      torso.position.set(cx-u.w*0.18, y+1.35, front+dirn*3.5); g.add(torso);
      const tstand = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.85,8), M.dark);
      tstand.position.set(cx-u.w*0.18, y+0.42, front+dirn*3.5); g.add(tstand);
      this.storeBladeSign(ctx, '#f7f3ea', accent);
      this.storeInterior(ctx, 0.8, 'rack');
    },
    // 木目の温かいカフェ・パン屋
    warm(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      const awn = this.box(u.w-0.2, 0.12, 1.4, this.litMat(accent), cx, y+3.55, front+dirn*0.8, g);
      awn.rotation.x = dirn>0 ? -0.28 : 0.28;
      this.plane(u.w-1.2, 0.85, this.signMat(t.name, accent, '#fff7ea', {fs:42}), cx, y+4.05, front+dirn*0.05, faceRy, g);
      this.storeGlass(ctx, u.w*0.34);
      // 屋外の小さな丸テーブル
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,12), M.white);
      tb.position.set(cx+u.w*0.22, y+0.75, front+dirn*2.6); g.add(tb);
      this.box(0.06,0.7,0.06, M.dark, cx+u.w*0.22, y+0.4, front+dirn*2.6, g);
      this.storeBladeSign(ctx, accent, '#fff7ea');
      this.storeInterior(ctx, 0.68, 'case');
    },
    // カラフル・キッズ向け
    kids(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      const stripeMats = [this.litMat(accent), M.white];
      for (let i=0;i<Math.floor((u.w-0.4)/1.0);i++){
        const sx = u.x0+0.3+i*1.0+0.5;
        this.box(0.9, 1.3, 0.22, stripeMats[i%2], sx, y+3.85, front+dirn*0.08, g);
      }
      this.plane(u.w-1, 1.0, this.signMat(t.name, '#ffffff', accent, {fs:50,border:accent}), cx, y+4.55, front+dirn*0.15, faceRy, g);
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,10), this.litMat(accent));
      blob.position.set(u.x0+0.7, y+0.5, front+dirn*3.2); blob.scale.set(1,0.85,1); g.add(blob);
      this.storeGlass(ctx);
      this.storeInterior(ctx, 0.75, 'cube');
    },
    // 暖簾のかかる和食・中華レストラン
    noren(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      this.plane(u.w-0.7, 1.1, this.signMat(t.name, '#2a2016', '#f0d99a', {fs:48}), cx, y+4.6, front+dirn*0.03, faceRy, g);
      this.box(u.w-0.4, 0.16, 0.3, M.dark, cx, y+4.0, front+dirn*0.1, g);
      const norenMat = new THREE.MeshLambertMaterial({color:accent, side:THREE.DoubleSide});
      const halfW = (u.w-1.4)/2;
      this.plane(halfW, 1.5, norenMat, cx-halfW/2-0.15, y+3.05, front+dirn*0.5, faceRy, g);
      this.plane(halfW, 1.5, norenMat, cx+halfW/2+0.15, y+3.05, front+dirn*0.5, faceRy, g);
      this.box(u.w-0.6, 0.08, 0.08, M.dark, cx, y+3.78, front+dirn*0.5, g);
      // ちょうちん
      const lant = new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8), this.litMat(0xc0392b));
      lant.scale.set(1,1.3,1); lant.position.set(u.x1-0.7, y+3.3, front+dirn*0.7); g.add(lant);
      this.storeGlass(ctx, u.w*0.22);
      this.storeInterior(ctx, 0.55, 'counter');
    },
    // フードコートの開放型店舗(実店舗のバックライトメニュー看板を参考)
    stall(ctx){
      const { u,g,y,cx,front,dirn,faceRy,col,accent,t,M } = ctx;
      // 上部ファサード(ブランドカラーの帯+店名)
      this.box(u.w-0.3, 0.7, 0.22, this.litMat(accent), cx, y+4.55, front+dirn*0.09, g);
      this.plane(u.w-0.9, 0.5, this.signMat(t.name, accent, '#ffffff', {fs:34}), cx, y+4.55, front+dirn*0.21, faceRy, g);
      // バックライト式メニューボード(実物のフード写真グリッド看板を再現、幅は区画サイズに関わらず一定)
      const menuMat = new THREE.MeshBasicMaterial({ map: this.menuBoardTex(t.name, accent) });
      const menuW = Math.min(u.w-1.1, 4.6), menuH = menuW*0.53;
      this.plane(menuW, menuH, menuMat, cx, y+3.55, front+dirn*0.14, faceRy, g);
      this.box(menuW+0.15, 0.06, 0.06, M.dark, cx, y+3.55+menuH/2+0.05, front+dirn*0.2, g);
      // カウンター
      this.box(u.w-0.5, 1.1, 0.7, this.litMat(accent), cx, y+0.55, front+dirn*3.3, g);
      this.box(u.w-0.5, 0.08, 0.7, M.white, cx, y+1.11, front+dirn*3.3, g);
      // レジ機っぽいアクセント
      this.box(0.32,0.28,0.28, M.dark, cx-u.w*0.28, y+1.28, front+dirn*3.15, g);
      const lp = this.plane(u.w-1.4, 0.4, M.lightP, cx, y+4.85, front+dirn*1.6, 0, g); lp.rotation.x = Math.PI/2;
      this.storeInterior(ctx, 0.6, 'counter');
    },
    // ダーク×ネオン(ホビー・ゲーム・携帯)
    tech(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      this.box(u.w-0.4, 1.3, 0.2, this.litMat(0x1c1c22), cx, y+4.1, front+dirn*0.06, g);
      const neonMat = this.basicMat(accent);
      this.box(u.w-0.4, 0.06, 0.14, neonMat, cx, y+3.5, front+dirn*0.12, g);
      this.box(u.w-0.4, 0.06, 0.14, neonMat, cx, y+4.7, front+dirn*0.12, g);
      this.plane(u.w-1, 0.9, this.signMat(t.name, '#1c1c22', accent, {fs:46}), cx, y+4.1, front+dirn*0.13, faceRy, g);
      this.storeGlass(ctx);
      // 店内の画面っぽい光
      for (let i=0;i<3;i++){
        const sx = u.x0 + u.w*(0.22+i*0.28);
        this.plane(1.0, 0.65, neonMat, sx, y+1.9, front+dirn*11, faceRy+Math.PI, g);
      }
      this.storeBladeSign(ctx, '#1c1c22', accent);
      this.storeInterior(ctx, 0.4, 'gondola');
    },
    // シンプル・サービス業態
    plain(ctx){
      const { u,g,y,cx,front,dirn,faceRy,col,accent,t,M } = ctx;
      this.plane(u.w-0.8, 0.95, this.signMat(t.name, col, '#ffffff', {fs:50}), cx, y+4.45, front+dirn*0.03, faceRy, g);
      this.box(u.w-0.5, 2.6, 0.06, M.glass, cx, y+1.4, front+dirn*0.06, g);
      this.box(u.w-0.6, 1.1, 0.7, this.litMat(accent), cx, y+0.55, front+dirn*2.2, g);
      this.storeInterior(ctx, 0.78, 'counter');
    },
    // 高級和風食品・雑貨店(久世福商店を参考): 濃紺×木目×金看板、中央木製アイランド什器
    kuzefuku(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      const navy = this.litMat('#1c2233');
      this.box(u.w-0.3, 1.7, 0.24, navy, cx, y+4.25, front+dirn*0.08, g);
      this.box(u.w-0.9, 0.06, 0.3, this.litMat(accent), cx, y+4.75, front+dirn*0.18, g);
      this.box(u.w-0.9, 0.06, 0.3, this.litMat(accent), cx, y+3.75, front+dirn*0.18, g);
      this.plane(u.w-1.3, 0.85, this.signMat(t.name, '#1c2233', accent, {fs:38}), cx, y+4.25, front+dirn*0.22, faceRy, g);
      // 木の梁(軒先)
      for (let i=-2;i<=2;i++) this.box(0.14,0.14,1.2, this.litMat('#6b4a28'), cx+i*u.w*0.18, y+3.3, front+dirn*0.55, g).rotation.x=0.05;
      this.storeGlass(ctx, u.w*0.32);
      // 紺の暖簾(片側)
      const norenMat = new THREE.MeshLambertMaterial({color:'#1c3a5e', side:THREE.DoubleSide});
      this.plane(u.w*0.16, 1.3, norenMat, u.x1-u.w*0.14, y+2.55, front+dirn*0.5, faceRy, g);
      // ペンダント照明
      for (const off of [-0.25,0.25]){
        const px=cx+u.w*off;
        this.box(0.03,0.9,0.03, M.dark, px, y+4.0, front+dirn*4.5, g);
        const shade=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.22,10), this.litMat('#e8dcc0'));
        shade.position.set(px, y+3.5, front+dirn*4.5); g.add(shade);
      }
      this.storeBladeSign(ctx, '#1c2233', accent);
      this.storeInterior(ctx, 0.55, 'island');
    },
    // ドラッグストア(マゼンタ帯+明るい照明+陳列棚を参考)
    drug(ctx){
      const { u,g,y,cx,front,dirn,faceRy,accent,t,M } = ctx;
      this.box(u.w-0.2, 1.1, 0.22, this.litMat(accent), cx, y+4.45, front+dirn*0.09, g);
      this.plane(u.w-0.8, 0.85, this.signMat(t.name, accent, '#ffffff', {fs:44}), cx, y+4.45, front+dirn*0.22, faceRy, g);
      this.box(u.w-0.5, 3.6, 0.06, M.glass, cx, y+1.9, front+dirn*0.06, g);
      // 明るい照明(通常より多め)
      for (let i=0;i<3;i++){
        const lp=this.plane(1.6,0.5, M.lightP, u.x0+1.2+i*(u.w-2.4)/2, y+4.9, front+dirn*4, 0, g); lp.rotation.x=Math.PI/2;
      }
      // 入口脇のカゴ置き場
      const basketMat=this.litMat('#2a2a2a');
      for (let i=0;i<3;i++){
        const bk=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.18,0.3,8), basketMat);
        bk.position.set(u.x0+0.5+i*0.34, y+0.4, front+dirn*1.6); g.add(bk);
      }
      this.storeBladeSign(ctx, accent, '#ffffff');
      this.storeInterior(ctx, 0.82, 'gondola');
    },
  },

  buildEntranceUnit(u,g,y){
    const M=this.MAT, dirn = u.side==='N'? 1 : -1;
    const cx=(u.x0+u.x1)/2;
    this.plane(u.w-1, 1.1, this.signMat(u.side==='N'?'北入口':'南入口', '#2e6e4e', '#ffffff', {fs:56}), cx, y+4.7, (dirn>0?4:-4)+dirn*0.03, u.side==='N'?Math.PI:0, g);
    this.plane(3.5, 4.2, M.glass, cx, y+2.2, dirn*17.8, u.side==='N'?Math.PI:0, g);
  },

  buildAnchor(u,g,y){
    const M=this.MAT;
    const faceX=-96;
    // 前面壁(通路側開口)
    this.box(0.4,this.FH,13, M.wall, faceX, y+this.FH/2, -11.5, g);
    this.box(0.4,this.FH,13, M.wall, faceX, y+this.FH/2, 11.5, g);
    this.box(0.4,1.6,10, M.wall, faceX, y+this.FH-0.8, 0, g);
    if (u.kind==='gms'){
      const t=u.ten;
      this.plane(13,1.3, this.signMat(t?t.name:'ユメスタイル', '#8e2a6b', '#ffffff', {fs:52,w:1024,h:112}), faceX+0.25, y+4.6, 0, Math.PI/2*-1+Math.PI, g);
      // 店内什器(インスタンス)
      const shelfMat=new THREE.MeshLambertMaterial({color: u.floor===1?0xd8e6d0:0xead9d0});
      { const sPos=[];
        for (let row=0; row<5; row++) for (let cxx=-124; cxx<=-102; cxx+=6) sPos.push([cxx,-12+row*6]);
        const sm=new THREE.Matrix4();
        const shelves=new THREE.InstancedMesh(new THREE.BoxGeometry(4.2,1.5,1.1), shelfMat, sPos.length);
        sPos.forEach(([sx,sz],i)=>{ sm.makeTranslation(sx, y+0.75, sz); shelves.setMatrixAt(i,sm); });
        g.add(shelves);
      }
      const lp=this.plane(28,10, M.lightP, -113, y+this.FH-0.4, 0, 0, g); lp.rotation.x=Math.PI/2;
      if (u.floor===1){
        for (let i=0;i<4;i++) this.box(2.2,1.0,1.0, M.white, -99.5, y+0.5, -6+i*4, g); // レジ
      }
    } else {
      // シネマ
      if (u.state==='open' && u.ten){
        this.plane(13,1.4, this.signMat(u.ten.name, '#1a1a2e', '#ffd166', {fs:56,w:1024,h:112}), faceX+0.25, y+4.6, 0, Math.PI/2, g);
        const dk=new THREE.MeshLambertMaterial({color:0x2b2b3a});
        this.box(30,4.5,0.4, dk, -113, y+2.25, -14, g);
        for (let i=0;i<5;i++){
          const pc=['#e63946','#457b9d','#2a9d8f','#f4a261','#9b5de5'][i];
          this.plane(2.6,3.4, new THREE.MeshBasicMaterial({color:new THREE.Color(pc)}), -124+i*5.5, y+2.4, -13.7, 0, g);
        }
        this.box(8,1.1,1.6, M.white, -104, y+0.55, 6, g);
      } else if (u.state==='fitting'){
        this.plane(12,3.6, this.signMat('シネマ 近日OPEN','#ffffff','#8e2a6b',{fs:56,border:'#8e2a6b'}), faceX+0.3, y+2.6, 0, Math.PI/2, g);
      } else {
        this.plane(12,3.2, this.signMat('シネマ区画 誘致中','#f0f0ec','#c0392b',{fs:52,border:'#c0392b'}), faceX+0.3, y+2.6, 0, Math.PI/2, g);
      }
    }
  },

  setEventVisual(name){
    const mat = name
      ? this.signMat('🎪 '+name+' 開催中!','#d81b60','#ffffff',{fs:44,w:1024,h:128})
      : this.signMat('YUME MALL セントラルコート','#8e2a6b','#ffffff',{fs:46});
    this.eventBanner.material = mat;
    this.eventBanner2.material = mat;
  },

  // ---------- フロア表示切替 ----------
  setFloorView(f){
    this.floorView = f;
    const showAll = f===0;
    for (let ff=1; ff<=3; ff++){
      this.gFloors[ff].visible = showAll || ff===f;
      this.gShellWalls[ff].visible = showAll || ff===f;
    }
    this.gRoof.visible = showAll;
    for (const n of this.npcs) if (n.active) n.grp.visible = this.gFloors[n.f].visible;
    if (this.mode==='orbit'){
      if (showAll){ this.camera.position.set(150,130,190); this.orbit.target.set(-10,8,0); }
      else {
        const y=(f-1)*this.FH;
        this.camera.position.set(30, y+52, y+82);
        this.orbit.target.set(-10, y+3, 0);
      }
      this.orbit.update();
    }
  },

  // ---------- モード切替 ----------
  enterWalk(){
    this.mode='walk';
    this.orbit.enabled=false;
    this.setFloorView(0);
    const p=this.player;
    p.x=93; p.z=0; p.f=1; p.y=0; p.yaw=Math.PI/2; p.pitch=-0.02;
  },
  exitWalk(){
    this.mode='orbit';
    this.orbit.enabled=true;
    this.camera.position.set(150,130,190);
    this.orbit.target.set(-10,8,0);
    this.setFloorView(this.floorView);
  },

  // ---------- 入力 ----------
  initInput(){
    const cv=this.renderer.domElement;
    window.addEventListener('keydown', e=>{ this.keys[e.code]=true; });
    window.addEventListener('keyup', e=>{ this.keys[e.code]=false; });
    // クリック=区画選択(経営モード) / ドラッグ視点(徒歩)
    let downPos=null, downTime=0;
    cv.addEventListener('pointerdown', e=>{
      downPos=[e.clientX,e.clientY]; downTime=Date.now();
      if (this.mode==='walk' && e.pointerType==='mouse'){
        this.dragLook={ x:e.clientX, y:e.clientY };
      }
    });
    cv.addEventListener('pointermove', e=>{
      if (this.mode==='walk' && this.dragLook && e.pointerType==='mouse'){
        const p=this.player;
        p.yaw -= (e.clientX-this.dragLook.x)*0.0045;
        p.pitch = THREE.MathUtils.clamp(p.pitch-(e.clientY-this.dragLook.y)*0.0035, -1.2, 1.2);
        this.dragLook={x:e.clientX,y:e.clientY};
      }
    });
    cv.addEventListener('pointerup', e=>{
      const wasDrag = !downPos || Math.hypot(e.clientX-downPos[0], e.clientY-downPos[1])>7 || Date.now()-downTime>450;
      this.dragLook=null;
      if (this.mode==='orbit' && !wasDrag) this.pickAt(e.clientX, e.clientY);
      downPos=null;
    });
    // モバイル: 左半分ジョイスティック / 右半分視点
    cv.addEventListener('touchstart', e=>{
      if (this.mode!=='walk') return;
      for (const t of e.changedTouches){
        if (t.clientX < innerWidth/2 && !this.joy.active){
          this.joy={ active:true, id:t.identifier, ox:t.clientX, oy:t.clientY, dx:0, dy:0 };
          UI.showJoy(t.clientX, t.clientY);
        } else if (!this.lookTouch){
          this.lookTouch={ id:t.identifier, x:t.clientX, y:t.clientY };
        }
      }
    }, {passive:true});
    cv.addEventListener('touchmove', e=>{
      if (this.mode!=='walk') return;
      for (const t of e.changedTouches){
        if (this.joy.active && t.identifier===this.joy.id){
          this.joy.dx = THREE.MathUtils.clamp((t.clientX-this.joy.ox)/46, -1, 1);
          this.joy.dy = THREE.MathUtils.clamp((t.clientY-this.joy.oy)/46, -1, 1);
          UI.moveJoy(this.joy.dx, this.joy.dy);
        } else if (this.lookTouch && t.identifier===this.lookTouch.id){
          const p=this.player;
          p.yaw -= (t.clientX-this.lookTouch.x)*0.006;
          p.pitch = THREE.MathUtils.clamp(p.pitch-(t.clientY-this.lookTouch.y)*0.004, -1.2, 1.2);
          this.lookTouch.x=t.clientX; this.lookTouch.y=t.clientY;
        }
      }
    }, {passive:true});
    const endTouch = e=>{
      for (const t of e.changedTouches){
        if (this.joy.active && t.identifier===this.joy.id){ this.joy={active:false,dx:0,dy:0}; UI.hideJoy(); }
        if (this.lookTouch && t.identifier===this.lookTouch.id) this.lookTouch=null;
      }
    };
    cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);
  },

  pickAt(cx, cy){
    if (this.floorView===0){ UI.toast('フロアボタン(1F/2F/3F)でフロアを表示すると区画を選択できます'); return; }
    const r=this.renderer.domElement.getBoundingClientRect();
    const mouse=new THREE.Vector2(((cx-r.left)/r.width)*2-1, -((cy-r.top)/r.height)*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(mouse, this.camera);
    const hits=ray.intersectObjects(this.pickMeshes.filter(m=>{
      const u=SIM.st.units.find(x=>x.id===m.userData.uid);
      return u && u.floor===this.floorView;
    }));
    if (hits.length) UI.openUnit(hits[0].object.userData.uid);
  },

  // ---------- 歩行 ----------
  walkableAt(x,z,f){
    const CF=this.CORR_FRONT;
    // 通路(kaze棟)
    if (x>=-95.5 && x<=95.5 && Math.abs(z)<CF-0.1){
      if (this.holesAt(f,x,z)) return this.rampAt(x,z)!==null;
      return true;
    }
    // 側道ストリップ上(通路内含む)
    if (x>=-95.5 && x<=95.5 && Math.abs(z)>=2.6 && Math.abs(z)<CF-0.1) return true;
    // 東ホール
    if (f===1 && x>95.5 && x<=99 && Math.abs(z)<5) return true;
    // GMS/シネマ
    if (x>=-128 && x<=-96.6 && Math.abs(z)<16){
      if (f<=2) return true;
      return x<=-100; // シネマロビー
    }
    if (x>=-96.6 && x<=-95.5 && Math.abs(z)<3.5) return true; // GMS入口
    if (f===1){
      // outlet/mori棟の通路列+連絡通路
      for (const bldKey of ['outlet','mori']){
        const B = BUILDINGS[bldKey];
        for (const rz0 of B.rows){
          const rz = B.originZ+rz0;
          if (x>=B.originX-1 && x<=B.originX+B.rowLen+1 && Math.abs(z-rz)<CF-0.1) return true;
        }
        const zMin = B.originZ+Math.min(...B.rows)-4, zMax = B.originZ+Math.max(...B.rows)+4;
        for (const cxOff of [B.rowLen*0.12, B.rowLen*0.88]){
          const cx = B.originX+cxOff;
          if (Math.abs(x-cx)<2.6 && z>=zMin && z<=zMax) return true;
        }
      }
      // 橋
      for (const br of BRIDGES){
        const dx=br.b.x-br.a.x, dz=br.b.z-br.a.z, len=Math.hypot(dx,dz);
        const ux=dx/len, uz=dz/len;
        const px=x-br.a.x, pz=z-br.a.z;
        const along = px*ux+pz*uz, perp = px*-uz+pz*ux;
        if (along>=-1 && along<=len+1 && Math.abs(perp)<br.w/2) return true;
      }
    }
    // 店内
    for (const u of SIM.st.units){
      if (u.floor!==f) continue;
      if (u.kind==='gms'||u.kind==='cinema') continue;
      if (x<u.x0+0.35 || x>u.x1-0.35) continue;
      const dirn = u.side==='N'?1:-1;
      const zi = (z-(u.rowZ||0))*dirn;
      const df = CF - 4; // 拡幅分のオフセット
      if (u.kind==='ent'){
        if (zi>=CF && zi<=17.9+df) return true;
        continue;
      }
      if (u.state!=='open') continue;
      const cx=(u.x0+u.x1)/2, doorHalf=Math.max(1.2, u.w*0.18);
      if (zi>=CF && zi<=CF+0.7 && Math.abs(x-cx)<doorHalf) return true; // ドア
      if (zi>CF+0.7 && zi<=13.2+df) return true; // 店内
    }
    return false;
  },
  updateWalk(dt){
    const p=this.player, k=this.keys;
    let mx=0,mz=0;
    if (k['KeyW']||k['ArrowUp']) mz+=1;
    if (k['KeyS']||k['ArrowDown']) mz-=1;
    if (k['KeyA']||k['ArrowLeft']) mx-=1;
    if (k['KeyD']||k['ArrowRight']) mx+=1;
    if (this.joy.active){ mx+=this.joy.dx; mz-=this.joy.dy; }
    const len=Math.hypot(mx,mz);
    if (len>0.01){
      mx/=Math.max(len,1); mz/=Math.max(len,1);
      const sp=(k['ShiftLeft']||k['ShiftRight'])?10.5:6.0;
      const s=Math.sin(p.yaw), c=Math.cos(p.yaw);
      const dx=(mz*-s + mx*c)*sp*dt;
      const dz=(mz*-c - mx*s)*sp*dt;
      const nx=p.x+dx, nz=p.z+dz;
      if (this.walkableAt(nx,nz,p.f)){ p.x=nx; p.z=nz; }
      else if (this.walkableAt(nx,p.z,p.f)) p.x=nx;
      else if (this.walkableAt(p.x,nz,p.f)) p.z=nz;
    }
    // 高さ&フロア
    const ry=this.rampAt(p.x,p.z);
    const targetY = ry!==null? ry : (p.f-1)*6;
    p.y += (targetY-p.y)*Math.min(1, dt*10);
    if (ry!==null) p.f = p.y<3?1:(p.y<9?2:3);
    else p.f = Math.round(p.y/6)+1;
    this.camera.position.set(p.x, p.y+1.62, p.z);
    const ld=new THREE.Vector3(-Math.sin(p.yaw)*Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw)*Math.cos(p.pitch));
    this.camera.lookAt(this.camera.position.clone().add(ld));
    // 近くの店ラベル
    let best=null, bd=7;
    for (const u of SIM.st.units){
      if (u.floor!==p.f || !u.ten || u.state!=='open') continue;
      const cx = u.kind==='gms'||u.kind==='cinema' ? -100 : (u.x0+u.x1)/2;
      const cz = u.kind==='gms'||u.kind==='cinema' ? 0 : (u.rowZ||0)+(u.side==='N'?this.CORR_FRONT:-this.CORR_FRONT);
      const d=Math.hypot(p.x-cx, p.z-cz);
      if (d<bd){ bd=d; best=u; }
    }
    UI.setNearLabel(best);
  },

  // ---------- NPC ----------
  initNPC(){
    const FS=4; // 解像度倍率
    const faceCv=document.createElement('canvas'); faceCv.width=96*FS; faceCv.height=96*FS;
    const fc=faceCv.getContext('2d');
    fc.scale(FS,FS);
    // 眉
    fc.strokeStyle='#2a1d14'; fc.lineWidth=3.4; fc.lineCap='round';
    fc.beginPath(); fc.moveTo(22,30); fc.quadraticCurveTo(31,25,40,29); fc.stroke();
    fc.beginPath(); fc.moveTo(56,29); fc.quadraticCurveTo(65,25,74,30); fc.stroke();
    // 目(大きめ・つや入り)
    fc.fillStyle='#241a12';
    fc.beginPath(); fc.ellipse(31,42,6.4,7.8,0,0,Math.PI*2); fc.fill();
    fc.beginPath(); fc.ellipse(65,42,6.4,7.8,0,0,Math.PI*2); fc.fill();
    fc.fillStyle='#ffffff';
    fc.beginPath(); fc.ellipse(33.2,38.5,2.0,2.4,0,0,Math.PI*2); fc.fill();
    fc.beginPath(); fc.ellipse(67.2,38.5,2.0,2.4,0,0,Math.PI*2); fc.fill();
    // 頬
    fc.fillStyle='#e0717a'; fc.globalAlpha=0.5;
    fc.beginPath(); fc.ellipse(20,56,6.5,4.2,0,0,Math.PI*2); fc.fill();
    fc.beginPath(); fc.ellipse(76,56,6.5,4.2,0,0,Math.PI*2); fc.fill();
    fc.globalAlpha=1;
    // 口(なめらかな弧)
    fc.strokeStyle='#241a12'; fc.lineWidth=2.6; fc.lineCap='round'; fc.lineJoin='round';
    fc.beginPath();
    for (let a=0.12; a<=0.88; a+=0.02){
      const ang=a*Math.PI, px=48+9*Math.cos(ang), py=58+9*Math.sin(ang);
      if (a===0.12) fc.moveTo(px,py); else fc.lineTo(px,py);
    }
    fc.stroke();
    const faceTex=new THREE.CanvasTexture(faceCv);
    faceTex.anisotropy = 4;
    this._npcFaceMat = new THREE.MeshBasicMaterial({map:faceTex, transparent:true, depthWrite:false});
    this._npcGeo = {
      torso: new THREE.SphereGeometry(0.185,12,9),
      head: new THREE.SphereGeometry(0.205,14,11),
      face: new THREE.PlaneGeometry(0.33,0.33),
      hairCap: new THREE.SphereGeometry(0.218,10,8,0,Math.PI*2,0,Math.PI*0.6),
      hairFringe: new THREE.SphereGeometry(0.1,8,6),
      ponytail: new THREE.CylinderGeometry(0.055,0.075,0.34,6),
      skirt: new THREE.CylinderGeometry(0.24,0.15,0.28,10,1,true),
      leg: (typeof THREE.CapsuleGeometry==='function') ? new THREE.CapsuleGeometry(0.058,0.28,3,6) : new THREE.CylinderGeometry(0.058,0.05,0.34,6),
      arm: (typeof THREE.CapsuleGeometry==='function') ? new THREE.CapsuleGeometry(0.046,0.27,3,6) : new THREE.CylinderGeometry(0.046,0.04,0.32,6),
      hand: new THREE.SphereGeometry(0.052,8,6),
      shoe: new THREE.SphereGeometry(0.075,8,6),
      childBody: new THREE.SphereGeometry(0.135,10,8),
      childHead: new THREE.SphereGeometry(0.148,11,9),
      childFace: new THREE.PlaneGeometry(0.24,0.24),
      childLeg: new THREE.CylinderGeometry(0.04,0.036,0.22,6),
    };
    this.npcs=[];
    for (let i=0;i<9;i++){
      const grp=new THREE.Group();
      grp.visible=false; this.scene.add(grp);
      this.npcs.push({ grp, active:false, f:1, x:0, z:0, y:0, wps:[], wi:0, speed:1.1+Math.random()*0.6, dwell:0, arch:'adult_female', walkPhase:Math.random()*10, limbs:null });
    }
  },
  sampleArchetype(){
    const shares = SIM.archShares();
    let r = Math.random(), acc = 0;
    for (const a in shares){ acc += shares[a]; if (r<=acc) return a; }
    return 'adult_female';
  },
  buildNpcVisual(n, arch){
    const A = ARCHETYPES[arch];
    const geo = this._npcGeo;
    while (n.grp.children.length) n.grp.remove(n.grp.children[0]);
    const bodyColor = A.palette[Math.floor(Math.random()*A.palette.length)];
    const legColorHex = '#'+new THREE.Color(bodyColor).lerp(new THREE.Color(0x241f1a), 0.6).getHexString();
    const hairColor = A.hair[Math.floor(Math.random()*A.hair.length)];
    const bodyMat = this.litMat(bodyColor);
    const skinMat = this.litMat(A.skin);
    const hairMat = this.litMat(hairColor);
    const legMat = this.litMat(legColorHex);
    const isFemale = (arch==='young_female'||arch==='adult_female');
    const wearsSkirt = isFemale && Math.random()<0.45;

    // 脚(股関節ピボット。歩行アニメーション用)+靴
    const legPivotY = 0.32;
    const lLeg=new THREE.Group(); lLeg.position.set(-0.09, legPivotY, 0);
    const lLegM=new THREE.Mesh(geo.leg, wearsSkirt?skinMat:legMat); lLegM.position.y=-0.15; lLeg.add(lLegM);
    const lShoe=new THREE.Mesh(geo.shoe, this.litMat(0x2a2420)); lShoe.position.y=-0.29; lShoe.scale.set(1,0.7,1.25); lLeg.add(lShoe);
    n.grp.add(lLeg);
    const rLeg=new THREE.Group(); rLeg.position.set(0.09, legPivotY, 0);
    const rLegM=new THREE.Mesh(geo.leg, wearsSkirt?skinMat:legMat); rLegM.position.y=-0.15; rLeg.add(rLegM);
    const rShoe=new THREE.Mesh(geo.shoe, this.litMat(0x2a2420)); rShoe.position.y=-0.29; rShoe.scale.set(1,0.7,1.25); rLeg.add(rShoe);
    n.grp.add(rLeg);

    // 胴体(丸みのあるシルエット)
    const torso=new THREE.Mesh(geo.torso, bodyMat); torso.position.y=legPivotY+0.20; torso.scale.set(1,1.08,0.92); n.grp.add(torso);
    if (wearsSkirt){
      const skirt=new THREE.Mesh(geo.skirt, this.litMat(bodyColor)); skirt.position.y=legPivotY+0.08; n.grp.add(skirt);
    }

    // 腕(肩関節ピボット)+手
    const armPivotY = legPivotY+0.33;
    const lArm=new THREE.Group(); lArm.position.set(-0.205, armPivotY, 0);
    const lArmM=new THREE.Mesh(geo.arm, bodyMat); lArmM.position.y=-0.14; lArm.add(lArmM);
    const lHand=new THREE.Mesh(geo.hand, skinMat); lHand.position.y=-0.29; lArm.add(lHand);
    n.grp.add(lArm);
    const rArm=new THREE.Group(); rArm.position.set(0.205, armPivotY, 0);
    const rArmM=new THREE.Mesh(geo.arm, bodyMat); rArmM.position.y=-0.14; rArm.add(rArmM);
    const rHand=new THREE.Mesh(geo.hand, skinMat); rHand.position.y=-0.29; rArm.add(rHand);
    n.grp.add(rArm);

    // 頭・髪・顔(大きめの頭でちびキャラ比率に)
    const headY = armPivotY+0.20;
    const head=new THREE.Mesh(geo.head, skinMat); head.position.y=headY; n.grp.add(head);
    const hairScale = arch==='senior' ? 0.86 : (arch==='kids_family' ? 0.95 : 1.0);
    const hair=new THREE.Mesh(geo.hairCap, hairMat); hair.position.y=headY+0.075; hair.rotation.x=Math.PI; hair.scale.setScalar(hairScale); n.grp.add(hair);
    const fringe=new THREE.Mesh(geo.hairFringe, hairMat); fringe.position.set(0, headY+0.11, 0.17); fringe.scale.set(1.3,0.8,0.7); n.grp.add(fringe);
    const face=new THREE.Mesh(geo.face, this._npcFaceMat); face.position.set(0, headY-0.01, 0.218); n.grp.add(face);
    if (arch==='young_female' && Math.random()<0.45){
      const pt=new THREE.Mesh(geo.ponytail, hairMat); pt.position.set(0, headY-0.1, -0.2); pt.rotation.x=0.6; n.grp.add(pt);
    }
    n.grp.scale.setScalar(A.height * (0.94+Math.random()*0.12));
    n.limbs = { lLeg, rLeg, lArm, rArm };

    if (arch==='kids_family'){
      const kidPalette = A.palette;
      const kidMat = this.litMat(kidPalette[(Math.floor(Math.random()*kidPalette.length)+1)%kidPalette.length]);
      const kx=0.44, kLegY=0.20;
      const cGrp = new THREE.Group(); cGrp.position.set(kx, 0, 0.1); n.grp.add(cGrp);
      const clLeg=new THREE.Group(); clLeg.position.set(-0.06,kLegY,0); const clLegM=new THREE.Mesh(geo.childLeg,legMat); clLegM.position.y=-0.11; clLeg.add(clLegM); cGrp.add(clLeg);
      const crLeg=new THREE.Group(); crLeg.position.set(0.06,kLegY,0); const crLegM=new THREE.Mesh(geo.childLeg,legMat); crLegM.position.y=-0.11; crLeg.add(crLegM); cGrp.add(crLeg);
      const cBody=new THREE.Mesh(geo.childBody, kidMat); cBody.position.y=kLegY+0.14; cBody.scale.set(1,1.05,0.95); cGrp.add(cBody);
      const cHeadY=kLegY+0.32;
      const cHead=new THREE.Mesh(geo.childHead, skinMat); cHead.position.y=cHeadY; cGrp.add(cHead);
      const cHair=new THREE.Mesh(geo.hairCap, hairMat); cHair.position.y=cHeadY+0.055; cHair.rotation.x=Math.PI; cHair.scale.setScalar(0.86); cGrp.add(cHair);
      const cFace=new THREE.Mesh(geo.childFace, this._npcFaceMat); cFace.position.set(0,cHeadY-0.01,0.158); cGrp.add(cFace);
      n.childLimbs = { lLeg:clLeg, rLeg:crLeg };
    } else n.childLimbs = null;
    n.arch = arch;
  },
  laneZ(z){ return z>=0? 4.3 : -4.3; },
  crossX(f, x){
    if (f===1) return x;
    if (f===2){
      if (x<=-38) return x;
      if (x<-24) return -24;
      if (x<22) return x<0? -24 : 24;
      return x;
    }
    if (x<=-22) return x;
    if (x<24) return 24;
    if (x<38) return 40;
    return x;
  },
  addMoveTo(n, tx, tz){
    const f=n._pf;
    const fromZ = n._pz, fromX = n._px;
    const sameSide = (fromZ>=0)===(tz>=0) || Math.abs(tz)<3.6;
    if (!sameSide){
      const cx=this.crossX(f, (fromX+tx)/2);
      n.wps.push({x:cx, z:this.laneZ(fromZ), f});
      n.wps.push({x:cx, z:this.laneZ(tz), f});
    }
    n.wps.push({x:tx, z:this.laneZ(tz)===this.laneZ(fromZ)&&Math.abs(tz)>3.6? tz : this.laneZ(tz), f});
    if (Math.abs(tz)>this.CORR_FRONT-0.1 || Math.abs(tz)<3.6) n.wps.push({x:tx, z:tz, f});
    n._px=tx; n._pz=tz;
  },
  addFloorChange(n, toF){
    while (n._pf!==toF){
      const up=toF>n._pf;
      const e = up? (n._pf===1? this.ESC.W : this.ESC.E) : (n._pf===3? this.ESC.E : this.ESC.W);
      const z = up? e.upZ : e.dnZ;
      const enterX = up? e.x0-2 : e.x1+2;
      const exitX  = up? e.x1+2 : e.x0-2;
      this.addMoveTo(n, enterX, z);
      const nf = n._pf + (up?1:-1);
      n.wps.push({x:exitX, z, f:nf});
      n._pf=nf; n._px=exitX; n._pz=z;
    }
  },
  spawnNPC(){
    const n=this.npcs.find(n=>!n.active);
    if (!n) return;
    // kaze棟とoutlet/mori棟を人数比に応じて振り分け
    const bldRoll = Math.random();
    if (bldRoll < 0.55) this.spawnNPCKaze(n);
    else this.spawnNPCRowBuilding(n, bldRoll<0.78 ? 'outlet' : 'mori');
  },
  spawnNPCKaze(n){
    const CF=this.CORR_FRONT;
    const ents=[{x:8,z:-16,f:1},{x:8,z:16,f:1},{x:97,z:0,f:1}];
    const ent=ents[Math.random()<0.45?0:(Math.random()<0.55?2:1)];
    n.active=true; n.f=ent.f; n.x=ent.x; n.z=ent.z; n.y=0; n.dwell=0; n.walkPhase=Math.random()*10;
    n.wps=[]; n.wi=0; n._px=ent.x; n._pz=ent.z; n._pf=ent.f;
    const arch = this.sampleArchetype();
    this.buildNpcVisual(n, arch);
    n.grp.position.set(n.x, n.y, n.z);
    // 訪問先を1〜3店選ぶ(集客力×客層の相性で加重、kaze棟内のみ)
    const open=SIM.st.units.filter(u=>u.state==='open'&&u.ten&&u.bld==='kaze');
    if (!open.length){ n.active=false; return; }
    const targets=[];
    const count=1+Math.floor(Math.random()*3);
    for (let i=0;i<count;i++){
      let tw=0; for (const u of open) tw += u.ten.attract * SIM.tenantAppeal(u.ten, arch);
      let r=Math.random()*tw, pick=open[0];
      for (const u of open){ r -= u.ten.attract * SIM.tenantAppeal(u.ten, arch); if(r<=0){ pick=u; break; } }
      targets.push(pick);
    }
    targets.sort((a,b)=>a.floor-b.floor);
    for (const u of targets){
      if (u.floor!==n._pf) this.addFloorChange(n, u.floor);
      let dx, dz;
      if (u.kind==='gms'||u.kind==='cinema'){ dx=-101; dz=0; this.addMoveTo(n, -90, 0); n.wps.push({x:dx,z:dz,f:n._pf,dwell:3+Math.random()*4}); n._px=dx; n._pz=dz; }
      else {
        dx=(u.x0+u.x1)/2; const dirn=u.side==='N'?1:-1;
        this.addMoveTo(n, dx, dirn*4.3);
        n.wps.push({x:dx, z:dirn*(u.state==='open'?CF+2.6:CF), f:n._pf, dwell:2.5+Math.random()*4});
        n.wps.push({x:dx, z:dirn*4.3, f:n._pf});
        n._px=dx; n._pz=dirn*4.3;
      }
    }
    if (n._pf!==1) this.addFloorChange(n, 1);
    const ex=ents[Math.floor(Math.random()*3)];
    this.addMoveTo(n, ex.x, ex.z);
    n.wps.push({x:ex.x, z:ex.z+(ex.z>10?4:(ex.z<-10?-4:0)), f:1, exit:true});
    n.grp.visible=this.gFloors[1].visible;
  },
  spawnNPCRowBuilding(n, bldKey){
    const CF=this.CORR_FRONT;
    const B = BUILDINGS[bldKey];
    const open = SIM.st.units.filter(u=>u.state==='open'&&u.ten&&u.bld===bldKey);
    if (!open.length) return;
    const entRow = B.rows[Math.floor(Math.random()*B.rows.length)];
    const entRz = B.originZ+entRow;
    const fromWest = Math.random()<0.5;
    const entX = fromWest ? B.originX-1 : B.originX+B.rowLen+1;
    n.active=true; n.f=1; n.x=entX; n.z=entRz; n.y=0; n.dwell=0; n.walkPhase=Math.random()*10;
    n.wps=[]; n.wi=0; n._px=entX; n._pz=entRz; n._pf=1;
    const arch = this.sampleArchetype();
    this.buildNpcVisual(n, arch);
    n.grp.position.set(n.x, n.y, n.z);
    const targets=[]; const count=1+Math.floor(Math.random()*2);
    for (let i=0;i<count;i++){
      let tw=0; for (const u of open) tw += u.ten.attract * SIM.tenantAppeal(u.ten, arch);
      let r=Math.random()*tw, pick=open[0];
      for (const u of open){ r -= u.ten.attract * SIM.tenantAppeal(u.ten, arch); if(r<=0){ pick=u; break; } }
      targets.push(pick);
    }
    for (const u of targets){
      const dx=(u.x0+u.x1)/2, dirn=u.side==='N'?1:-1, rz=u.rowZ||0;
      if (Math.abs(rz-n._pz)>1){
        // 別の通路列へ:端の連絡通路を経由
        const cxOff = n._px<dx ? B.rowLen*0.12 : B.rowLen*0.88;
        const cx = B.originX+cxOff;
        n.wps.push({x:cx, z:n._pz, f:1});
        n.wps.push({x:cx, z:rz, f:1});
        n._px=cx; n._pz=rz;
      }
      n.wps.push({x:dx, z:rz+dirn*4.3, f:1});
      n.wps.push({x:dx, z:rz+dirn*(u.state==='open'?CF+2.6:CF), f:1, dwell:2.5+Math.random()*4});
      n.wps.push({x:dx, z:rz+dirn*4.3, f:1});
      n._px=dx; n._pz=rz+dirn*4.3;
    }
    const exitX = Math.random()<0.5 ? B.originX-1 : B.originX+B.rowLen+1;
    n.wps.push({x:exitX, z:n._pz, f:1, exit:true});
    n.grp.visible=this.gFloors[1].visible;
  },
  updateNPC(dt){
    const st=SIM.st;
    const density = Math.min(1.4, st.todayVisitors/16000) * SIM.hourMul();
    const want=Math.round(2+density*7);
    const active=this.npcs.filter(n=>n.active).length;
    if (active<want && Math.random()<0.10) this.spawnNPC();
    for (const n of this.npcs){
      if (!n.active) continue;
      if (n.dwell>0){ n.dwell-=dt; continue; }
      const wp=n.wps[n.wi];
      if (!wp){ n.active=false; n.grp.visible=false; continue; }
      const dx=wp.x-n.x, dz=wp.z-n.z;
      const d=Math.hypot(dx,dz);
      if (d<0.25){
        n.f=wp.f;
        if (wp.dwell) n.dwell=wp.dwell;
        if (wp.exit){ n.active=false; n.grp.visible=false; continue; }
        n.wi++;
        continue;
      }
      const sp=n.speed*(st.speed===0?0:1);
      n.x+=dx/d*sp*dt; n.z+=dz/d*sp*dt;
      const ry=this.rampAt(n.x,n.z);
      const ty = ry!==null? ry : (n.f-1)*6;
      n.y += (ty-n.y)*Math.min(1,dt*8);
      n.grp.position.set(n.x, n.y, n.z);
      n.grp.rotation.y = Math.atan2(dx,dz);
      n.grp.visible = this.gFloors[Math.min(3,Math.max(1,n.f))].visible;
      if (sp>0.01){
        n.walkPhase += dt*sp*4.6;
        const sw = Math.sin(n.walkPhase)*0.62;
        const l=n.limbs;
        if (l){ l.lLeg.rotation.x=sw; l.rLeg.rotation.x=-sw; l.lArm.rotation.x=-sw*0.75; l.rArm.rotation.x=sw*0.75; }
        if (n.childLimbs){ const sw2=Math.sin(n.walkPhase*1.15)*0.6; n.childLimbs.lLeg.rotation.x=sw2; n.childLimbs.rLeg.rotation.x=-sw2; }
      }
    }
  },
  setCrowdVisual(){
    if (!this.carMesh) return;
    const ratio=Math.min(1, SIM.st.todayVisitors/26000 * (0.3+SIM.hourMul()*0.9));
    this.carMesh.count=Math.max(4, Math.floor(this._carPos.length*ratio));
  },

  // ---------- ループ ----------
  startLoop(){
    if (this._raf) return;
    if (!this.clock) this.clock = new THREE.Clock();
    const loop=()=>{
      if (window.__shotPause){ this._raf=null; return; }
      this._raf=requestAnimationFrame(loop);
      const rawDt=this.clock.getDelta();
      const dt=Math.min(0.05, rawDt);
      const settled=SIM.tick(Math.min(1.5, rawDt));
      if (settled) UI.onDaySettled(settled);
      if (this.mode==='walk') this.updateWalk(dt);
      else this.orbit.update();
      this.updateNPC(dt);
      const sd = SIM.st.speed===0?0:dt;
      this.escTexUp.offset.y -= sd*0.5;
      this.escTexDown.offset.y += sd*0.5;
      if ((this._crowdT=(this._crowdT||0)+dt) > 2){ this._crowdT=0; this.setCrowdVisual(); }
      if ((this._lodT=(this._lodT||0)+dt) > 0.8){ this._lodT=0; this.updateLOD(); }
      UI.tickHUD();
      this.renderer.render(this.scene, this.camera);
    };
    this.clock.getDelta();
    this._raf=requestAnimationFrame(loop);
  },
};
window.__resumeRender = ()=>{ window.__shotPause=false; M3D.startLoop(); };
