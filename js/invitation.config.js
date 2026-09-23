/* =====================================================================
   Dearday.lk — Invitation data (names, date, venue, RSVP).
   Visual assets live separately in assets.config.js.
   ===================================================================== */

window.DEARDAY = window.DEARDAY || {};

/* ------------------------------------------------------------------ */
/*  INVITATION DATA                                                    */
/* ------------------------------------------------------------------ */
window.DEARDAY.invitation = {
  brideName: "Zainab Ahmed",
  groomName: "Danish Khan",

  eventType: "Wedding",

  /* ISO date + 24h time — used for the countdown and calendar link.  */
  date: "2026-12-12",
  time: "19:30",
  /* How the time should read on the invitation.                      */
  timeLabel: "7:30 PM onwards",
  afterNote: "Dinner to follow",
  timezone: "+05:30",

  hosts: "Together with their families",
  inviteLine: "request the honour of your presence at their wedding",

  venueName: "Pearl Continental Hotel",
  venueAddress: "Shahrah-e-Quaid-e-Azam, Lahore",
  mapUrl: "https://maps.google.com/?q=Pearl+Continental+Lahore",

  /* International format, digits only, e.g. 94771234567            */
  whatsappNumber: "94770000000",

  couplePhoto: "assets/images/couple/couple.webp",
  venuePhoto:  "assets/images/venue/venue.webp",

  /* Photo story — leave empty to skip the chapter.                  */
  gallery: [
    { src: "assets/images/story/01.webp", caption: "" },
    { src: "assets/images/story/02.webp", caption: "" },
    { src: "assets/images/story/03.webp", caption: "" },
    { src: "assets/images/story/04.webp", caption: "" }
  ],

  verse: {
    bismillah: "بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    arabic: "وَخَلَقْنَاكُمْ أَزْوَاجًا",
    translation: "And We created you in pairs",
    reference: "Surah An-Naba 78:8"
  },

  finalMessage: "Your presence is the most beautiful gift. We look forward to celebrating with you.",

  rsvp: {
    deadline: "Kindly respond by 1 December 2026",
    maxGuests: 6,
    /* Optional POST endpoint (Formspree, Google Apps Script, etc).
       Leave empty to send RSVPs via WhatsApp only.                  */
    endpoint: ""
  },

  brand: { name: "Dearday.lk", url: "https://dearday.lk" }
};
