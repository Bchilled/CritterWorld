// ═══════════════════════════════════════════════════════════════════
// CRITTER WORLD — world.js
// ═══════════════════════════════════════════════════════════════════

const canvas  = document.getElementById('world-canvas');
const ctx     = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ── CONSTANTS ──────────────────────────────────────────────────────
const W = canvas.width  = window.screen.width;
const H = canvas.height = 220;
const WORLD_W = W * 5;   // 5 screens wide
const SC = 2;             // pixel scale for critters

// ── STATE ──────────────────────────────────────────────────────────
let camera = { x: 0, scrollSpeed: 0 };
let gameSpeed = 1;
let paused = false;
let lastTs = 0;
let elapsed = 0; // seconds

let worldState = {
  critters: [],
  eggs:     [],
  trees:    [],
  rocks:    [],
  bushes:   [],
  buildings:[],
  items:    [],   // world-placed items
  resources:{ wood:0, stone:0, food:0, metal:0 },
  population: 0,
  day: 0,
};

// ── BIOMES ─────────────────────────────────────────────────────────
const BIOMES = [
  { name:'Forest',   x:0,              color:'#1a2e1a', sky:'#0d1f0d', ground:'#2d4a1e', accent:'#4a7c2f' },
  { name:'Tundra',   x:WORLD_W*0.2,    color:'#1a2a3a', sky:'#0a1520', ground:'#2a3a4a', accent:'#5a8aaa' },
  { name:'Desert',   x:WORLD_W*0.4,    color:'#2e1f0a', sky:'#1a1005', ground:'#6b4a1a', accent:'#c8962a' },
  { name:'Moon',     x:WORLD_W*0.6,    color:'#0a0a14', sky:'#000008', ground:'#2a2a3a', accent:'#7a7aaa' },
  { name:'Wasteland',x:WORLD_W*0.8,    color:'#0a1a0a', sky:'#000a00', ground:'#1a2a1a', accent:'#2aff2a' },
];

// ── PALETTES ───────────────────────────────────────────────────────
const PP = [
  {body:"#4caf50",dark:"#2e7d32",light:"#a5d6a7",eye:"#fff",pupil:"#1a237e"},
  {body:"#e53935",dark:"#b71c1c",light:"#ef9a9a",eye:"#fff",pupil:"#000"},
  {body:"#7c4dff",dark:"#4527a0",light:"#b39ddb",eye:"#e1f5fe",pupil:"#f00"},
  {body:"#ffb300",dark:"#e65100",light:"#ffe082",eye:"#fff",pupil:"#3e2723"},
  {body:"#29b6f6",dark:"#0277bd",light:"#b3e5fc",eye:"#fff",pupil:"#1a237e"},
  {body:"#c6ff00",dark:"#558b2f",light:"#f4ff81",eye:"#212121",pupil:"#f00"},
  {body:"#eeeeee",dark:"#9e9e9e",light:"#fff",eye:"#212121",pupil:"#212121"},
  {body:"#37474f",dark:"#102027",light:"#78909c",eye:"#ffee58",pupil:"#e53935"},
  {body:"#ff7043",dark:"#bf360c",light:"#ffccbc",eye:"#fff",pupil:"#000"},
  {body:"#f48fb1",dark:"#880e4f",light:"#fce4ec",eye:"#fff",pupil:"#880e4f"},
];

// ── HELPERS ────────────────────────────────────────────────────────
function rnd(arr)  { return arr[Math.floor(Math.random()*arr.length)]; }
function rndF(a,b) { return a + Math.random()*(b-a); }
function rndI(a,b) { return Math.floor(a + Math.random()*(b-a+1)); }
function lerp(a,b,t){ return a+(b-a)*t; }

// Pixel drawing (scaled)
function px(x,y,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x)*SC,Math.round(y)*SC,SC,SC); }
function rect(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x)*SC,Math.round(y)*SC,w*SC,h*SC); }

// ── GENOME ─────────────────────────────────────────────────────────
function generateGenome() {
  const p = PP[rndI(0,PP.length-1)];
  return {
    palette:   p,
    bodyShape: rnd(['round','blob','chunky','bear_body','cat_body','frog_body']),
    headType:  rnd(['round','oval','dog','cat','bear','frog']),
    eyeStyle:  rnd(['beady','big','wide']),
    mouthStyle:rnd(['smile','frown','fangs']),
    earType:   rnd(['none','cat_ears','dog_floppy','bear_round']),
    tailType:  rnd(['none','cat_long','dog_wagging','lizard']),
    armType:   rnd(['stubby','clawed','noodle']),
    legType:   rnd(['stubby','clawed','none']),
    // Body modifiers
    bodySizeMod: rndF(0.8,1.2),
    headSizeMod: rndF(0.9,1.3),
  };
}

// ── PERSONALITY ────────────────────────────────────────────────────
function generatePersonality() {
  return {
    hungerRate:  rndF(0.5, 2.0),   // how fast they get hungry
    sleepRate:   rndF(0.3, 1.5),   // how fast they get tired
    workSpeed:   rndF(0.6, 1.8),   // speed multiplier for tasks
    social:      rndF(0.0, 1.0),   // how much they seek others
    brave:       rndF(0.0, 1.0),   // will they hunt vs gather
    lazy:        rndF(0.0, 1.0),   // chance to idle instead of work
    curiosity:   rndF(0.0, 1.0),   // wander distance
    // Mood weights
    moodBias:    rnd(['happy','grumpy','anxious','chill','energetic']),
  };
}

// ── CRITTER CLASS ──────────────────────────────────────────────────
class Critter {
  constructor(x, y, genome, personality, stage='baby') {
    this.id       = Math.random().toString(36).slice(2);
    this.x        = x;
    this.y        = y;
    this.genome   = genome || generateGenome();
    this.personality = personality || generatePersonality();
    this.stage    = stage; // baby teen adult old
    this.age      = 0;     // seconds lived
    this.action   = 'idle';
    this.facing   = 1;     // 1=right -1=left

    // Needs (0=full, 1=desperate)
    this.hunger   = rndF(0, 0.3);
    this.fatigue  = rndF(0, 0.3);
    this.social   = 0;

    // Movement
    this.vx       = 0;
    this.vy       = 0;
    this.targetX  = x;
    this.targetY  = y;
    this.moving   = false;

    // Action state
    this.actionTimer   = 0;   // how long into current action
    this.actionDur     = 0;   // how long action lasts
    this.heldItem      = null;
    this.thought       = null; // { text, timer }
    this.deathTimer    = -1;   // -1 = alive
    this.fallHeight    = 0;    // for drop damage

    // Stats that grow
    this.skills = {
      chop:   0, mine:  0, fish:  0,
      gather: 0, build: 0, cook:  0,
      hunt:   0, smith: 0,
    };

    // Life stage durations (seconds at game speed 1)
    this.stageDur = { baby:120, teen:180, adult:300, old:180 };
  }

  // ── NEEDS UPDATE ────────────────────────────────────────────────
  updateNeeds(dt) {
    const p = this.personality;
    this.hunger  += dt * p.hungerRate * 0.01;
    this.fatigue += dt * p.sleepRate  * 0.008;
    this.hunger  = Math.min(1, this.hunger);
    this.fatigue = Math.min(1, this.fatigue);
    this.age     += dt;

    // Stage progression
    if (this.stage !== 'old') {
      const stages = ['baby','teen','adult','old'];
      const idx = stages.indexOf(this.stage);
      const stageAge = this.stageDur[this.stage];
      // Age within stage
      const stageStart = stages.slice(0,idx).reduce((s,st)=>s+this.stageDur[st],0);
      if (this.age > stageStart + stageAge) {
        if (idx < stages.length-1) this.stage = stages[idx+1];
      }
    }

    // Natural death from old age
    if (this.stage === 'old' && this.age > 780) {
      this.die('old age');
    }
  }

  // ── AI DECISION ─────────────────────────────────────────────────
  decideAction(dt) {
    if (this.action === 'death') return;
    if (this.deathTimer >= 0) { this.action = 'death'; return; }

    this.actionTimer += dt * this.personality.workSpeed;

    // Currently busy?
    if (this.actionTimer < this.actionDur) return;

    // Action complete — apply effects
    this.completeAction();

    // Decide next action based on needs + personality
    const p = this.personality;

    // Critical needs first
    if (this.hunger > 0.8) { this.startAction('eat',  3.0 / p.workSpeed); return; }
    if (this.fatigue > 0.8){ this.startAction('sleep', 8.0 / p.workSpeed); return; }

    // Stage limits
    if (this.stage === 'baby') {
      this.startAction(rnd(['idle','idle','eat','sleep']), rndF(2,5)); return;
    }
    if (this.stage === 'old') {
      const opts = ['idle','idle','walk','eat','drink','sleep'];
      this.startAction(rnd(opts), rndF(2,6)); return;
    }

    // Personality-driven choices
    if (Math.random() < p.lazy * 0.3) {
      this.startAction('idle', rndF(1,4)); return;
    }

    // Normal adult/teen choices
    const options = [];
    if (this.hunger > 0.4)    options.push('eat','eat','cook');
    if (this.fatigue > 0.5)   options.push('sleep');
    if (p.brave > 0.6)        options.push('hunt','hunt');
    if (p.brave <= 0.6)       options.push('gather','gather','fish');
    options.push('walk','idle','chop','mine','build','smith','dance');

    const chosen = rnd(options);
    const durations = {
      idle:1.5, walk:3, eat:4, drink:3, sleep:8, poop:5,
      fish:6, gather:3, carry:2, dance:2, attack:1.5,
      chop:2.5, mine:2.5, cook:4, build:3, smith:2,
      pump:2, hunt:5, death:99,
    };
    this.startAction(chosen, (durations[chosen]||2) / Math.max(0.3, p.workSpeed));
  }

  startAction(action, dur) {
    this.action      = action;
    this.actionTimer = 0;
    this.actionDur   = dur;

    // Pick movement target for walk/hunt
    if (action === 'walk') {
      const wander = this.personality.curiosity * 150;
      this.targetX = Math.max(20, Math.min(WORLD_W-20, this.x + rndF(-wander, wander)));
    }

    // Thoughts
    const thoughtMap = {
      eat:   '!',     sleep: 'zzz',  hunt:  '!',
      fish:  ':)',    dance: ':)',    poop:  '#!',
      build: '...',   chop:  '...',  mine:  '...',
      death: 'x_x',  idle:  rnd(['...','?',':)']),
    };
    if (thoughtMap[action]) this.setThought(thoughtMap[action]);
  }

  completeAction() {
    const effects = {
      eat:   () => { this.hunger  = Math.max(0, this.hunger  - 0.5); },
      drink: () => { this.hunger  = Math.max(0, this.hunger  - 0.2); },
      sleep: () => { this.fatigue = Math.max(0, this.fatigue - 0.7); },
      cook:  () => { worldState.resources.food = (worldState.resources.food||0) + 1; },
      chop:  () => { worldState.resources.wood = (worldState.resources.wood||0) + 1;
                     this.skills.chop += 0.1; },
      mine:  () => { worldState.resources.stone= (worldState.resources.stone||0)+ 1;
                     this.skills.mine += 0.1; },
      fish:  () => { worldState.resources.food = (worldState.resources.food||0) + 1;
                     this.skills.fish += 0.1; },
      gather:() => { worldState.resources.food = (worldState.resources.food||0) + 1;
                     this.skills.gather += 0.1; },
      hunt:  () => { worldState.resources.food = (worldState.resources.food||0) + 2;
                     this.skills.hunt += 0.1; },
      smith: () => { worldState.resources.metal= (worldState.resources.metal||0)+ 1;
                     this.skills.smith += 0.1; },
      build: () => { this.skills.build += 0.1; },
      poop:  () => { /* just vibes */ },
    };
    if (effects[this.action]) effects[this.action]();
  }

  setThought(text, dur=2.5) {
    this.thought = { text, timer: dur };
  }

  die(cause='unknown') {
    if (this.deathTimer >= 0) return;
    this.deathTimer = 0;
    this.action = 'death';
    this.setThought('x_x', 99);
    console.log(`Critter ${this.id} died: ${cause}`);
  }

  // ── PHYSICS / MOVEMENT ──────────────────────────────────────────
  updateMovement(dt) {
    if (this.action === 'walk') {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 2) {
        this.vx = Math.sign(dx) * 30 * this.personality.workSpeed;
        this.facing = Math.sign(dx);
      } else {
        this.vx = 0;
      }
    } else {
      this.vx = lerp(this.vx, 0, dt*8);
    }

    this.x += this.vx * dt;
    this.x  = Math.max(10, Math.min(WORLD_W-10, this.x));

    // Update thought timer
    if (this.thought) {
      this.thought.timer -= dt;
      if (this.thought.timer <= 0) this.thought = null;
    }

    if (this.deathTimer >= 0) this.deathTimer += dt;
  }

  // ── RENDER ──────────────────────────────────────────────────────
  draw(elapsed) {
    const screenX = Math.round(this.x - camera.x);
    if (screenX < -30 || screenX > W+30) return; // off screen

    const stageSC = { baby:0.42, teen:0.68, adult:1.0, old:0.88 }[this.stage] || 1.0;
    const groundY = H - 44; // ground level in screen coords
    const sx = screenX;
    const sy = groundY;

    ctx.save();
    ctx.translate(sx * SC, sy * SC);
    if (this.facing < 0) {
      ctx.scale(-1, 1);
      ctx.translate(-10*SC, 0); // center adjustment
    }
    ctx.scale(stageSC, stageSC);

    drawCritter(ctx, this, elapsed);

    ctx.restore();

    // Draw thought bubble
    if (this.thought) {
      drawThought(ctx, screenX, sy - 28*stageSC, this.thought.text, elapsed);
    }
  }
}

// ── CRITTER PIXEL RENDERER ─────────────────────────────────────────
function drawCritter(ctx, critter, t) {
  const p      = critter.genome.palette;
  const col    = p.body, dark = p.dark, light = p.light;
  const action = critter.deathTimer >= 0 ? 'death' : critter.action;
  const stage  = critter.stage;

  const isBaby  = stage==='baby';
  const isTeen  = stage==='teen';
  const isElder = stage==='old';

  // ── Body position (all relative to 0,0 = ground center) ─────────
  let bobY=0, walkX=0, shakeX=0, armSwing=0, legSwing=0;

  if (action==='death') {
    // Fall sideways - tilt body
    const tilt = Math.min(t - critter.deathTimer, 1.0);
    ctx.rotate(tilt * Math.PI * 0.5);
    // Grey overlay handled after drawing
  } else if (action==='sleep') {
    // Slowly slump sideways
    const slump = Math.min((critter.actionTimer / critter.actionDur), 0.6);
    ctx.rotate(slump * Math.PI * 0.4);
    ctx.translate(0, slump * 4 * SC);
  } else if (action==='idle') {
    bobY = Math.sin(t*1.5) < 0 ? -1 : 0;
  } else if (action==='walk') {
    bobY   = Math.abs(Math.sin(t*2.5))>0.5 ? -1 : 0;
    legSwing = Math.sin(t*2.5)*2;
  } else if (action==='eat') {
    const ep = (t*(1/4.0))%1;
    armSwing = ep<0.2 ? -(ep/0.2)*5 : ep<0.6 ? -5+Math.sin(t*4)*1 : -5*(1-(ep-0.6)/0.4);
    bobY = ep>0.2 && ep<0.7 ? -1 : 0;
  } else if (action==='drink') {
    const dp = (t*(1/3.0))%1;
    armSwing = dp<0.25 ? -(dp/0.25)*6 : dp<0.6 ? -6 : -(1-(dp-0.6)/0.4)*6;
  } else if (action==='chop') {
    const cp = (t*(1/2.5))%1;
    armSwing = cp<0.78 ? -(cp/0.78)*8 : (1-cp)/0.22*7;
    bobY = cp>0.75 && cp<0.90 ? 2 : 0;
  } else if (action==='mine') {
    const mp = (t*(1/2.5))%1;
    armSwing = mp<0.65 ? -(mp/0.65)*9 : (mp-0.65)/0.35*10;
    bobY = mp>0.88 ? 2 : 0;
  } else if (action==='gather') {
    const gp = (t*(1/3.0))%1;
    armSwing = gp<0.4 ? (gp/0.4)*7 : gp<0.6 ? 7 : 7*(1-(gp-0.6)/0.4);
    bobY = gp<0.5 ? Math.round(gp/0.5*4) : Math.round((1-(gp-0.5)/0.5)*4);
  } else if (action==='poop') {
    const pp = (t*(1/5.0))%1;
    shakeX = pp<0.5 ? Math.sin(t*8)*1 : 0;
    bobY = pp<0.5 ? 2 : 0;
  } else if (action==='hunt') {
    armSwing = Math.sin(t*1.5)*3;
    legSwing = Math.sin(t*1.5)*1;
  } else if (action==='fish') {
    const fp = (t*(1/6.0))%1;
    armSwing = fp<0.15 ? -(fp/0.15)*8 : fp<0.25 ? -8+((fp-0.15)/0.10)*14 : 6+Math.sin((fp-0.25)*3)*1.5;
  } else if (action==='dance') {
    const dp = (t*(1/2.0))%1;
    bobY = Math.round(Math.abs(Math.sin(dp*Math.PI*4))*-3);
    walkX = Math.sin(dp*Math.PI*2)*4;
    armSwing = Math.sin(dp*Math.PI*4)*6;
    legSwing = Math.sin(dp*Math.PI*4)*3;
  } else if (action==='build' || action==='smith') {
    const bp = (t*(1/3.0))%1;
    armSwing = bp<0.5 ? (bp/0.5)*7 : (1-bp)/0.5*(-1);
    bobY = bp>0.5 && bp<0.7 ? 1 : 0;
  } else if (action==='cook') {
    armSwing = Math.sin(t*1.5)*4;
  } else if (isElder) {
    bobY = 0; walkX = Math.sin(t*0.4)*1;
  }

  const bx = Math.round(-8 + walkX + shakeX);
  const bw = 14, bh = 10;
  const by = Math.round(-bh + bobY);

  // ── Body ──────────────────────────────────────────────────────────
  const S = SC; // local alias
  function px2(x,y,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x)*S,Math.round(y)*S,S,S); }
  function r(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x)*S,Math.round(y)*S,w*S,h*S); }

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.ellipse(0,2*S,bw*0.5*S,2*S,0,0,Math.PI*2); ctx.fill();

  // Legs
  if (!isBaby) {
    const ls = Math.round(legSwing);
    r(bx+2,  by+bh,   2, 4, dark);
    r(bx+bw-4, by+bh, 2, 4, dark);
    r(bx+2,  by+bh,   2, 4+ls, dark);
    r(bx+bw-4, by+bh, 2, 4-ls, dark);
  } else {
    r(bx+3, by+bh, 4, 3, dark); // baby stub legs
  }

  // Arms
  const as = Math.round(armSwing);
  r(bx-2,   by+2+as, 2, 4, dark); // left arm
  r(bx+bw,  by+2-as, 2, 4, dark); // right arm

  // Body shape
  r(bx, by, bw, bh, col);
  r(bx+1, by+1, bw-2, 1, light);
  r(bx, by+bh-2, bw, 2, dark);

  // ── Head ──────────────────────────────────────────────────────────
  const hbst = isBaby ? 1.35 : isTeen ? 1.1 : 1.0;
  const hw = Math.round(10 * hbst), hh = Math.round(8 * hbst);
  const hx = bx + Math.round((bw-hw)/2);
  const hy = by - hh - 1 + (isElder ? 2 : 0);

  r(hx, hy, hw, hh, col);
  r(hx+1, hy+1, hw-2, 1, light);

  // Eyes
  const ey = hy + Math.round(hh*0.35);
  const sleeping = action==='sleep';
  const dead = action==='death';
  const blink = !sleeping && !dead && Math.sin(t*1.8)>-0.95;

  if (dead) {
    // X eyes
    [hx+2, hx+hw-4].forEach(ex => {
      px2(ex,ey,dark); px2(ex+1,ey+1,dark); px2(ex+1,ey,dark); px2(ex,ey+1,dark);
    });
  } else if (sleeping) {
    // Closed line eyes
    r(hx+2, ey, hw-4, 1, dark);
  } else if (blink) {
    [hx+2, hx+hw-4].forEach(ex => { px2(ex,ey,p.eye); px2(ex+1,ey,p.pupil); });
  }

  // Elder wrinkles
  if (isElder) { px2(hx+2,hy+2,dark); px2(hx+hw-3,hy+2,dark); }

  // Ears (teen+)
  if (!isBaby) {
    const earType = critter.genome.earType;
    if (earType==='cat_ears') {
      r(hx,hy-3,2,3,col); r(hx+hw-2,hy-3,2,3,col);
      px2(hx+1,hy-2,dark); px2(hx+hw-2,hy-2,dark);
    } else if (earType==='dog_floppy') {
      r(hx-2,hy,2,5,col); r(hx+hw,hy,2,5,col);
    } else if (earType==='bear_round') {
      r(hx,hy-2,3,2,col); r(hx+hw-3,hy-2,3,2,col);
    }
  }

  // Mouth
  const my = hy + Math.round(hh*0.65);
  const ms = isBaby ? 'smile' : critter.genome.mouthStyle;
  if (ms==='smile')       { px2(hx+1,my+1,dark); r(hx+2,my+2,hw-4,1,dark); px2(hx+hw-2,my+1,dark); }
  else if (ms==='frown')  { px2(hx+1,my+2,dark); r(hx+2,my+1,hw-4,1,dark); px2(hx+hw-2,my+2,dark); }
  else if (ms==='fangs')  { r(hx+1,my+1,hw-2,1,dark); px2(hx+2,my+2,p.eye); px2(hx+hw-3,my+2,p.eye); }

  // ── Tools ────────────────────────────────────────────────────────
  const tx = bx+bw+1, ty = by+2;
  if (action==='chop') {
    const cp=(t*(1/2.5))%1, ah=ty+Math.max(-6,Math.min(6,as));
    r(tx+1,ah,2,8,dark); r(tx-1,ah,6,3,'#78909c'); r(tx-2,ah+1,2,4,'#90a4ae');
    if(cp>0.73&&cp<0.82){ px2(tx-3,ah+4,'#ffeb3b'); px2(tx-4,ah+3,'#ff8f00'); }
  } else if (action==='mine') {
    const ah=ty+Math.max(-8,Math.min(8,as));
    r(tx,ah+2,2,7,dark); r(tx-3,ah,8,2,'#78909c');
    r(tx-3,ah,3,1,'#90a4ae'); r(tx+4,ah+1,3,1,'#90a4ae');
  } else if (action==='hunt') {
    // BIG SPEAR
    for(let i=0;i<14;i++) px2(tx+i, ty+as-Math.round(i*0.4), '#795548');
    // Spear tip
    r(tx+12,ty+as-6,3,2,'#90a4ae');
    r(tx+13,ty+as-7,2,1,'#cfd8dc');
    px2(tx+14,ty+as-8,'#fff');
  } else if (action==='fish') {
    // Long fishing rod
    const fp=(t*(1/6.0))%1;
    for(let i=0;i<12;i++) px2(tx+Math.round(i*0.3),ty+as-Math.round(i*0.8),'#795548');
    const tipX=tx+4, tipY=ty+as-10;
    const waterY=6;
    for(let i=0;i<waterY-tipY+12;i++) px2(tipX+Math.round(i*0.1),tipY+i,'#b0bec5');
    const fb=Math.round(Math.sin(t*1.5));
    r(tipX-1,tipY+8+fb,3,2,'#f44336'); r(tipX-1,tipY+10+fb,3,2,'#eee');
  } else if (action==='gather') {
    // Pickup claw reaching down
    const gp=(t*(1/3.0))%1;
    const clawY=ty+Math.round(as);
    r(tx,clawY,1,5,dark);          // claw arm
    r(tx-1,clawY+4,3,1,dark);      // claw base
    px2(tx-1,clawY+5,'#78909c');   // left claw
    px2(tx+1,clawY+5,'#78909c');   // right claw
    // Item on ground when reaching
    if(gp>0.15&&gp<0.65){ px2(tx-1,9,'#66bb6a'); px2(tx,8,'#81c784'); }
  } else if (action==='eat') {
    const ep=(t*(1/4.0))%1, fy=ty+Math.round(as);
    r(tx,fy,4,5,'#ef9a9a'); r(tx+1,fy-1,2,2,'#a5d6a7'); r(tx-1,fy+5,6,2,dark);
  } else if (action==='drink') {
    const fy=ty+Math.round(as);
    r(tx,fy,5,6,'#78909c'); r(tx+5,fy+1,2,3,'#90a4ae'); r(tx+1,fy+1,3,1,'#b3e5fc');
  } else if (action==='build') {
    r(tx,ty+as,2,7,dark); r(tx-2,ty+as,6,3,'#ffb74d'); r(tx-2,ty+as,2,4,'#ffa000');
  } else if (action==='smith') {
    const sh=ty+Math.max(-2,Math.min(6,as));
    r(tx,sh,2,6,dark); r(tx-2,sh,6,3,'#546e7a');
    r(tx-3,by+bh+2,9,3,'#455a64'); r(tx-2,by+bh+1,7,2,'#546e7a');
    if(((t*(1/2.5))%1)>0.52&&((t*(1/2.5))%1)<0.65){
      px2(tx-1,sh+3,'#ffeb3b'); px2(tx+1,sh+3,'#ff8f00');
    }
  } else if (action==='cook') {
    const potX=bx-6, potY=by+bh-3;
    r(potX,potY,9,6,'#546e7a'); r(potX-1,potY,11,2,'#607d8b');
    r(potX+1,potY+2,7,3,'#b3e5fc');
    px2(potX+1,potY+6,'#ff8f00'); px2(potX+3,potY+6,'#ff8f00'); px2(potX+5,potY+6,'#ff8f00');
    r(tx,ty+Math.round(armSwing),1,5,dark); r(tx-1,ty+Math.round(armSwing)+4,3,2,'#a1887f');
  }

  // ── Death grey overlay ──────────────────────────────────────────
  if (dead && critter.deathTimer >= 0) {
    const g = Math.min(critter.deathTimer * 0.3, 0.8);
    ctx.fillStyle=`rgba(200,200,200,${g})`;
    ctx.fillRect((bx-2)*S,(hy-1)*S,(bw+4)*S,(hh+bh+8)*S);
  }

  // ── Elder grey tint ─────────────────────────────────────────────
  if (isElder) {
    ctx.fillStyle='rgba(200,200,200,0.10)';
    ctx.fillRect(bx*S,hy*S,bw*S,(hh+bh+6)*S);
  }

  // ── Poop drop ───────────────────────────────────────────────────
  if (action==='poop') {
    const pp=(t*(1/5.0))%1;
    if(pp>0.5){
      const drop=Math.round((pp-0.5)/0.5*6);
      r(bx+Math.round(bw/2)-1,by+bh+drop,4,4,'#5d4037');
      r(bx+Math.round(bw/2),by+bh-1+drop,2,3,'#6d4c41');
    }
  }

  // ── Tail ────────────────────────────────────────────────────────
  const tail = critter.genome.tailType;
  if (tail==='cat_long') {
    const tw=Math.sin(t*2.2)*2;
    for(let i=0;i<7;i++) px2(bx-1-i, by+bh-2-Math.round(i*0.5)+Math.round(tw*i*0.15), col);
  } else if (tail==='dog_wagging') {
    const tw=Math.round(Math.sin(t*3.5)*3);
    for(let i=0;i<5;i++) px2(bx-1-i, by+1-i+tw, col);
  } else if (tail==='lizard') {
    for(let i=0;i<8;i++) px2(bx-1-i, by+bh-1+Math.round(i*0.5), i%2===0?col:dark);
  }
}

// ── THOUGHT BUBBLE RENDERER ────────────────────────────────────────
function drawThought(ctx, sx, sy, text, t) {
  // Bubble outline
  const bw = Math.max(16, text.length*5+8);
  const bh = 14;
  const bx = sx*SC - bw/2;
  const by = sy*SC - bh;

  // Small dots leading to bubble
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(sx*SC, (sy+2)*SC, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx*SC-1, (sy-1)*SC, 2, 0, Math.PI*2); ctx.fill();

  // Bubble bg
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.strokeStyle='rgba(0,0,0,0.5)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill(); ctx.stroke();

  // Text
  ctx.fillStyle='#111';
  ctx.font='bold 8px monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(text, sx*SC, by+bh/2);
}

// ── WORLD GENERATION ──────────────────────────────────────────────
function generateWorld() {
  // Trees across the world
  for (let i=0; i<80; i++) {
    worldState.trees.push({
      x: rndF(50, WORLD_W-50),
      y: H - 44,
      type: rnd(['oak','pine','palm','crystal','dead']),
      size: rnd(['small','medium','large']),
      health: 3,
      regrowTimer: 0,
    });
  }

  // Rocks
  for (let i=0; i<40; i++) {
    worldState.rocks.push({
      x: rndF(50, WORLD_W-50),
      y: H - 44,
      size: rndI(1,3),
      health: 3,
    });
  }

  // Cookie bushes
  for (let i=0; i<30; i++) {
    worldState.bushes.push({
      x: rndF(50, WORLD_W-50),
      y: H - 44,
      cookies: rndI(2,6),
      regrowTimer: 0,
    });
  }

  // Spawn 3 starting critters in forest biome
  for (let i=0; i<3; i++) {
    const c = new Critter(rndF(100, 400), 0, generateGenome(), generatePersonality(), 'adult');
    worldState.critters.push(c);
  }

  // Spawn one egg
  worldState.eggs.push({
    x: rndF(150, 350),
    hatchTimer: 15.0, // seconds until hatch
    genome: generateGenome(),
    personality: generatePersonality(),
    style: rndI(0, 19),
  });
}

// ── BACKGROUND RENDERER ───────────────────────────────────────────
function drawBackground(t) {
  // Sky gradient based on biome
  const biomeIdx = Math.floor((camera.x / WORLD_W) * BIOMES.length);
  const biome = BIOMES[Math.min(biomeIdx, BIOMES.length-1)];

  // Sky
  const skyGrad = ctx.createLinearGradient(0,0,0,H*0.7);
  skyGrad.addColorStop(0, biome.sky);
  skyGrad.addColorStop(1, biome.color);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Draw each biome's background
  BIOMES.forEach(b => {
    const sx = b.x - camera.x;
    if (sx > W || sx + WORLD_W*0.2 < 0) return;
    drawBiomeBackground(ctx, b, sx, t);
  });

  // Ground
  drawGround(t);
}

function drawBiomeBackground(ctx, biome, startX, t) {
  const bw = WORLD_W * 0.2;

  if (biome.name === 'Forest') {
    // Stars/fireflies
    for(let i=0;i<8;i++){
      const fx=(startX+i*80+Math.sin(t*0.5+i)*10)%W;
      const fy=20+i*15;
      ctx.fillStyle=`rgba(255,255,200,${0.3+Math.sin(t+i)*0.2})`;
      ctx.fillRect(fx,fy,2,2);
    }
  } else if (biome.name === 'Moon') {
    // Stars
    for(let i=0;i<20;i++){
      const sx=(startX+i*40)%W;
      ctx.fillStyle='#fff';
      ctx.fillRect(sx,5+i%10*8,1,1);
    }
    // Earth in sky
    ctx.fillStyle='#1565c0';
    ctx.beginPath(); ctx.arc(startX+bw*0.7,30,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2e7d32';
    ctx.beginPath(); ctx.arc(startX+bw*0.7+5,28,8,0,Math.PI*2); ctx.fill();
  } else if (biome.name === 'Wasteland') {
    // Neon glow effects
    ctx.fillStyle=`rgba(0,255,0,${0.02+Math.sin(t*2)*0.01})`;
    ctx.fillRect(startX,0,bw,H);
    // Neon signs
    for(let i=0;i<3;i++){
      const nx=startX+i*bw/3+20;
      ctx.strokeStyle=`rgba(0,255,${100+i*50},0.8)`;
      ctx.lineWidth=2;
      ctx.strokeRect(nx,20,40,20);
    }
  } else if (biome.name === 'Desert') {
    // Sun
    ctx.fillStyle='#ffcc00';
    ctx.beginPath(); ctx.arc(startX+bw*0.5,25,20,0,Math.PI*2); ctx.fill();
    // Heat shimmer
    ctx.fillStyle=`rgba(255,160,0,${0.03+Math.sin(t*3)*0.01})`;
    ctx.fillRect(startX,H-80,bw,30);
  } else if (biome.name === 'Tundra') {
    // Northern lights
    for(let i=0;i<4;i++){
      const alpha=0.04+Math.sin(t*0.5+i)*0.02;
      ctx.fillStyle=`rgba(${i*30},200,${150+i*20},${alpha})`;
      ctx.fillRect(startX,10+i*12,bw,8);
    }
    // Snow falling
    for(let i=0;i<12;i++){
      const sx2=(startX+i*60+t*10)%W;
      const sy2=(t*20+i*25)%(H-60);
      ctx.fillStyle='rgba(255,255,255,0.6)';
      ctx.fillRect(sx2,sy2,2,2);
    }
  }
}

function drawGround(t) {
  // Ground layer
  const groundY = H - 44;
  const biomeIdx = Math.floor((camera.x / WORLD_W) * BIOMES.length);
  const biome = BIOMES[Math.min(biomeIdx, BIOMES.length-1)];

  // Ground fill
  ctx.fillStyle = biome.ground;
  ctx.fillRect(0, groundY, W, H - groundY);

  // Ground top edge texture
  ctx.fillStyle = biome.accent;
  for (let x=0; x<W; x+=4) {
    const h = 1 + Math.round(Math.sin(x*0.3 + camera.x*0.05)*1);
    ctx.fillRect(x, groundY-h, 3, h+1);
  }

  // Draw trees, rocks, bushes
  worldState.trees.forEach(tree => drawTree(ctx, tree, t));
  worldState.rocks.forEach(rock => drawRock(ctx, rock));
  worldState.bushes.forEach(bush => drawBush(ctx, bush, t));
  worldState.buildings.forEach(b => drawBuilding(ctx, b));
}

function drawTree(ctx, tree, t) {
  const sx = Math.round(tree.x - camera.x);
  if (sx < -40 || sx > W+40) return;
  const sy = tree.y;
  const sizes = { small:{tw:6,th:12,trunk:3}, medium:{tw:10,th:20,trunk:5}, large:{tw:16,th:28,trunk:7} };
  const sz = sizes[tree.size];
  const sway = Math.round(Math.sin(t*0.8+tree.x*0.1)*1);

  if (tree.health <= 0) {
    // Stump
    ctx.fillStyle='#5d4037';
    ctx.fillRect(sx-2,sy-4,6,4);
    return;
  }

  // Trunk
  ctx.fillStyle='#5d4037';
  ctx.fillRect(sx-Math.round(sz.trunk/2), sy-sz.th*0.5, sz.trunk, sz.th*0.5);

  // Foliage by type
  if (tree.type==='pine') {
    ctx.fillStyle='#1b5e20';
    for(let i=0;i<3;i++){
      const w=(sz.tw-i*3), iy=sy-sz.th+i*8+sway;
      ctx.fillRect(sx-w/2,iy,w,8);
    }
  } else if (tree.type==='palm') {
    ctx.fillStyle='#33691e';
    for(let i=0;i<5;i++){
      const angle=(i/5)*Math.PI*2+sway*0.1;
      const lx=sx+Math.cos(angle)*sz.tw/2;
      const ly=(sy-sz.th)+Math.sin(angle)*4;
      ctx.fillRect(lx-3,ly-2,6,3);
    }
  } else if (tree.type==='crystal') {
    ctx.fillStyle='#b39ddb';
    const pts=[[sx,sy-sz.th],[sx-sz.tw/2,sy-sz.th*0.5],[sx+sz.tw/2,sy-sz.th*0.5],[sx,sy-sz.th*0.2]];
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    pts.forEach(p=>ctx.lineTo(p[0],p[1])); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(179,157,219,0.3)'; ctx.fill();
  } else { // oak / dead
    ctx.fillStyle = tree.type==='dead' ? '#37474f' : '#2e7d32';
    ctx.beginPath();
    ctx.arc(sx+sway, sy-sz.th, sz.tw/2, 0, Math.PI*2); ctx.fill();
    if (tree.type==='oak') {
      ctx.fillStyle='#388e3c';
      ctx.beginPath(); ctx.arc(sx+sz.tw/4+sway, sy-sz.th+4, sz.tw/3, 0, Math.PI*2); ctx.fill();
    }
  }

  // Cookie on cookie tree (in forest biome)
  if (tree.x < WORLD_W*0.22 && Math.random()<0.001) {
    ctx.fillStyle='#d4a574';
    ctx.beginPath(); ctx.arc(sx+sway, sy-sz.th-4, 3, 0, Math.PI*2); ctx.fill();
  }
}

function drawRock(ctx, rock) {
  const sx = Math.round(rock.x - camera.x);
  if (sx < -20 || sx > W+20) return;
  if (rock.health <= 0) return;
  const sy = rock.y;
  const s = rock.size;
  ctx.fillStyle='#546e7a';
  ctx.fillRect(sx-s*3,sy-s*4,s*6,s*4);
  ctx.fillStyle='#607d8b';
  ctx.fillRect(sx-s*2,sy-s*4,s*2,s*2); // highlight
}

function drawBush(ctx, bush, t) {
  const sx = Math.round(bush.x - camera.x);
  if (sx < -20 || sx > W+20) return;
  const sy = bush.y;
  ctx.fillStyle='#2e7d32';
  ctx.beginPath(); ctx.arc(sx,sy-5,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#388e3c';
  ctx.beginPath(); ctx.arc(sx+4,sy-6,5,0,Math.PI*2); ctx.fill();
  // Cookies on bush
  if (bush.cookies > 0) {
    for(let i=0;i<Math.min(bush.cookies,4);i++){
      const cx=sx-6+i*4, cy=sy-8;
      ctx.fillStyle='#d4a574';
      ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#795548';
      ctx.fillRect(cx-1,cy-1,1,1); // chocolate chip
    }
  }
}

function drawBuilding(ctx, b) {
  const sx = Math.round(b.x - camera.x);
  if (sx < -60 || sx > W+60) return;
  const sy = H - 44;

  // Basic building render by type
  const colors = {
    stone_castle: ['#546e7a','#607d8b'],
    wood_house:   ['#795548','#8d6e63'],
    blacksmith:   ['#37474f','#546e7a'],
    cookfire:     ['#ff8f00','#ffb300'],
    rocket_pad:   ['#455a64','#78909c'],
  };
  const c = colors[b.type] || ['#555','#777'];

  if (b.progress < b.cost) {
    // Under construction — scaffolding
    ctx.fillStyle='rgba(255,180,0,0.4)';
    ctx.strokeStyle='#ffb300';
    ctx.lineWidth=1;
    ctx.strokeRect(sx-15, sy-30*b.progress/b.cost, 30, 30*b.progress/b.cost);
    ctx.fillStyle='#ff8f00';
    ctx.font='7px monospace';
    ctx.textAlign='center';
    ctx.fillText(`[${Math.round(b.progress/b.cost*100)}%]`, sx, sy-32);
  } else {
    ctx.fillStyle=c[0];
    ctx.fillRect(sx-15, sy-40, 30, 40);
    ctx.fillStyle=c[1];
    ctx.fillRect(sx-14, sy-39, 10, 12); // window
    ctx.fillRect(sx+4,  sy-39, 10, 12);
    // Roof
    ctx.fillStyle='#37474f';
    ctx.beginPath();
    ctx.moveTo(sx-18, sy-40);
    ctx.lineTo(sx, sy-54);
    ctx.lineTo(sx+18, sy-40);
    ctx.closePath(); ctx.fill();
  }
}

// ── EGG RENDERER ──────────────────────────────────────────────────
function drawEgg(ctx, egg, t) {
  const sx = Math.round(egg.x - camera.x);
  if (sx < -20 || sx > W+20) return;
  const sy = H - 44;

  const styles = [
    {w:8,h:11,c:'#ef9a9a',d:'#e57373',pattern:'spots'},
    {w:10,h:13,c:'#b39ddb',d:'#7e57c2',pattern:'stripes'},
    {w:7,h:10,c:'#80cbc4',d:'#00897b',pattern:'plain'},
    {w:9,h:12,c:'#ffe082',d:'#f9a825',pattern:'crack'},
    {w:11,h:14,c:'#90a4ae',d:'#546e7a',pattern:'dots'},
    {w:8,h:11,c:'#ff8a65',d:'#e64a19',pattern:'swirl'},
    {w:12,h:15,c:'#f48fb1',d:'#c2185b',pattern:'plaid'},
    {w:7,h:9,c:'#c8e6c9',d:'#388e3c',pattern:'plain'},
    {w:10,h:13,c:'#212121',d:'#ff1744',pattern:'spots'},
    {w:8,h:10,c:'#fff9c4',d:'#f57f17',pattern:'stripes'},
    {w:9,h:12,c:'#ce93d8',d:'#6a1b9a',pattern:'crack'},
    {w:11,h:14,c:'#80deea',d:'#00838f',pattern:'dots'},
    {w:7,h:10,c:'#bcaaa4',d:'#4e342e',pattern:'plain'},
    {w:10,h:13,c:'#fff',d:'#bdbdbd',pattern:'spots'},
    {w:8,h:11,c:'#ffcc02',d:'#e65100',pattern:'swirl'},
    {w:9,h:12,c:'#1a237e',d:'#ff6f00',pattern:'dots'},
    {w:13,h:16,c:'#4caf50',d:'#1b5e20',pattern:'stripes'},
    {w:7,h:9,c:'#f44336',d:'#fff',pattern:'dots'},
    {w:10,h:13,c:'#607d8b',d:'#37474f',pattern:'plain'},
    {w:8,h:11,c:'#e040fb',d:'#4a148c',pattern:'swirl'},
  ];

  const st = styles[egg.style % styles.length];
  const wobble = Math.round(Math.sin(t*2+egg.x)*1);

  ctx.save();
  ctx.translate(sx, sy - st.h/2);
  ctx.rotate(wobble * 0.05);

  // Egg body
  ctx.fillStyle=st.c;
  ctx.beginPath();
  ctx.ellipse(0, 0, st.w/2, st.h/2, 0, 0, Math.PI*2);
  ctx.fill();

  // Pattern
  ctx.fillStyle=st.d;
  if (st.pattern==='spots') {
    [[-3,-3],[2,-1],[-1,3],[3,2]].forEach(([px,py])=>{
      ctx.beginPath(); ctx.arc(px,py,1.5,0,Math.PI*2); ctx.fill();
    });
  } else if (st.pattern==='stripes') {
    for(let i=-3;i<4;i+=3){ ctx.fillRect(-st.w/2,i,st.w,1); }
  } else if (st.pattern==='crack') {
    ctx.lineWidth=0.5; ctx.strokeStyle=st.d;
    ctx.beginPath(); ctx.moveTo(0,-st.h/2); ctx.lineTo(-2,0); ctx.lineTo(1,st.h/3); ctx.stroke();
  } else if (st.pattern==='dots') {
    [[-2,0],[2,0],[0,-3],[0,3]].forEach(([px,py])=>{
      ctx.beginPath(); ctx.arc(px,py,1,0,Math.PI*2); ctx.fill();
    });
  } else if (st.pattern==='swirl') {
    ctx.beginPath(); ctx.arc(0,0,st.w/3,0,Math.PI); ctx.stroke();
  }

  // Hatch glow when close
  const hatchPct = 1 - egg.hatchTimer/15;
  if (hatchPct > 0.7) {
    ctx.strokeStyle=`rgba(255,255,100,${(hatchPct-0.7)*3})`;
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(0,0,st.w/2+2,st.h/2+2,0,0,Math.PI*2); ctx.stroke();
  }

  ctx.restore();

  // Hatch timer bar
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fillRect(sx-10, sy-st.h-8, 20, 3);
  ctx.fillStyle='#76ff03';
  ctx.fillRect(sx-10, sy-st.h-8, 20*(1-egg.hatchTimer/15), 3);
}

// ── RESOURCE HUD ──────────────────────────────────────────────────
function drawHUD() {
  const r = worldState.resources;
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,W,16);
  ctx.fillStyle='#0f0';
  ctx.font='9px monospace';
  ctx.textAlign='left';
  ctx.fillText(
    `POP:${worldState.critters.length}  WOOD:${r.wood||0}  STONE:${r.stone||0}  FOOD:${r.food||0}  METAL:${r.metal||0}  DAY:${worldState.day}`,
    6, 11
  );
  // Speed indicator
  ctx.textAlign='right';
  ctx.fillText(paused ? '[PAUSED]' : `${gameSpeed}x`, W-6, 11);
}

// ── MAIN LOOP ─────────────────────────────────────────────────────
function loop(ts) {
  const rawDt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;
  const dt = paused ? 0 : rawDt * gameSpeed;
  elapsed += dt;
  worldState.day = Math.floor(elapsed / 120); // 2 min per day

  ctx.clearRect(0, 0, W, H);

  // Background
  drawBackground(elapsed);

  // Update + draw eggs
  worldState.eggs.forEach((egg, i) => {
    egg.hatchTimer -= dt;
    drawEgg(ctx, egg, elapsed);
    if (egg.hatchTimer <= 0) {
      // Hatch!
      const c = new Critter(egg.x, 0, egg.genome, egg.personality, 'baby');
      worldState.critters.push(c);
      worldState.eggs.splice(i, 1);
    }
  });

  // Update + draw critters
  worldState.critters.forEach((c, i) => {
    c.updateNeeds(dt);
    c.decideAction(dt);
    c.updateMovement(dt);
    c.draw(elapsed);

    // Remove if dead and faded out
    if (c.deathTimer > 3) {
      worldState.critters.splice(i, 1);
    }
  });

  drawHUD();

  // Camera scroll with momentum
  camera.x += camera.scrollSpeed * dt;
  camera.x = Math.max(0, Math.min(WORLD_W - W, camera.x));
  camera.scrollSpeed *= 0.92;

  requestAnimationFrame(loop);
}

// ── INPUT ──────────────────────────────────────────────────────────
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (window.electronAPI) window.electronAPI.hideWindow();
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const mx = e.clientX, my = e.clientY;

  // Find critter under cursor
  const hit = worldState.critters.find(c => {
    const sx = c.x - camera.x;
    return Math.abs(sx - mx) < 12 && Math.abs((H-44) - my) < 20;
  });

  if (hit) {
    if (e.detail === 1) {
      // Single click = pet
      hit.setThought(':)', 2);
    }
    // Hold = pickup (handled in mousemove/mouseup)
  }
});

canvas.addEventListener('wheel', e => {
  camera.scrollSpeed += e.deltaX * 0.5 + e.deltaY * 0.3;
});

// Keyboard scroll
document.addEventListener('keydown', e => {
  if (e.key==='ArrowLeft')  camera.scrollSpeed -= 80;
  if (e.key==='ArrowRight') camera.scrollSpeed += 80;
  if (e.key==='ArrowUp')    camera.scrollSpeed -= 200;
  if (e.key==='ArrowDown')  camera.scrollSpeed += 200;
  if (e.key===' ')          paused = !paused;
});

// UI buttons
document.getElementById('btn-pause').onclick = () => { paused=!paused; };
document.getElementById('btn-speed').onclick = () => {
  const speeds=[0.5,1,2,4];
  const idx=speeds.indexOf(gameSpeed);
  gameSpeed=speeds[(idx+1)%speeds.length];
  document.getElementById('btn-speed').textContent=gameSpeed+'x';
};
document.getElementById('btn-zoom-in').onclick  = () => { /* zoom placeholder */ };
document.getElementById('btn-zoom-out').onclick = () => { /* zoom placeholder */ };

// Electron IPC
if (window.electronAPI) {
  window.electronAPI.onSetSpeed(v => { gameSpeed=v; });
}

// ── START ─────────────────────────────────────────────────────────
generateWorld();
requestAnimationFrame(ts => { lastTs=ts; requestAnimationFrame(loop); });
