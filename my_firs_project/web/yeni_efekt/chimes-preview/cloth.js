import { getPointID, smoothstep } from "./utils.js";
import { chimes } from "./chimes.js";

const AREA_W = 492;
const AREA_H = 468;
const STRINGS_PAD = 80;

const CLOTH = [
  "读万卷书不如行万里路——而真正的智者是先把书读进心里再把路走成自己的答案",
  "山高水长路在脚下——你会发现困住你的从来不是山与水而是你停下来的借口",
  "海到无边天作岸——边界往往是想象力的终点而不是世界的终点",
  "行到水穷处坐看云起时——尽头并非绝境只是另一种开始在安静里现身",
  "千里之行始于足下——最难的一步不是最后一步而是你终于愿意迈出的第一步",
  "世界是一本书不旅行的人只读了一页——而只走不思索的人翻了很多页却什么也没读懂",
  "船停在港湾里最安全却不是造船的目的——舒适是暂停不是归宿",
  "人生要么大胆冒险要么在安全和遗憾之间反复权衡最终两头落空",
  "真正的发现之旅不在于寻找新风景而在于拥有新眼睛——同一片天空换了心境便是新世界",
  "每年去一个从未去过的地方——不是为了收集地名而是为了让熟悉的自己感到陌生",
  "离开海岸才看得见新的海洋——恐惧常打扮成谨慎让你把岸边误认作远方",
  "旅行让人谦逊因为看见自己有多么渺小——渺小不是羞辱而是回到真实比例的开始",
  "最好的时刻是踏入未知之地——因为那时你暂不被旧故事定义",
  "旅行先夺去你的言语再把你变成说书人——沉默是理解的房间话语是以后才打开的门",
  "与其抵达不如好好赶路——抵达是地图上的点赶路才是生命本身",
  "心之所向素履以往——方向对了脚步慢一点也仍然在前进",
  "长风破浪会有时直挂云帆济沧海——时运会来但帆必须事先挂好",
  "愿你的脚步比目光走得更远——看见是开始抵达是责任"
].join("　");

const CONFIG = {
  width: AREA_W,
  height: AREA_H,
  gridW: 36,
  gridH: 40,
  gravity: 0.2,
  damping: 0.99,
  iterationsPerFrame: 5,
  compressFactor: 0.02,
  stretchFactor: 1.1,
  mouseSize: 5000,
  mouseStrength: 4,
  contain: false
};

const FONT =
  '"Songti SC", "STSong", "Noto Serif SC", "Hiragino Mincho ProN", "SimSun", serif';

function charForCell(text, i, j, gridW, gridH) {
  if (!text?.length) return " ";
  const colFromRight = gridW - 1 - i;
  const index = colFromRight * gridH + j;
  return text[index % text.length] || " ";
}

const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
let c;

function sizeCanvas(canvas, cssW, cssH) {
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}

function fitLayout() {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const clothAspect = AREA_W / AREA_H;
  const maxW = viewW * 0.72;
  const maxH = viewH * 0.86;
  let w = maxW;
  let h = w / clothAspect;
  if (h > maxH) {
    h = maxH;
    w = h * clothAspect;
  }
  CONFIG.width = Math.round(w);
  CONFIG.height = Math.round(h);
}

function main() {
  fitLayout();
  const width = CONFIG.width;
  const height = CONFIG.height;
  const { gridW, gridH, iterationsPerFrame, compressFactor, stretchFactor } =
    CONFIG;
  const cellWidth = width / (gridW - 1);
  const cellHeight = height / (gridH - 1);
  const root = document.getElementById("container");
  const pad = STRINGS_PAD;
  const canvasW = width + pad * 2;
  const canvasH = height + pad * 2;
  const fontSize = Math.max(9, Math.min(16, cellHeight * 0.95));
  const roofClearance = Math.ceil(fontSize * 0.7);
  const originX = pad;
  const originY = pad + roofClearance;

  const charCanvases = {};
  for (const ch of new Set(CLOTH)) {
    if (ch === " " || ch === "　") continue;
    const size = Math.ceil(fontSize * 1.35);
    const off = document.createElement("canvas");
    off.width = Math.ceil(size * dpr);
    off.height = Math.ceil(size * dpr);
    off._size = size;
    const octx = off.getContext("2d");
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.font = `${fontSize}px ${FONT}`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = "#2a2620";
    octx.fillText(ch, size / 2, size / 2);
    charCanvases[ch] = off;
  }

  c = document.createElement("canvas");
  root.innerHTML = "";
  root.appendChild(c);
  sizeCanvas(c, canvasW, canvasH);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Center the canvas in the viewport
  c.style.position = "absolute";
  c.style.left = "50%";
  c.style.top = "50%";
  c.style.transform = "translate(-50%, -50%)";
  c.style.width = `${canvasW}px`;
  c.style.height = `${canvasH}px`;

  const particles = [];
  const constraints = [];
  new Input({ c, particles, originX, originY, canvasW, canvasH });

  for (let i = 0; i < gridW; i++) {
    for (let j = 0; j < gridH; j++) {
      const x = i * cellWidth;
      const y = j * cellHeight;
      const id = getPointID(j, i, gridH);
      const pinned = j === 0;
      const char = charForCell(CLOTH, i, j, gridW, gridH);
      particles.push(new Particle({ x, y, pinned, id, char }));
    }
  }

  for (let i = 0; i < gridW; i++) {
    for (let j = 0; j < gridH; j++) {
      const id = getPointID(j, i, gridH);
      const p = particles[id];

      if (j < gridH - 1) {
        const bottomP = particles[getPointID(j + 1, i, gridH)];
        const constraint = new Constraint({
          p1: p,
          p2: bottomP,
          length: cellHeight,
          compressFactor,
          stretchFactor
        });
        constraints.push(constraint);
        p.downConstraint = constraint;
      }

      if (i < gridW - 1) {
        const rightP = particles[getPointID(j, i + 1, gridH)];
        constraints.push(
          new Constraint({
            p1: p,
            p2: rightP,
            length: cellWidth,
            compressFactor: 0.6,
            stretchFactor: 4,
            isSpacer: true
          })
        );
      }
    }
  }

  function drawCode() {
    particles.forEach((p) => {
      if (!p.char || p.char === " " || p.char === "　") return;
      const img = charCanvases[p.char];
      if (!img) return;

      let cos = 1;
      let sin = 0;
      const constraint = p.downConstraint;
      if (constraint) {
        const dx = constraint.p2.pos.x - constraint.p1.pos.x;
        const dy = constraint.p2.pos.y - constraint.p1.pos.y;
        const angle = Math.atan2(dy, dx) - Math.PI / 2;
        cos = Math.cos(angle);
        sin = Math.sin(angle);
      }

      const size = img._size;
      const half = size / 2;
      const x = p.pos.x + originX;
      const y = p.pos.y + originY;
      ctx.setTransform(
        cos * dpr,
        sin * dpr,
        -sin * dpr,
        cos * dpr,
        x * dpr,
        y * dpr
      );
      ctx.drawImage(img, -half, -half, size, size);
    });
  }

  let lastDelta = performance.now();
  function runloop(delta) {
    requestAnimationFrame(runloop);
    const dt = Math.min(32, Math.max(1, delta - lastDelta));
    lastDelta = delta;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasW, canvasH);

    particles.forEach((p) => p.update(dt));
    for (let i = 0; i < iterationsPerFrame; i++) {
      for (let j = 0; j < constraints.length; j++) constraints[j].solve();
    }
    if (CONFIG.contain) particles.forEach((p) => p.contain());

    drawCode();
  }

  requestAnimationFrame(runloop);
}

class Input {
  constructor({ c, particles, originX, originY, canvasW, canvasH }) {
    this.c = c;
    this.particles = particles;
    this.originX = originX;
    this.originY = originY;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.mousePos = new Vec2();
    this.grabRadius = 24;
    this.chimeRadiusSq = 55 * 55;
    this.bind();
  }
  localPoint(e) {
    const rect = this.c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.canvasW - this.originX,
      y: ((e.clientY - rect.top) / rect.height) * this.canvasH - this.originY
    };
  }
  pointerdown(e) {
    const { x, y } = this.localPoint(e);
    this.mousePos.reset(x, y);
    for (const p of this.particles) {
      if (this.mousePos.subtractNew(p.pos).length < this.grabRadius) {
        this.grabbedParticle = p;
        this.grabbedParticle.originalPinnedState = this.grabbedParticle.pinned;
        this.grabbedParticle.pinned = true;
        chimes.strike({
          x,
          y,
          particle: p,
          gridW: CONFIG.gridW,
          intensity: 0.85,
          force: true
        });
        break;
      }
    }
  }
  pointerup() {
    if (this.grabbedParticle) {
      this.grabbedParticle.pinned = this.grabbedParticle.originalPinnedState;
      this.grabbedParticle = null;
    }
  }
  pointermove(e) {
    const { x, y } = this.localPoint(e);
    this.mousePos.reset(x, y);

    if (this.grabbedParticle) {
      this.grabbedParticle.pos.reset(x, y);
      this.grabbedParticle.oldPos.reset(x, y);
    }

    let nearest = null;
    let nearestLs = Infinity;

    for (const p of this.particles) {
      const diff = this.mousePos.subtractNew(p.pos);
      const ls = diff.lengthSquared;
      if (ls < CONFIG.mouseSize) {
        const a = diff.angle - Math.PI;
        const strength =
          (smoothstep(CONFIG.mouseSize, -2000, ls) * CONFIG.mouseStrength) /
          300;
        p.applyForce(new Vec2(Math.cos(a) * strength, Math.sin(a) * strength));
      }
      if (ls < this.chimeRadiusSq && ls < nearestLs) {
        nearest = p;
        nearestLs = ls;
      }
    }

    if (nearest) {
      const closeness = 1 - nearestLs / this.chimeRadiusSq;
      chimes.strike({
        x,
        y,
        particle: nearest,
        gridW: CONFIG.gridW,
        intensity: 0.2 + closeness * 0.7
      });
    } else {
      chimes.lastParticleId = -1;
    }
  }
  bind() {
    this.pointerdown = this.pointerdown.bind(this);
    this.pointerup = this.pointerup.bind(this);
    this.pointermove = this.pointermove.bind(this);
    this.c.addEventListener("pointerdown", this.pointerdown);
    window.addEventListener("pointerup", this.pointerup);
    window.addEventListener("pointermove", this.pointermove);
    this.c.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}

class Vec2 {
  constructor(x = 0, y = 0) {
    this.reset(x, y);
  }
  zero() {
    this.reset(0, 0);
  }
  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  clone() {
    return new Vec2(this.x, this.y);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  subtractNew(v) {
    return this.clone().subtract(v);
  }
  scale(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
  get lengthSquared() {
    return this.x ** 2 + this.y ** 2;
  }
  get length() {
    return Math.hypot(this.x, this.y);
  }
  get angle() {
    return Math.atan2(this.y, this.x);
  }
  [Symbol.iterator]() {
    const values = [this.x, this.y];
    let i = 0;
    return {
      next() {
        if (i < values.length) return { value: values[i++], done: false };
        return { done: true };
      }
    };
  }
}

class Particle {
  constructor({ x, y, pinned, id, char } = {}) {
    this.pos = new Vec2(x, y);
    this.oldPos = new Vec2(x, y);
    this.velocity = new Vec2();
    this.acceleration = new Vec2();
    this.pinned = pinned;
    this.id = id;
    this.char = char;
    this.gravityVec = new Vec2();
  }
  contain() {
    if (this.pinned) return;
    const radius = 4;
    if (this.pos.x < radius) {
      this.pos.x = radius;
      this.oldPos.x = this.pos.x + Math.abs(this.oldPos.x - this.pos.x) * 0.8;
    } else if (this.pos.x > CONFIG.width - radius) {
      this.pos.x = CONFIG.width - radius;
      this.oldPos.x = this.pos.x - Math.abs(this.oldPos.x - this.pos.x) * 0.8;
    }
    if (this.pos.y < radius) {
      this.pos.y = radius;
      this.oldPos.y = this.pos.y + Math.abs(this.oldPos.y - this.pos.y) * 0.8;
    } else if (this.pos.y > CONFIG.height - radius) {
      this.pos.y = CONFIG.height - radius;
      this.oldPos.y = this.pos.y - Math.abs(this.oldPos.y - this.pos.y) * 0.8;
    }
  }
  update(delta) {
    if (this.pinned) {
      this.acceleration.zero();
      return;
    }
    this.velocity.reset(
      (this.pos.x - this.oldPos.x) * CONFIG.damping,
      (this.pos.y - this.oldPos.y) * CONFIG.damping
    );
    this.oldPos.reset(...this.pos);
    const dd = delta ** 2;
    this.gravityVec.reset(0, CONFIG.gravity / dd);
    this.applyForce(this.gravityVec);
    this.pos.x += this.velocity.x + this.acceleration.x * dd;
    this.pos.y += this.velocity.y + this.acceleration.y * dd;
    this.acceleration.reset();
  }
  applyForce(v) {
    this.acceleration.add(v);
  }
}

class Constraint {
  constructor({
    p1,
    p2,
    length,
    compressFactor,
    stretchFactor,
    isSpacer = false
  }) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length;
    this.isSpacer = isSpacer;
    this.compressFactor = compressFactor;
    this.stretchFactor = stretchFactor;
    this.minLength = length * compressFactor;
    this.maxLength = length * stretchFactor;
  }
  solve() {
    const dx = this.p2.pos.x - this.p1.pos.x;
    const dy = this.p2.pos.y - this.p1.pos.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return;

    let targetLength = this.length;
    if (distance < this.minLength) targetLength = this.minLength;
    else if (distance > this.maxLength) targetLength = this.maxLength;
    else return;

    const percent = (targetLength - distance) / distance / 2;
    const offsetX = dx * percent;
    const offsetY = dy * percent;

    if (!this.p1.pinned) {
      this.p1.pos.x -= offsetX;
      this.p1.pos.y -= offsetY;
    }
    if (!this.p2.pinned) {
      this.p2.pos.x += offsetX;
      this.p2.pos.y += offsetY;
    }
  }
}

chimes.setCountry("china");
chimes.enabled = true;
main();
