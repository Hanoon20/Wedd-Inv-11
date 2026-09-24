# Dearday.lk · Cinematic Glass Invitation

A digital wedding invitation built as one continuous camera move. It starts with a real envelope film and moves into an interactive glass invitation. Scrolling then moves the camera through the verse, the couple, the date and time, the venue, the photo story and the RSVP.

It is a static site with no build step. Run it with any static server:

```bash
npx http-server -p 8080 .
# open http://localhost:8080        (add ?skip to bypass the intro while designing)
```

## How it is put together

| File | What it is for |
| --- | --- |
| `js/invitation.config.js` | **Event data**: names, date, venue, map, WhatsApp, gallery, verse, RSVP |
| `js/assets.config.js` | **Visual assets**: every video, image and audio path, in one place |
| `index.html` | The markup: world, intro, theatre scenes, RSVP, final |
| `css/style.css` | Layout, glass material, light and UI (no asset paths) |
| `js/main.js` | Data binding, asset loader, intro film, scroll camera, parallax, RSVP |
| `js/vendor/` | GSAP 3.13, ScrollTrigger and Lenis, bundled locally |

**Realism comes from the assets, not from CSS.** CSS positions assets, lights them and supplies the glass. Flowers, fabric, envelope, bokeh and film are real files you drop into `assets/`.

**A missing asset never breaks the page.** Every image is checked before it is shown. If a file is not there, its layer hides and a restrained fallback takes its place, such as a dark warm environment, gold corner linework or a monogram in place of the couple photo. You can ship with only some assets and add more later.

**Mobile variants:** any asset key can have a `…Mobile` twin (e.g. `silkBackgroundMobile`). Phones try the mobile file first and fall back to the desktop one.

## The experience

```
Tap anywhere  →  opening film (muted)  →  dissolve into the live glass card
   → scroll: camera approaches, flowers separate in depth, glass recedes
   → Quran verse slab → glass portrait of the couple → date → time
   → venue photograph + View Location → travel through photo story
   → RSVP (Confirm / WhatsApp) → final message → "Made with ♥ Dearday.lk"
```

- **Intro fallbacks:** the film plays if it loads. If not, the still-image envelope animates: ribbon, then seal, then flap, then the glass card rises. If there is no envelope either, the poster pushes in through warm light. A Skip link appears during the film. The page never shows a broken video.
- **Depth:** every layer has a depth value (`data-depth`). The mouse moves the world, flowers and glass by different amounts, and the glass tilts and its reflection shifts. On phones, 3D distances are reduced by about 45% and the world drifts slowly instead of following the mouse.
- **Accessibility:** with `prefers-reduced-motion`, or without JavaScript, the scenes stack as a normal readable page.
- **Sound:** never autoplays. A small Sound control appears only if `assets/audio/wedding-music.mp3` exists.
- **Loading order:** the intro, world and invitation load first. The other scenes load one at a time after the guest taps Open.

## RSVP

- **WhatsApp RSVP** opens WhatsApp with the guest's reply already written, sent to `whatsappNumber`.
- **Confirm Attendance** posts JSON (`name, attending, guests, message, event, submittedAt`) to `rsvp.endpoint` if you set one. Formspree and Google Apps Script both work. If no endpoint is set, it uses WhatsApp too, so every reply reaches the couple.

---

# Asset guide

Put files at these paths, or change the paths in `js/assets.config.js`. Use WebP (or AVIF) for images and export transparent elements as **transparent WebP**. The sizes below are for the desktop versions; mobile versions should be about half that.

### 1. Opening film: `assets/videos/`

| File | Spec |
| --- | --- |
| `opening.mp4` | 1920×1080, H.264, **5–8 s**, no audio track, ~3–5 MB, `faststart` |
| `opening-mobile.mp4` | 1080×1920 (9:16) recomposed for portrait, ~2–3 MB |
| `opening.webm` *(optional)* | VP9 version of the desktop film |
| `openingPoster` (config) | Still shown before the guest taps. Currently the satin background; point it at the film's first frame if you prefer |
| `images/textures/scene-backdrop.webp` | **Last frame, clean plate** (satin + candles, *no card*) |

**The seamless hand-off.** The film's last frame should look like the site's first scene: a glass card in the centre of dark satin, lit warm, taking up about **62% of the frame height** on desktop and **80% of the width** on mobile. The website dissolves from the film into that composition and uses `scene-backdrop` as the environment behind it. Export that backdrop from the same shot without the card, or remove the card in Canva.

Compress with:
```bash
ffmpeg -i in.mp4 -an -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart opening.mp4
ffmpeg -ss 0 -i opening.mp4 -frames:v 1 -q:v 80 opening-poster.webp
```

**Veo / Google Flow prompts** (generate as separate 8 s shots and pick the best take):

1. *Environment:* "Cinematic macro shot, dark luxurious room, ivory satin fabric gently draped, soft warm candlelight, creamy golden bokeh in the background, shallow depth of field, camera slowly dollies forward, 35mm film look, muted warm grade, no people, no text."
2. *Envelope:* "A premium ivory textured paper envelope resting on draped satin, champagne silk ribbon bow and a burgundy wax seal, burgundy and blush roses with gold dried leaves beside it, warm candlelight, cinematic slow push-in, photorealistic, shallow depth of field, no text."
3. *Opening:* "The silk ribbon slowly loosens and slides away, the envelope flap opens, a clear frosted-glass invitation card with thin gold border rises out of the envelope, warm light glints across the glass edge, slow elegant camera push-in, photorealistic, no text on the card."
4. *End frame:* "Camera settles facing a clear frosted-glass invitation card standing centred on dark satin, burgundy and cream roses at the top-left and bottom-right corners, warm bokeh behind, static final frame, no text on the card."

Keep text **off** the card in the film. The website sets the typography itself, so names and dates stay sharp and editable.

### 2. Environment and light: `assets/images/textures/`, `lighting/`

| Key | File | Notes |
| --- | --- | --- |
| `silkBackground` | `textures/silk.webp` | 2560×1440, dark champagne or ivory satin, low-key |
| `candleGlow` | `lighting/candle-glow.webp` | Warm glow on **black** (drawn in screen blend mode, so black becomes transparent) |
| `bokeh` | `lighting/bokeh.webp` | Real out-of-focus lights on black |
| `lightLeak` | `lighting/light-leak.webp` | Warm film light leak on black; washes across the lens between scenes |
| `lightSweep` | `lighting/light-sweep.webp` | *(optional)* A diagonal light streak on black; passes across the glass |

### 3. Glass: `assets/images/glass/`

| Key | File | Notes |
| --- | --- | --- |
| `glassTexture` | `glass-texture.webp` | Subtle frosted or etched glass photo, 1200×1700 (soft-light blend) |
| `glassReflection` | `glass-reflection.webp` | Soft window or softbox reflection on black (screen blend) |
| `glassShadow` | `glass-shadow.webp` | Transparent contact shadow, wide and soft, sits under the card |
| `glassFrame` / `goldBorder` | `glass-frame.webp` | Transparent gold border and corner filigree at the **card's ratio of 1:1.42**. Replaces the fallback corner lines |

### 4. Flowers and botanicals: `assets/images/flowers/`, `botanical/` (transparent WebP)

| Key | File | Placement |
| --- | --- | --- |
| `topFlowers` | `flowers/top.webp` | Top-left of the card: burgundy + cream roses, gold leaves, ~1400px |
| `bottomFlowers` | `flowers/bottom.webp` | Bottom-right of the card: blush + burgundy roses, ~1400px |
| `floatingRose` | `flowers/floating-rose.webp` | A single rose in the foreground (the site blurs it for depth of field) |
| `rosePetal` | `flowers/petal.webp` | Single petal |
| `goldBotanical` | `botanical/gold.webp` | Champagne-gold dried branch that sits behind the card |
| `botanicalLeft` / `botanicalRight` | `botanical/left.webp`, `right.webp` | Side sprays used in the verse scene |

Tip: in Canva, use **BG Remover** on real flower photography and export as WebP or PNG with a transparent background. Keep each arrangement separate. The site moves each one at its own depth.

### 5. Envelope stills (only used if the film fails): `assets/images/envelope/`

`envelope-back.webp`, `envelope-front.webp`, `envelope-flap.webp` (closed flap), `ribbon.webp`, `wax-seal.webp`. All at the **same canvas size (ratio 1.45:1) with transparent backgrounds**, so they stack exactly.

### 6. Photography

| Field | File | Notes |
| --- | --- | --- |
| `couplePhoto` | `couple/couple.webp` | Portrait 4:5, ~1200×1560. Shown in an arched glass frame with a slow zoom; not retouched by the site |
| `venuePhoto` | `venue/venue.webp` | Landscape 2400×1350, used full-screen with a dark cinematic grade |
| `gallery[]` | `story/01.webp` … | Portrait 4:5, ~1000×1250. Photos that don't exist are dropped; with none, the chapter is skipped |

### 7. Audio: `assets/audio/wedding-music.mp3`

128–160 kbps, ideally a loopable 1–2 minute track.
