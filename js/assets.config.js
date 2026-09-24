/* =====================================================================
   Dearday.lk — Asset configuration
   ---------------------------------------------------------------------
   Edit this file to swap visual assets. Event details live in
   invitation.config.js. The animation code never hardcodes a path.

   • Every asset may be a string or a list of candidates. The first one
     that loads wins; if none load, the layer quietly hides itself and a
     restrained fallback is used. Nothing ever renders as a broken image.
   • Keys ending in "Mobile" are tried first on phones, then the desktop
     key is used as the fallback.
   • Paths are relative ("assets/…") so the site works from a sub-folder,
     GitHub Pages, or a local static server.
   ===================================================================== */

window.DEARDAY = window.DEARDAY || {};

/* ------------------------------------------------------------------ */
/*  VISUAL ASSETS                                                      */
/* ------------------------------------------------------------------ */
window.DEARDAY.assets = {
  /* "light" for pale backgrounds (dark ink, frosted glass),
     "dark" for night/velvet backgrounds (ivory ink, smoked glass). */
  tone: "dark",

  /* Opening film ----------------------------------------------------- */
  openingVideo:        "assets/videos/opening.mp4",
  openingVideoWebm:    "assets/videos/opening.webm",
  openingMobileVideo:  "assets/videos/opening-mobile.mp4",
  /* Falls back to the satin backdrop until a real first frame exists. */
  openingPoster:       ["assets/images/envelope/opening-poster.avif", "assets/images/envelope/opening-poster.webp", "assets/images/envelope/opening-poster.jpg", "assets/images/textures/background.webp"],
  openingPosterMobile: ["assets/images/envelope/opening-poster-mobile.webp", "assets/images/textures/background-mobile.webp"],

  /* Still-image envelope — only used if the film cannot play --------- */
  envelopeBack:   "assets/images/envelope/envelope-back.webp",
  envelopeFlap:   "assets/images/envelope/envelope-flap.webp",
  envelopeFront:  "assets/images/envelope/envelope-front.webp",
  envelopeSeal:   "assets/images/envelope/wax-seal.webp",
  envelopeRibbon: "assets/images/envelope/ribbon.webp",

  /* The environment (the last frame of the film, ideally a clean plate) */
  sceneBackdrop:       ["assets/images/textures/scene-backdrop.avif", "assets/images/textures/scene-backdrop.webp"],
  sceneBackdropMobile: ["assets/images/textures/scene-backdrop-mobile.webp"],
  silkBackground:      ["assets/images/textures/background.webp"],
  silkBackgroundMobile:["assets/images/textures/background-mobile.webp"],

  /* Light ------------------------------------------------------------ */
  bokeh:       "assets/images/lighting/bokeh.webp",
  candleGlow:  "assets/images/lighting/candle-glow.webp",
  lightLeak:   "assets/images/lighting/light-leak.webp",
  lightSweep:  "assets/images/lighting/light-sweep.webp",

  /* Glass ------------------------------------------------------------ */
  glassTexture:    "assets/images/glass/glass-texture.webp",
  glassReflection: "assets/images/glass/glass-reflection.webp",
  glassShadow:     "assets/images/glass/glass-shadow.webp",
  glassFrame:      "assets/images/glass/glass-frame.webp",
  goldBorder:      "assets/images/glass/gold-border.webp",

  /* Flowers & botanicals (transparent WebP) -------------------------- */
  topFlowers:     ["assets/images/flowers/top.webp", "assets/images/flowers/top.png"],
  bottomFlowers:  ["assets/images/flowers/bottom.webp", "assets/images/flowers/bottom.png"],
  floatingRose:   ["assets/images/flowers/floating-rose.webp", "assets/images/flowers/floating-rose.png"],
  rosePetal:      "assets/images/flowers/petal.webp",
  goldBotanical:  ["assets/images/botanical/gold.webp", "assets/images/botanical/gold.png"],
  botanicalLeft:  "assets/images/botanical/left.webp",
  botanicalRight: "assets/images/botanical/right.webp",

  /* Sound (never autoplayed) ----------------------------------------- */
  music: "assets/audio/wedding-music.mp3"
};

