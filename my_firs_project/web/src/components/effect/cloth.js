import { getPointID, smoothstep } from "./utils.js";
import { chimes } from "./chimes.js";

const CLOTH = [
  "Galata taşında yankılanan rüzgar denizi anlatır",
  "Yedi tepe bir nefeste buluşur bu yüksek bakışta",
  "Martılar şahit olur sessizce geçen zamana",
  "Korkulukların ardından şehir bir harita gibi açılır",
  "Eski taş yeni sabahı aynı sabırla karşılar",
  "Bulutlar kuleye değmeden dağılıp yeniden toplanır",
  "Aşağıda sokaklar fısıldar yukarıda rüzgar yanıt verir",
  "Her tuğla bir hikaye her pencere bir bakış",
  "Boğazın ışığı taşın yüzünde ince bir yaldız bırakır",
  "Saatler geçer kule yerinde durur gibi görünür",
  "Ama rüzgar dokundukça ip gibi salınır hatıralar",
  "İstanbul bir nefes alır Galata o nefesi tutar",
  "Tophane çanı uzaklardan bir selam gönderir",
  "İki kule arasında ince bir köprü kurulur sessizce",
  "Ayakkabı sesleri taş merdivenlerde kaybolur",
  "Akşam olunca altın alem güneşi son kez yakalar",
  "Gece indiğinde şehir bir mücevher kutusuna döner",
  "Sabah yine başlar aynı taş aynı rüzgar yeni bir gün"
].join("");

function charForCell(text, i, j, gridW, gridH) {
  if (!text?.length) return " ";
  const colFromRight = gridW - 1 - i;
  const index = colFromRight * gridH + j;
  const ch = text[index % text.length] || " ";
  return ch;
}

const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

function sizeCanvas(canvas, cssW, cssH) {
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}

export function initCloth(root, size = {}) {
  let animationFrameId;
  const clientW = Math.max(80, Math.round(size.width || root.clientWidth || root.parentElement?.clientWidth || 280));
  const clientH = Math.max(120, Math.round(size.height || root.clientHeight || root.parentElement?.clientHeight || 360));

  // Grid density from perde_efekt, scaled to the tower-width container
  const gridW = Math.max(10, Math.min(40, Math.floor(clientW / 10)));
  const gridH = Math.max(14, Math.min(48, Math.floor(clientH / 12)));

  const CONFIG = {
    width: clientW,
    height: clientH,
    gridW,
    gridH,
    gravity: 0.2,
    damping: 0.99,
    iterationsPerFrame: 5,
    compressFactor: 0.02,
    stretchFactor: 1.1,
    mouseSize: 9000,
    mouseStrength: 6,
    contain: false
  };

  const width = CONFIG.width;
  const height = CONFIG.height;
  const { iterationsPerFrame, compressFactor, stretchFactor } = CONFIG;

  const cellWidth = gridW > 1 ? width / (gridW - 1) : width;
  const cellHeight = gridH > 1 ? height / (gridH - 1) : height;
  const fontSize = Math.max(10, Math.min(17, Math.min(cellWidth, cellHeight) * 0.92));

  // Resting grid stays tower-width; large pads let strings swing past the column
  // (sides + upward toward the page top, plus a little bottom droop)
  const swayPadX = Math.round(Math.max(220, clientW * 1.75));
  const swayPadTop = Math.round(Math.max(160, clientH * 0.55));
  const swayPadBottom = Math.round(Math.max(80, clientH * 0.25));
  const canvasW = width + swayPadX * 2;
  const canvasH = height + swayPadTop + swayPadBottom;
  const originX = swayPadX;
  const originY = swayPadTop;

  const c = document.createElement("canvas");
  root.innerHTML = "";
  root.style.position = "relative";
  root.style.overflow = "visible";
  root.appendChild(c);
  sizeCanvas(c, canvasW, canvasH);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Canvas extends beyond the tower column; rest pose stays aligned under railings
  c.style.position = "absolute";
  c.style.left = `${-swayPadX}px`;
  c.style.top = `${-swayPadTop}px`;
  c.style.width = `${canvasW}px`;
  c.style.height = `${canvasH}px`;
  c.style.transform = "none";
  c.style.display = "block";
  c.style.pointerEvents = "auto";
  c.style.overflow = "visible";

  const particles = [];
  const constraints = [];

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
      this.oldPos.reset(this.pos.x, this.pos.y);
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
    constructor({ p1, p2, length, compressFactor, stretchFactor, isSpacer = false }) {
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
          const strength = (smoothstep(CONFIG.mouseSize, -2000, ls) * CONFIG.mouseStrength) / 300;
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
    unbind() {
      this.c.removeEventListener("pointerdown", this.pointerdown);
      window.removeEventListener("pointerup", this.pointerup);
      window.removeEventListener("pointermove", this.pointermove);
    }
  }

  const input = new Input({ c, particles, originX, originY, canvasW, canvasH });

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
            compressFactor: 0.45,
            stretchFactor: 7,
            isSpacer: true
          })
        );
      }
    }
  }

  function drawCode() {
    ctx.font = `${fontSize}px "Playfair Display", "Times New Roman", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#2a241e";

    particles.forEach((p) => {
      if (!p.char || p.char === " ") return;

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
      ctx.fillText(p.char, 0, 0);
    });
  }

  let lastDelta = performance.now();
  function runloop(delta) {
    animationFrameId = requestAnimationFrame(runloop);
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

  try {
    chimes.setCountry("china");
    chimes.enabled = true;
  } catch (_) {
    /* audio is optional */
  }
  animationFrameId = requestAnimationFrame(runloop);

  return () => {
    cancelAnimationFrame(animationFrameId);
    input.unbind();
    root.innerHTML = ""; // cleanup canvas
  };
}
