/* =====================================================
   MOBILE FLAG
===================================================== */

const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;


/* =====================================================
   DOM QUERIES
===================================================== */

const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");
const images = Array.from(document.querySelectorAll(".image"));
const descriptions = document.getElementById("project-descriptions");

/* loader DOM */
const loader = document.getElementById("loader");
const loaderBar = document.querySelector(".loader-progress");


/* =====================================================
   IMAGES PRELOAD
===================================================== */

let loaded = 0;
const total = images.length;

images.forEach(img => {
  if (img.complete) {
    incrementLoader();
  } else {
    img.addEventListener("load", incrementLoader);
    img.addEventListener("error", incrementLoader);
  }
});

function incrementLoader() {
  loaded++;
  const progress = loaded / total;
  loaderBar.style.width = `${progress * 100}%`;

  if (loaded === total) {
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 400);
  }
}


/* =====================================================
   CAMERA STATE
===================================================== */

let originX = 0;
let originY = 0;
let scale = 1;

let targetOriginX = 0;
let targetOriginY = 0;
let targetScale = 1;

const MIN_SCALE = IS_MOBILE ? 0.9 : 0.8;
const MAX_SCALE = IS_MOBILE ? 2.8 : 1.8;

const PAN_EASE = 0.07;
const ZOOM_EASE = 0.045;

let zoomBaseScale = 1;
let zooming = false;

const PAN_PADDING = 220;

let activeProject = null;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;


/* =====================================================
   CAMERA
===================================================== */

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

function cameraLoop() {
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale - scale) * ZOOM_EASE;

  if (Math.abs(targetOriginX - originX) < 0.01) originX = targetOriginX;
  if (Math.abs(targetOriginY - originY) < 0.01) originY = targetOriginY;
  if (Math.abs(targetScale - scale) < 0.0005) scale = targetScale;

  applyTransform();
  requestAnimationFrame(cameraLoop);

}

cameraLoop();

* =====================================================
   ZOOM HELPER
===================================================== */

function zoomAt(screenX, screenY, newScale) {

  const worldX = (screenX - originX) / scale;
  const worldY = (screenY - originY) / scale;

  targetScale = newScale;

  targetOriginX = screenX - worldX * newScale;
  targetOriginY = screenY - worldY * newScale;
}


/* =====================================================
   ZOOM
===================================================== */

viewport.addEventListener("wheel", e => {
  if (activeProject) return;

  e.preventDefault();

  const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;

  const newScale = Math.min(
    Math.max(targetScale * zoomFactor, MIN_SCALE),
    MAX_SCALE
  );

  zoomAt(e.clientX, e.clientY, newScale);
});



/* =====================================================
   PAN
===================================================== */

viewport.addEventListener("mousedown", e => {

  if (IS_MOBILE) return;
  if (activeProject) return;
  if (e.target.classList.contains("image")) return;

  const startX = e.clientX - targetOriginX;
  const startY = e.clientY - targetOriginY;

  function move(ev) {
    targetOriginX = ev.clientX - startX;
    targetOriginY = ev.clientY - startY;

  }

  function up() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  }

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);

});


/* =====================================================
   INITIAL IMAGE SETUP
===================================================== */

const originals = [];

images.forEach(img => {

  // ✅ all images visible on load
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img._x = x;
  img._y = y;
  img._tx = x;
  img._ty = y;

  img._vx = (Math.random() - 0.5) * 0.12;
  img._vy = (Math.random() - 0.5) * 0.12;

  img._floating = true;

  img.style.transform =
    `translate(${x}px, ${y}px) translate(-50%, -50%)`;

  originals.push({ img, x, y });
});


/* =====================================================
   FLOATING MOTION
===================================================== */

function floatImages() {

  if (!activeProject || IS_MOBILE) {

    images.forEach(img => {
      if (!img._floating) return;

      img._tx += img._vx;
      img._ty += img._vy;

      const m = 80;

      // ✅ slightly larger roaming world
      const maxX = window.innerWidth  * 1.6 - m;
      const maxY = window.innerHeight * 1.6 - m;

      if (img._tx < m || img._tx > maxX) img._vx *= -1;
      if (img._ty < m || img._ty > maxY) img._vy *= -1;

      img._x += (img._tx - img._x) * 0.02;
      img._y += (img._ty - img._y) * 0.02;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px) translate(-50%, -50%)`;
    });
  }

  requestAnimationFrame(floatImages);
}

floatImages();


/* =====================================================
   IMAGE CLICK
===================================================== */

images.forEach(img => {
  img.addEventListener("click", e => {
    e.stopPropagation();

    if (IS_MOBILE) {
      openMobileGroup(img.dataset.project);
      return;
    }

    if (activeProject) return;
    activateGroup(img.dataset.project);
  });
});

/* =====================================================
   GROUP LOGIC
===================================================== */

function activateGroup(project) {

  storedScale = targetScale;
  storedOriginX = targetOriginX;
  storedOriginY = targetOriginY;

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? "1" : "0.15";
    img._floating = img.dataset.project !== project;
  });

  /* zoom out */
  targetScale = 0.7;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

setTimeout(() => {

  const groupImages =
    images.filter(i => i.dataset.project === project);

  const IMAGE_SIZE = 320;
  const MIN_GAP = 40;

  const CENTER_X = window.innerWidth * 0.26;
  const CENTER_Y = window.innerHeight * 0.5;

  const SAFE_LEFT   = IMAGE_SIZE * 0.6;
  const SAFE_RIGHT  = window.innerWidth * 0.55 - IMAGE_SIZE * 0.6;
  const SAFE_TOP    = IMAGE_SIZE * 0.6;
  const SAFE_BOTTOM = window.innerHeight - IMAGE_SIZE * 0.6;

  const placed = [];

  groupImages.forEach((img, i) => {

    img.style.width = IMAGE_SIZE + "px";

    let radius = Math.sqrt(i) * (IMAGE_SIZE + 90);
    let angle  = i * 0.9;

    let x, y;
    let tries = 0;

    do {
      x = CENTER_X + Math.cos(angle) * radius;
      y = CENTER_Y + Math.sin(angle) * radius;

      x = Math.max(SAFE_LEFT,  Math.min(SAFE_RIGHT,  x));
      y = Math.max(SAFE_TOP,   Math.min(SAFE_BOTTOM, y));

      tries++;
      angle += 0.35;
      radius += 12;

    } while (
      placed.some(p =>
        Math.hypot(p.x - x, p.y - y) <
        IMAGE_SIZE + MIN_GAP
      ) &&
      tries < 60
    );

    placed.push({ x, y });

    img._x = x;
    img._y = y;
    img._tx = x;
    img._ty = y;

    img.style.zIndex = 1000 + i;
    img.style.transform =
      `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  /* camera return */
  targetScale = 1;
  targetOriginX = 0;
  targetOriginY = 0;

  setTimeout(() => {
    descriptions.classList.add("visible");

    Array.from(descriptions.children).forEach(desc => {
      desc.style.display =
        desc.dataset.project === project ? "block" : "none";
    });

  }, 420);

}, 520);


}

/* =====================================================
   DRAGGING — GROUP ONLY
===================================================== */

images.forEach(img => {
  img.addEventListener("pointerdown", e => {

    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    img.setPointerCapture(e.pointerId);
    img.style.zIndex = 3000;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const startX = img._x;
    const startY = img._y;

    function onMove(ev) {
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;

      img._x = startX + dx;
      img._y = startY + dy;

      img._tx = img._x;
      img._ty = img._y;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px) translate(-50%, -50%)`;
    }

    function onUp(ev) {
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener("pointermove", onMove);
      img.removeEventListener("pointerup", onUp);
    }

    img.addEventListener("pointermove", onMove);
    img.addEventListener("pointerup", onUp);
  });
});

/* =====================================================
   DRAGGABLE PROJECT DESCRIPTION
===================================================== */

let descDragging = false;
let offsetX = 0;
let offsetY = 0;

descriptions.addEventListener("pointerdown", e => {

  if (!descriptions.classList.contains("visible")) return;

  if (
    e.target.tagName === "P" ||
    e.target.tagName === "STRONG" ||
    e.target.tagName === "A"
  ) return;

  const rect = descriptions.getBoundingClientRect();

  descDragging = true;

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  descriptions.setPointerCapture(e.pointerId);
  descriptions.style.cursor = "grabbing";

  e.preventDefault();
});

window.addEventListener("pointermove", e => {
  if (!descDragging) return;

  descriptions.style.left = `${e.clientX - offsetX}px`;
  descriptions.style.top  = `${e.clientY - offsetY}px`;
});

window.addEventListener("pointerup", e => {
  if (!descDragging) return;

  descDragging = false;
  descriptions.releasePointerCapture(e.pointerId);
  descriptions.style.cursor = "grab";
});



/* =====================================================
   ESC RESTORE
===================================================== */

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;
  descriptions.classList.remove("visible");

  images.forEach(img => {
    img._floating = true;
    img.style.opacity = "1";
    img.style.zIndex = 1;
    img.style.width = "100px";
  });

  originals.forEach(o => {
    o.img._x = o.x;
    o.img._y = o.y;
    o.img._tx = o.x;
    o.img._ty = o.y;
    o.img.style.transform =
      `translate(${o.x}px, ${o.y}px) translate(-50%, -50%)`;
  });

  targetScale = storedScale;
  targetOriginX = storedOriginX;
  targetOriginY = storedOriginY;
});

/* =====================================================
   ABOUT PANEL
===================================================== */

const aboutBtn = document.getElementById("about-btn");
const aboutPanel = document.getElementById("about-panel");

aboutBtn.addEventListener("click", () => {
  aboutPanel.hidden = false;
  aboutPanel.classList.toggle("visible");
});

/* =====================================================
   MOBILE TOUCH PINCH ZOOM
===================================================== */

let pinchStartDist = null;

viewport.addEventListener("touchmove", e => {
  if (activeProject) return;

  if (e.touches.length === 2) {
    e.preventDefault();

    const a = e.touches[0];
    const b = e.touches[1];

    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.hypot(dx, dy);

    const midX = (a.clientX + b.clientX) / 2;
    const midY = (a.clientY + b.clientY) / 2;

    if (!pinchStartDist) {
      pinchStartDist = dist;
      return;
    }

    const zoomFactor = dist / pinchStartDist;

    const newScale = Math.min(
      Math.max(targetScale * zoomFactor, MIN_SCALE),
      MAX_SCALE
    );

    zoomAt(midX, midY, newScale);

    pinchStartDist = dist;
  }
}, { passive: false });

viewport.addEventListener("touchend", () => {
  pinchStartDist = null;
});



/* =====================================================
   MOBILE ONE-FINGER PAN
===================================================== */

let lastTouchX = null;
let lastTouchY = null;

viewport.addEventListener("touchstart", e => {
  if (activeProject) return;
  if (e.touches.length !== 1) return;

  lastTouchX = e.touches[0].clientX;
  lastTouchY = e.touches[0].clientY;
}, { passive: false });

viewport.addEventListener("touchmove", e => {
  if (activeProject) return;

  if (e.touches.length === 1) {
    e.preventDefault();

    const touch = e.touches[0];

    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;

    targetOriginX += dx;
    targetOriginY += dy;

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
}, { passive: false });

viewport.addEventListener("touchend", () => {
  lastTouchX = null;
  lastTouchY = null;
});




/* =====================================================
   MOBILE STACKED PROJECT VIEW
===================================================== */

const mobileProject = document.getElementById("mobile-project");
const mobileStack = document.getElementById("mobile-stack");
const mobileExit = document.getElementById("mobile-exit");

function openMobileGroup(project) {

  activeProject = project;
  mobileStack.innerHTML = "";

  const groupImages =
    images.filter(i => i.dataset.project === project);

  const description =
    Array.from(descriptions.children)
      .find(d => d.dataset.project === project);

  mobileStack.appendChild(groupImages[0].cloneNode());

  if (description) {
    mobileStack.appendChild(description.cloneNode(true));
  }

  groupImages.slice(1).forEach(img => {
    mobileStack.appendChild(img.cloneNode());
  });

  mobileProject.hidden = false;
}

mobileExit.addEventListener("click", () => {
  mobileProject.hidden = true;
  mobileStack.innerHTML = "";
  activeProject = null;
});