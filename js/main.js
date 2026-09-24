/* =====================================================================
   Dearday.lk — Cinematic glass invitation
   ---------------------------------------------------------------------
   1. Data binding        (invitation.config.js → DOM)
   2. Asset loader        (assets.config.js → <img>, never broken)
   3. Intro               (poster → film → invitation, with fallbacks)
   4. Theatre             (one scroll-scrubbed camera move)
   5. Parallax            (mouse depth + world drift)
   6. RSVP, countdown, calendar, sound
   ===================================================================== */
(() => {
  "use strict";

  const D = window.DEARDAY || {};
  const A = D.assets || {};
  const INV = D.invitation || {};

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const vw = (n) => (innerWidth * n) / 100;
  const vh = (n) => (innerHeight * n) / 100;

  const isMobile = matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1024px)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const cinematic = hasGsap && !reduced;
  const skipIntro = new URLSearchParams(location.search).has("skip");
  const Z = isMobile ? 0.55 : 1; // depth budget: calmer 3D on phones

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (cinematic) root.classList.add("is-cinematic");
  if (A.tone) root.dataset.tone = A.tone;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);

  /* =================================================================
     1. DATA
     ================================================================= */
  const first = (n) => (n || "").trim().split(/\s+/)[0] || "";
  const eventDay = INV.date ? new Date(`${INV.date}T12:00:00Z`) : null;
  const fmt = (o) => (eventDay && !isNaN(eventDay) ? new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(eventDay) : "");
  const eventStart = (() => {
    if (!INV.date) return null;
    const d = new Date(`${INV.date}T${INV.time || "00:00"}:00${INV.timezone || ""}`);
    return isNaN(d) ? null : d;
  })();

  const data = {
    ...INV,
    brideFirst: first(INV.brideName),
    groomFirst: first(INV.groomName),
    brideInitial: first(INV.brideName).charAt(0),
    groomInitial: first(INV.groomName).charAt(0),
    weekday: fmt({ weekday: "long" }),
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "long" }),
    year: fmt({ year: "numeric" })
  };
  data.dateShort = eventDay ? `${data.weekday} · ${data.day} ${data.month} ${data.year}` : "";

  function bindData() {
    $$("[data-bind]").forEach((el) => {
      const v = get(data, el.dataset.bind);
      if (v == null || v === "") el.hidden = true;
      else el.textContent = v;
    });
    $$("[data-bind-href]").forEach((el) => {
      const v = get(data, el.dataset.bindHref);
      if (v) el.href = v;
      else el.hidden = true;
    });
    if (data.brideFirst && data.groomFirst) {
      document.title = `${data.brideFirst} & ${data.groomFirst} · ${INV.eventType || "Wedding"} Invitation`;
    }
    const brand = $("#brand");
    if (INV.brand && INV.brand.url) brand.href = INV.brand.url;
  }

  /* =================================================================
     2. ASSETS
     Each candidate URL is probed once and cached, so a missing file is
     requested a single time and no element ever shows a broken image.
     ================================================================= */
  const probes = new Map();
  function probe(url) {
    if (!probes.has(url)) {
      probes.set(url, new Promise((res) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => res(true);
        i.onerror = () => res(false);
        i.src = url;
      }));
    }
    return probes.get(url);
  }

  function candidates(spec) {
    const out = [];
    const push = (v) => [].concat(v || []).forEach((u) => u && !out.includes(u) && out.push(u));
    spec.split(",").map((s) => s.trim()).filter(Boolean).forEach((key) => {
      if (isMobile) push(A[`${key}Mobile`]);
      push(A[key]);
    });
    return out;
  }

  function loadEl(img) {
    if (img._loading) return img._loading;
    let list = [];
    if (img.dataset.asset) list = candidates(img.dataset.asset);
    else if (img.dataset.photo) list = [].concat(get(INV, img.dataset.photo) || []);
    else if (img.dataset.src) list = [img.dataset.src];

    img._loading = (async () => {
      for (const url of list) {
        if (await probe(url)) {
          img.src = url;
          try { await img.decode(); } catch (e) { /* still usable */ }
          img.classList.add("is-loaded");
          return true;
        }
      }
      img.classList.add("is-missing");
      img.dispatchEvent(new Event("missing"));
      return false;
    })();
    return img._loading;
  }

  const assetImgs = (el) => $$("img[data-asset], img[data-photo], img[data-src]", el);
  const loadWithin = (el) => (el ? Promise.all(assetImgs(el).map(loadEl)) : Promise.resolve([]));

  /* Every .glass gets the same physical layers: texture, reflection,
     a light sweep and a bevelled edge. */
  function decorateGlass(g) {
    if (g.dataset.glass) return;
    g.dataset.glass = "1";
    const layer = (cls, asset) => {
      const el = asset ? new Image() : document.createElement("span");
      el.className = `glass__layer ${cls}`;
      if (asset) { el.alt = ""; el.dataset.asset = asset; }
      return el;
    };
    const sweep = layer("glass__sweep");
    sweep.append(layer("", "lightSweep"));
    g.prepend(layer("glass__tex", "glassTexture"), layer("glass__refl", "glassReflection"), sweep, layer("glass__edge"));
  }

  /* Soft bokeh stand-in, only when no real bokeh asset is supplied. */
  function fallbackOrbs() {
    const box = $(".world__orbs");
    const n = isMobile ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      const size = 40 + Math.random() * (isMobile ? 90 : 160);
      Object.assign(s.style, {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        opacity: (0.08 + Math.random() * 0.22).toFixed(2)
      });
      box.append(s);
      if (cinematic) {
        gsap.to(s, {
          x: `random(-40, 40)`, y: `random(-30, 30)`,
          duration: `random(9, 16)`, ease: "sine.inOut", yoyo: true, repeat: -1
        });
      }
    }
  }

  /* =================================================================
     3. STORY FRAMES (built from the gallery list)
     ================================================================= */
  function buildStoryFrames() {
    const track = $("#storyTrack");
    const items = [].concat(INV.gallery || [])
      .map((g) => (typeof g === "string" ? { src: g } : g))
      .filter((g) => g && g.src);
    items.forEach((g) => {
      const fig = document.createElement("figure");
      fig.className = "glass story-frame";
      const img = new Image();
      img.alt = g.caption || "";
      img.dataset.src = g.src;
      fig.append(img);
      if (g.caption) {
        const cap = document.createElement("figcaption");
        cap.textContent = g.caption;
        fig.append(cap);
      }
      track.append(fig);
    });
  }

  /* Resolves once we know which story photos really exist. */
  let storyReady = null;
  function loadStory() {
    if (storyReady) return storyReady;
    const frames = $$(".story-frame");
    storyReady = Promise.all(frames.map((f) => loadEl($("img", f)).then((ok) => { if (!ok) f.remove(); })))
      .then(() => {
        const scene = $("#scene-story");
        if (scene && !$(".story-frame", scene)) scene.remove();
      });
    return storyReady;
  }

  /* =================================================================
     4. INTRO
     ================================================================= */
  const intro = $("#intro");
  const video = $("#introVideo");
  const poster = $(".intro__poster");
  const ui = $("#introUi");
  const skipBtn = $("#skipBtn");
  const buffer = $("#introBuffer");
  const veil = $("#introVeil");
  const envelope = $("#envelope");

  let videoState = "pending"; // pending | ready | failed
  let opened = false;
  let finished = false;

  function setupVideo() {
    if (reduced) { videoState = "failed"; return; }
    const list = [];
    if (isMobile && A.openingMobileVideo) list.push(A.openingMobileVideo);
    if (A.openingVideo) list.push(A.openingVideo);
    if (A.openingVideoWebm && video.canPlayType("video/webm")) list.push(A.openingVideoWebm);

    let i = 0;
    const next = () => {
      if (videoState === "failed") return;
      if (i >= list.length) {
        videoState = "failed";
        video.removeAttribute("src");
        loadWithin(envelope); // warm the still-image fallback
        return;
      }
      video.src = list[i++];
    };
    video.addEventListener("error", () => { if (!opened || videoState !== "ready") next(); });
    video.addEventListener("loadedmetadata", () => { videoState = "ready"; }, { once: true });
    next();
  }

  function open() {
    if (opened) return;
    opened = true;
    drainQueue();
    if (!hasGsap) return finishIntro();

    gsap.to(ui, { autoAlpha: 0, y: 12, duration: 0.9, ease: "power2.inOut" });
    if (videoState !== "failed" && !reduced) {
      playVideo().then((ok) => {
        if (ok) return;
        videoState = "failed";
        video.pause();
        fallbackSequence();
      });
    } else {
      fallbackSequence();
    }
  }

  function playVideo() {
    return new Promise((resolve) => {
      let settled = false;
      let started = false;
      const done = (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        resolve(v);
      };
      const showBuffer = () => buffer.classList.add("is-on");
      const hideBuffer = () => buffer.classList.remove("is-on");
      let bufferTimer = setTimeout(showBuffer, 500);
      const watchdog = setTimeout(() => { video.pause(); hideBuffer(); done(false); }, 7000);

      video.addEventListener("waiting", () => { clearTimeout(bufferTimer); bufferTimer = setTimeout(showBuffer, 400); });
      video.addEventListener("playing", () => { clearTimeout(bufferTimer); hideBuffer(); });

      video.addEventListener("playing", () => {
        started = true;
        gsap.to(video, { opacity: 1, duration: 1.1, ease: "power1.inOut" });
        gsap.to(poster, { opacity: 0, duration: 1.1, delay: 0.6 });
        gsap.to(skipBtn, { autoAlpha: 1, duration: 0.8, delay: 1.6 });
        done(true);
      }, { once: true });

      // Begin the hand-off just before the last frame so the film
      // dissolves into the live scene instead of stopping.
      video.addEventListener("timeupdate", () => {
        if (video.duration && video.currentTime >= video.duration - 0.7) finishIntro();
      });
      video.addEventListener("ended", finishIntro, { once: true });
      video.addEventListener("error", () => { if (started) finishIntro(); else done(false); });

      // A stalled stream should never trap the guest in the intro.
      let last = -1, still = 0;
      const stall = setInterval(() => {
        if (finished) return clearInterval(stall);
        if (!started) return;
        still = video.currentTime === last ? still + 1 : 0;
        last = video.currentTime;
        if (still >= 6) { clearInterval(stall); finishIntro(); }
      }, 1000);

      const p = video.play();
      if (p && p.catch) p.catch(() => done(false));
    });
  }

  async function fallbackSequence() {
    const [back, front] = await Promise.all([".envelope__back", ".envelope__front"].map((s) => loadEl($(s, envelope))));
    await loadWithin(envelope);
    if (!reduced && back && front) envelopeSequence();
    else bloomSequence();
  }

  /* Still-image envelope: ribbon → seal → flap → glass card rises. */
  function envelopeSequence() {
    envelope.classList.add("is-active");
    const body = $(".envelope__body", envelope);
    gsap.set(body, { perspective: 1400 });
    const tl = gsap.timeline({ onComplete: finishIntro });
    tl.to(poster, { opacity: 0.3, duration: 1.4, ease: "power1.inOut" }, 0)
      .from(body, { autoAlpha: 0, y: 40, scale: 0.95, duration: 1.5, ease: "power3.out" }, 0)
      .to(".envelope__ribbon", { autoAlpha: 0, y: -16, scaleX: 1.06, duration: 1.1, ease: "power2.inOut" }, "+=0.2")
      .to(".envelope__seal", { autoAlpha: 0, scale: 0.92, duration: 0.8, ease: "power2.inOut" }, "<0.15")
      .to(".envelope__flap", { rotationX: 180, duration: 1.4, ease: "power2.inOut" }, "-=0.3")
      .set(".envelope__flap", { zIndex: 1 }, "-=0.7")
      .to(".envelope__card", { yPercent: -62, duration: 1.7, ease: "power3.inOut" }, "-=0.4")
      .to(".envelope__card", { "--sweep": "220%", duration: 1.6, ease: "power2.inOut" }, "<0.3")
      .to(body, { scale: 1.6, y: vh(12), autoAlpha: 0, duration: 1.4, ease: "power2.in" }, "-=0.3")
      .to(veil, { opacity: 0.3, duration: 0.7, ease: "sine.in" }, "<0.5");
  }

  /* No film, no envelope: a slow push-in through warm light. */
  function bloomSequence() {
    gsap.timeline({ onComplete: finishIntro })
      .to(poster, { scale: 1.16, duration: reduced ? 0.4 : 2, ease: "power2.in" }, 0)
      .to(veil, { opacity: reduced ? 0 : 0.45, duration: 1.1, ease: "sine.in" }, reduced ? 0 : 0.9);
  }

  function teardownVideo() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }

  function finishIntro() {
    if (finished) return;
    finished = true;

    if (!hasGsap) {
      intro.classList.add("is-done");
      teardownVideo();
      return unlock();
    }

    buffer.classList.remove("is-on");
    gsap.killTweensOf(skipBtn);
    gsap.to(skipBtn, { autoAlpha: 0, duration: 0.4 });

    const quick = skipIntro || reduced;
    const tl = gsap.timeline({ onComplete: unlock });
    // Depth hand-off: the film moves past the camera as the scene settles.
    tl.to(intro, {
      opacity: 0,
      scale: quick ? 1 : 1.05,
      filter: quick || isMobile ? "none" : "blur(6px)",
      duration: quick ? 0.01 : 1.6,
      ease: "power2.inOut"
    }, 0);
    tl.call(() => { intro.classList.add("is-done"); teardownVideo(); }, null, quick ? 0.02 : 1.6);
    tl.add(revealInvite(quick), quick ? 0 : 0.35);
  }

  /* =================================================================
     5. THE INVITATION ARRIVES
     ================================================================= */
  const card = $("#inviteCard");
  const cardGlass = $(".card", card);
  const reveals = $$(".reveal", card);
  const flowerTopWrap = $("#flowerTop").parentElement;
  const flowerBottomWrap = $("#flowerBottom").parentElement;

  function prepareInvite() {
    if (!hasGsap) return;
    gsap.set(card, { scale: 0.95, z: -60 * Z });
    gsap.set([flowerTopWrap, flowerBottomWrap], { autoAlpha: 0 });
    gsap.set("#flowerTop", { x: -vw(3), y: -vh(3), z: 120 * Z });
    gsap.set("#flowerBottom", { x: vw(3), y: vh(3), z: 140 * Z });
    gsap.set(reveals, { autoAlpha: 0, y: 14, filter: "blur(6px)" });
    gsap.set("#scrollCue", { autoAlpha: 0 });
  }

  function revealInvite(quick) {
    const d = quick ? 0.01 : 1;
    const tl = gsap.timeline();
    tl.to(card, { scale: 1, z: 0, duration: 2.4 * d, ease: "power3.out" }, 0)
      .to([flowerTopWrap, flowerBottomWrap], { autoAlpha: 1, duration: 1.8 * d, ease: "power1.out" }, 0.2 * d)
      .to(["#flowerTop", "#flowerBottom"], { x: 0, y: 0, z: 0, duration: 2.6 * d, ease: "power3.out" }, 0.1 * d)
      .to(reveals, {
        autoAlpha: 1, y: 0, filter: "blur(0px)",
        duration: 1.2 * d, ease: "power2.out", stagger: 0.12 * d
      }, 0.4 * d)
      .fromTo(cardGlass, { "--sweep": "-120%" }, { "--sweep": "220%", duration: 2.8 * d, ease: "power2.inOut" }, 0.9 * d)
      .to("#scrollCue", { autoAlpha: 1, duration: 0.8 * d }, 2 * d);
    return tl;
  }

  let lenis = null;
  function unlock() {
    document.body.classList.remove("is-locked");
    if (cinematic) {
      if (!isMobile && finePointer && window.Lenis) {
        lenis = new Lenis({ duration: 1.35, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      }
      Promise.race([loadStory(), new Promise((r) => setTimeout(r, 1500))]).then(() => {
        buildTheatre();
        // If late results removed the story, rebuild without it.
        loadStory().then(() => { if (theatreHasStory && !$("#scene-story")) buildTheatre(); });
      });
    } else {
      loadStory();
    }
    setupSound();
  }

  /* =================================================================
     6. THEATRE — one continuous, scroll-scrubbed camera move
     ================================================================= */
  let theatreTl = null;
  let theatreST = null;
  let worldST = null;
  let theatreHasStory = false;

  function sweep(tl, el, at) {
    if (el) tl.fromTo(el, { "--sweep": "-120%" }, { "--sweep": "220%", duration: 1.4, ease: "power1.inOut" }, at);
  }

  /* Warm light washes across the lens at every scene change. */
  function lightPass(tl, at) {
    tl.to(".world__layer--leak", { opacity: 1, duration: 0.5, ease: "sine.inOut" }, at)
      .to(".world__layer--leak", { opacity: 0, duration: 0.7, ease: "sine.inOut" }, at + 0.5);
  }

  function buildTheatre() {
    const firstBuild = !theatreST;
    if (theatreST) { theatreTl.progress(0); theatreST.kill(); theatreTl.kill(); }
    if (worldST) worldST.kill();

    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    const scene = (id) => $(`#scene-${id}`);
    const later = ["verse", "couple", "details", "venue", "story"].map(scene).filter(Boolean);
    gsap.set(later, { autoAlpha: 0 });
    gsap.set(scene("invite"), { autoAlpha: 1 });

    /* 01 · invitation — approach, flowers separate, glass recedes */
    tl.addLabel("invite", 0)
      .to("#scrollCue", { autoAlpha: 0, duration: 0.3 }, 0)
      .to(card, { z: 110 * Z, y: -vh(1), duration: 1.3, ease: "power1.inOut" }, 0)
      .to("#flowerTop", { x: () => -vw(7), y: () => -vh(6), z: 260 * Z, rotation: -4, duration: 1.3, ease: "power1.inOut" }, 0)
      .to("#flowerBottom", { x: () => vw(7), y: () => vh(6), z: 300 * Z, rotation: 3, duration: 1.3, ease: "power1.inOut" }, 0)
      .to("#foreRose", { y: () => -vh(26), z: 240 * Z, duration: 1.3, ease: "none" }, 0)
      .to(".botanical--back", { x: () => vw(3), z: -160 * Z, duration: 1.3, ease: "none" }, 0)
      .to(card, { z: -760 * Z, y: -vh(4), rotationX: 14, autoAlpha: 0, duration: 1.2, ease: "power2.in" }, 1.3)
      .to(["#flowerTop", "#flowerBottom"], { scale: 1.7, z: 620 * Z, duration: 1.2, ease: "power2.in" }, 1.3)
      .to([flowerTopWrap, flowerBottomWrap, $(".botanical--back").closest(".px"), $("#foreRose").parentElement], { autoAlpha: 0, duration: 0.9, ease: "power1.in" }, 1.5)
      .set(scene("invite"), { autoAlpha: 0 }, 2.5);
    lightPass(tl, 2.0);

    /* 02 · verse — a glass slab floats forward from the dark */
    let t = 2.2;
    const verse = scene("verse");
    tl.addLabel("verse", t)
      .set(verse, { autoAlpha: 1 }, t)
      .fromTo(".slab-move", { z: -900 * Z, rotationX: 10, autoAlpha: 0 }, { z: 0, rotationX: 0, autoAlpha: 1, duration: 1.3, ease: "power2.out" }, t)
      .fromTo(".botanical--verse", { x: () => vw(8), z: -200 * Z, rotation: 6 }, { x: 0, z: 0, rotation: 0, duration: 1.6, ease: "power2.out" }, t)
      .fromTo(".slab__arabic", { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power1.inOut" }, t + 0.5)
      .fromTo([".slab__translation", ".slab__ref"], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.2 }, t + 1.1);
    sweep(tl, $(".slab"), t + 1.0);
    t += 2.6;
    tl.to(".slab-move", { z: 500 * Z, autoAlpha: 0, duration: 1, ease: "power2.in" }, t)
      .to(".botanical--verse", { x: () => vw(10), z: 300 * Z, duration: 1, ease: "power2.in" }, t)
      .to("#scene-verse .px:first-child", { autoAlpha: 0, duration: 0.8 }, t + 0.2)
      .set(verse, { autoAlpha: 0 }, t + 1);
    lightPass(tl, t + 0.5);

    /* 03 · couple — a glass portrait turns towards us */
    t += 0.8;
    const couple = scene("couple");
    const coupleLines = $$(".couple-text > *");
    tl.addLabel("couple", t)
      .set(couple, { autoAlpha: 1 }, t)
      .fromTo(".portrait-move",
        { z: -800 * Z, x: () => (isMobile ? 0 : -vw(8)), y: () => (isMobile ? -vh(4) : 0), rotationY: 20, autoAlpha: 0 },
        { z: 0, x: 0, y: 0, rotationY: isMobile ? 0 : 6, autoAlpha: 1, duration: 1.5, ease: "power2.out" }, t)
      .fromTo(".portrait__photo img", { scale: 1.18 }, { scale: 1, duration: 3.4, ease: "none" }, t)
      .fromTo(coupleLines, { autoAlpha: 0, y: 26, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.16, ease: "power2.out" }, t + 0.6)
      .fromTo(".couple-rose", { z: 360 * Z, y: () => vh(10) }, { z: 0, y: 0, duration: 1.8, ease: "power2.out" }, t);
    sweep(tl, $(".portrait"), t + 1.2);
    t += 2.9;
    tl.to(".portrait-move", { z: -500 * Z, rotationY: -12, autoAlpha: 0, duration: 1, ease: "power2.in" }, t)
      .to(coupleLines, { autoAlpha: 0, y: -24, duration: 0.7, stagger: 0.06, ease: "power1.in" }, t)
      .to(".couple-rose", { z: 500 * Z, y: -vh(20), duration: 1, ease: "power2.in" }, t)
      .to("#scene-couple .px:last-child", { autoAlpha: 0, duration: 0.8 }, t + 0.2)
      .set(couple, { autoAlpha: 0 }, t + 1);
    lightPass(tl, t + 0.5);

    /* 04 · date, then time — panels orbit past the camera */
    t += 0.8;
    const details = scene("details");
    tl.addLabel("details", t)
      .set(details, { autoAlpha: 1 }, t)
      .fromTo("#datePanel", { z: -900 * Z, rotationX: 12, autoAlpha: 0 }, { z: 0, rotationX: 0, autoAlpha: 1, duration: 1.3, ease: "power2.out" }, t)
      .fromTo("#datePanel .date__day", { autoAlpha: 0, scale: 0.9, filter: "blur(10px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1, ease: "power2.out" }, t + 0.5)
      .set("#timePanel", { autoAlpha: 0 }, t);
    sweep(tl, $("#datePanel .glass"), t + 0.9);
    t += 2.4;
    tl.to("#datePanel", { x: () => -vw(isMobile ? 40 : 30), z: -300 * Z, rotationY: 28, autoAlpha: 0, duration: 1.1, ease: "power2.inOut" }, t)
      .fromTo("#timePanel", { x: () => vw(isMobile ? 40 : 30), z: -300 * Z, rotationY: -28, autoAlpha: 0 }, { x: 0, z: 0, rotationY: 0, autoAlpha: 1, duration: 1.1, ease: "power2.inOut" }, t + 0.2);
    sweep(tl, $("#timePanel .glass"), t + 1.0);
    t += 2.6;
    tl.to("#timePanel", { z: 480 * Z, autoAlpha: 0, duration: 1, ease: "power2.in" }, t)
      .set(details, { autoAlpha: 0 }, t + 1);
    lightPass(tl, t + 0.5);

    /* 05 · venue — the real place fills the frame */
    t += 0.8;
    const venue = scene("venue");
    tl.addLabel("venue", t)
      .set(venue, { autoAlpha: 1 }, t)
      .fromTo(".venue-photo", { scale: 1.25, autoAlpha: 0 }, { scale: 1.06, autoAlpha: 1, duration: 1.6, ease: "power2.out" }, t)
      .to(".venue-photo", { scale: 1, duration: 2.2, ease: "none" }, t + 1.6)
      .fromTo("#venuePanel", { y: () => vh(8), z: -300 * Z, autoAlpha: 0 }, { y: 0, z: 0, autoAlpha: 1, duration: 1.3, ease: "power2.out" }, t + 0.6);
    sweep(tl, $("#venuePanel .glass"), t + 1.4);
    t += 3.4;
    tl.to("#venuePanel", { y: -vh(6), z: 300 * Z, autoAlpha: 0, duration: 1, ease: "power2.in" }, t)
      .to(".venue-photo", { scale: 1.12, autoAlpha: 0, duration: 1.2, ease: "power2.in" }, t + 0.1)
      .set(venue, { autoAlpha: 0 }, t + 1.3);

    /* 06 · story — the camera travels through floating photographs */
    const story = scene("story");
    const frames = story ? $$(".story-frame", story) : [];
    theatreHasStory = !!(story && frames.length);
    if (theatreHasStory) {
      lightPass(tl, t + 0.5);
      t += 0.9;
      const gap = 1100 * Z;
      const layout = frames.map((f, i) => ({
        el: f,
        base: -(i + 1.2) * gap,
        x: (i % 2 ? 1 : -1) * (isMobile ? 9 : 19),
        y: (i % 2 ? -1 : 1) * (isMobile ? 5 : 4),
        ry: (i % 2 ? -10 : 10)
      }));
      const travel = (frames.length + 1.4) * gap;
      const place = (p) => {
        layout.forEach((l) => {
          const z = l.base + p * travel;
          const fadeIn = gsap.utils.clamp(0, 1, gsap.utils.mapRange(-gap * 2.4, -gap * 1.3, 0, 1, z));
          const fadeOut = gsap.utils.clamp(0, 1, gsap.utils.mapRange(80, 520, 1, 0, z));
          gsap.set(l.el, { xPercent: 0, yPercent: -50, x: vw(l.x), y: vh(l.y), z, rotationY: l.ry, opacity: Math.min(fadeIn, fadeOut) });
        });
      };
      place(0);
      const proxy = { p: 0 };
      tl.addLabel("story", t)
        .set(story, { autoAlpha: 1 }, t)
        .fromTo("#storyTitle", { z: -700 * Z, autoAlpha: 0 }, { z: 0, autoAlpha: 1, duration: 1.1, ease: "power2.out" }, t)
        .to("#storyTitle", { z: 600 * Z, autoAlpha: 0, duration: 1.1, ease: "power2.in" }, t + 1.6)
        .fromTo(proxy, { p: 0 }, { p: 1, duration: frames.length * 1.1 + 1, ease: "none", onUpdate: () => place(proxy.p) }, t + 1.3);
      t += 1.3 + frames.length * 1.1 + 1;
      tl.set(story, { autoAlpha: 0 }, t);
    }

    const unit = () => innerHeight * (isMobile ? 0.8 : 0.95);
    theatreTl = tl;
    theatreST = ScrollTrigger.create({
      trigger: "#theatre",
      start: "top top",
      end: () => `+=${Math.round(tl.duration() * unit())}`,
      pin: true,
      scrub: isMobile ? 0.6 : 1.1,
      animation: tl,
      invalidateOnRefresh: true,
      anticipatePin: 1
    });

    /* The whole world drifts slowly with the journey (0.2x → 1.2x). */
    const worldTl = gsap.timeline();
    $$(".world__layer").forEach((layer) => {
      const d = parseFloat(layer.dataset.depth) || 0;
      worldTl.to(layer.children, { y: () => -vh(9) * d, scale: 1 + 0.05 * d, ease: "none", duration: 1 }, 0);
    });
    worldST = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      animation: worldTl
    });

    if (firstBuild) setupReveals();
    ScrollTrigger.refresh();
  }

  /* Glass sections after the theatre rise gently into place. */
  function setupReveals() {
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 70, autoAlpha: 0, rotationX: 6, transformPerspective: 1200,
        duration: 1.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onStart: () => { const g = el.classList.contains("glass") ? el : null; if (g) gsap.fromTo(g, { "--sweep": "-120%" }, { "--sweep": "220%", duration: 2.4, delay: 0.6, ease: "power2.inOut" }); }
      });
    });
  }

  /* =================================================================
     7. PARALLAX — mouse on desktop, a slow breath on phones
     ================================================================= */
  function setupParallax() {
    if (!cinematic) return;
    const layers = $$(".world__layer, .px");

    if (!isMobile && finePointer) {
      const movers = layers.map((el) => {
        const d = parseFloat(el.dataset.depth) || 0;
        return {
          d,
          x: gsap.quickTo(el, "x", { duration: 1.8, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 1.8, ease: "power3.out" })
        };
      });
      const tilts = $$("[data-tilt]").map((el) => ({
        rx: gsap.quickTo(el, "rotationX", { duration: 1.6, ease: "power3.out" }),
        ry: gsap.quickTo(el, "rotationY", { duration: 1.6, ease: "power3.out" })
      }));
      const reflX = gsap.quickTo(root, "--refl-x", { duration: 1.6, ease: "power3.out", unit: "px" });
      const reflY = gsap.quickTo(root, "--refl-y", { duration: 1.6, ease: "power3.out", unit: "px" });

      addEventListener("pointermove", (e) => {
        const nx = e.clientX / innerWidth - 0.5;
        const ny = e.clientY / innerHeight - 0.5;
        movers.forEach((m) => { m.x(-nx * 36 * m.d); m.y(-ny * 24 * m.d); });
        tilts.forEach((t) => { t.rx(-ny * 6); t.ry(nx * 8); });
        reflX(-nx * 40);
        reflY(-ny * 30);
      }, { passive: true });
    } else {
      // Phones: no pointer, so the world breathes very slightly instead.
      $$(".world__layer").forEach((el) => {
        const d = parseFloat(el.dataset.depth) || 0;
        gsap.to(el, { x: 10 * d, y: 6 * d, duration: 7 + d * 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    }
  }

  /* =================================================================
     8. LOADING ORDER
     Critical first (intro, world, invitation); the rest streams in
     one scene at a time once the guest has opened the invitation.
     ================================================================= */
  let draining = false;
  function drainQueue() {
    if (draining) return;
    draining = true;
    const queue = ["#scene-verse", "#scene-couple", "#scene-details", "#scene-venue", "#rsvp", "#final"];
    queue.reduce((p, sel) => p.then(() => loadWithin($(sel))), Promise.resolve())
      .then(() => loadStory());
  }

  /* =================================================================
     9. RSVP
     ================================================================= */
  function setupRsvp() {
    const form = $("#rsvpForm");
    const out = $("#guestsOut");
    const guestsField = $("#guestsField");
    const status = $("#rsvpStatus");
    const waBtn = $("#waBtn");
    const cfg = INV.rsvp || {};
    const max = cfg.maxGuests || 6;
    const phone = String(INV.whatsappNumber || "").replace(/\D/g, "");
    let guests = 1;

    if (!phone) waBtn.hidden = true;

    form.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (!b) return;
      guests = Math.min(max, Math.max(1, guests + Number(b.dataset.step)));
      out.value = out.textContent = guests;
    });
    form.addEventListener("change", (e) => {
      if (e.target.name === "attendance") guestsField.classList.toggle("is-disabled", e.target.value === "no");
    });
    const f = form.elements;
    f.name.addEventListener("input", () => f.name.removeAttribute("aria-invalid"));

    const values = () => ({
      name: f.name.value.trim(),
      attending: f.attendance.value === "yes",
      guests
    });

    const waUrl = (v) => {
      const couple = `${data.brideFirst} & ${data.groomFirst}`;
      const lines = [
        `RSVP · ${couple}'s ${INV.eventType || "Wedding"}`,
        `Name: ${v.name || "-"}`,
        `Attendance: ${v.attending ? "Joyfully accepts" : "Regretfully declines"}`
      ];
      if (v.attending) lines.push(`Guests: ${v.guests}`);
      return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
    };

    const thank = (v, viaWhatsApp) => {
      $("#rsvpThanksText").textContent = viaWhatsApp
        ? "Your reply is ready in WhatsApp. Just press send."
        : v.attending
          ? `We can't wait to celebrate with you, ${first(v.name)}.`
          : `You will be missed, ${first(v.name)}. Thank you for letting us know.`;
      const thanks = $("#rsvpThanks");
      form.hidden = true;
      thanks.hidden = false;
      if (hasGsap) gsap.from(thanks, { autoAlpha: 0, y: 20, duration: 1.2, ease: "power2.out" });
    };

    waBtn.addEventListener("click", () => {
      const v = values();
      window.open(waUrl(v), "_blank", "noopener");
      if (v.name) thank(v, true);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = values();
      if (!v.name) {
        f.name.setAttribute("aria-invalid", "true");
        f.name.focus();
        status.textContent = "Please add your name.";
        return;
      }
      status.textContent = "";

      if (!cfg.endpoint) {
        if (!phone) { status.textContent = "RSVP is not configured yet."; return; }
        window.open(waUrl(v), "_blank", "noopener");
        return thank(v, true);
      }

      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      status.textContent = "Sending…";
      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            ...v,
            event: `${INV.brideName} & ${INV.groomName} · ${INV.eventType || ""}`,
            submittedAt: new Date().toISOString()
          })
        });
        if (!res.ok) throw new Error(res.status);
        thank(v, false);
      } catch (err) {
        status.textContent = phone
          ? "We couldn't send that. Please use WhatsApp RSVP instead."
          : "We couldn't send that. Please try again.";
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* =================================================================
     10. COUNTDOWN & CALENDAR
     ================================================================= */
  function setupCountdown() {
    const box = $("#countdown");
    if (!eventStart) { box.classList.add("is-past"); return; }
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = eventStart - Date.now();
      if (ms <= 0) { box.classList.add("is-past"); return false; }
      const m = Math.floor(ms / 60000);
      $("[data-cd=d]", box).textContent = pad(Math.floor(m / 1440));
      $("[data-cd=h]", box).textContent = pad(Math.floor((m % 1440) / 60));
      $("[data-cd=m]", box).textContent = pad(m % 60);
      return true;
    };
    if (tick()) setInterval(tick, 15000);
  }

  function setupCalendar() {
    const a = $("#calendarLink");
    if (!eventStart) { a.hidden = true; return; }
    const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(eventStart.getTime() + 4 * 3600 * 1000);
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: `${data.brideFirst} & ${data.groomFirst} · ${INV.eventType || "Wedding"}`,
      dates: `${stamp(eventStart)}/${stamp(end)}`,
      location: [INV.venueName, INV.venueAddress].filter(Boolean).join(", "),
      details: INV.mapUrl || ""
    });
    a.href = `https://calendar.google.com/calendar/render?${q}`;
  }

  /* =================================================================
     11. SOUND — only ever started by the guest
     ================================================================= */
  function setupSound() {
    if (!A.music) return;
    const btn = $("#soundBtn");
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      btn.hidden = false;
      if (hasGsap) gsap.from(btn, { autoAlpha: 0, y: 10, duration: 1.2, ease: "power2.out" });
    }, { once: true });
    audio.src = A.music;

    btn.addEventListener("click", () => {
      const on = audio.paused;
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
      if (on) {
        audio.volume = 0;
        audio.play().catch(() => {});
        if (hasGsap) gsap.to(audio, { volume: 0.6, duration: 2.5, ease: "sine.out" });
        else audio.volume = 0.6;
      } else if (hasGsap) {
        gsap.to(audio, { volume: 0, duration: 1, ease: "sine.in", onComplete: () => audio.pause() });
      } else {
        audio.pause();
      }
    });
  }

  /* =================================================================
     BOOT
     ================================================================= */
  bindData();
  buildStoryFrames();
  $$(".glass").forEach(decorateGlass);

  // Critical path: intro still, the world, and the invitation itself.
  loadEl(poster);
  loadWithin($("#world")).then(() => {
    if ($(".world__bokeh").classList.contains("is-missing")) fallbackOrbs();
  });
  loadWithin($("#scene-invite"));

  const portraitImg = $(".portrait__photo img");
  portraitImg.addEventListener("missing", () => $(".portrait").classList.add("no-photo"));

  setupCountdown();
  setupCalendar();
  setupRsvp();
  prepareInvite();
  setupParallax();

  if (skipIntro) {
    opened = true;
    drainQueue();
    finishIntro();
  } else {
    setupVideo();
    $("#openBtn").addEventListener("click", open);
    intro.addEventListener("click", (e) => { if (!e.target.closest("button")) open(); });
    skipBtn.addEventListener("click", (e) => { e.stopPropagation(); finishIntro(); });
    addEventListener("keydown", (e) => {
      if (opened) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  }

  if (hasGsap) ScrollTrigger.config({ ignoreMobileResize: true });
})();
