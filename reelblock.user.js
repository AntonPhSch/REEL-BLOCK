// ==UserScript==
// @name         ReelBlock
// @description  Blendet Reels, Shorts und Entdecken aus. Ein geschicktes Reel darfst du ansehen, aber nicht weiterscrollen.
// @match        *://instagram.com/*
// @match        *://www.instagram.com/*
// @match        *://youtube.com/*
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @match        *://tiktok.com/*
// @match        *://www.tiktok.com/*
// @match        *://m.tiktok.com/*
// @run-at       document-start
// @noframes
// ==/UserScript==
//
// NOTIZ: Der Block oben ist der "Kopf" des Skripts. Die App "Userscripts" liest ihn und weiß dadurch:
//   @match   -> auf welchen Webseiten das Skript laufen soll. Jede Adresse steht einzeln da,
//               denn die App "Userscripts" erkennt z.B. m.youtube.com sonst nicht zuverlässig.
//   @run-at  -> "document-start" = so früh wie möglich, damit Reels gar nicht erst aufblitzen
//   @noframes-> nicht in eingebetteten Unterseiten (iframes) laufen

(() => {

  // ================================================================
  // 1. EINSTELLUNGEN – hier wählst du aus, welche Seiten gesperrt werden
  // ================================================================
  const SPERREN = {
    instagram: true,  // Reels-Tab, Reels-Feed, Entdecken-Raster, vorgeschlagene Beiträge
    youtube:   true,  // Shorts-Tab und alle Shorts-Reihen
    tiktok:    true,  // alles außer einzelnen geschickten Videos
  };


  // ================================================================
  // 2. REGELN PRO SEITE
  //    css        -> Elemente, die einfach unsichtbar gemacht werden
  //    umleiten   -> bekommt den Pfad (z.B. "/reels/") und sagt, wohin stattdessen.
  //                  null = Seite ist ok, "SPERRE" = Sperrbild zeigen
  //    video      -> erkennt ein einzelnes Kurzvideo und gibt seine ID zurück
  //    aufraeumen -> wird ständig aufgerufen, für Dinge, die CSS allein nicht schafft
  // ================================================================
  const REGELN = {

    instagram: {
      css: `
        /* Reels-Knopf in der Leiste unten */
        a[href="/reels/"],
        /* Entdecken-Seite: das Raster aus Beiträgen und Reels (das Suchfeld bleibt) */
        html[data-rb-pfad="explore"] main a[href*="/p/"],
        html[data-rb-pfad="explore"] main a[href*="/reel/"],
        /* Suchergebnisse: nur Profile zeigen, keine Hashtags oder Orte */
        html[data-rb-pfad="explore"] a[href*="/explore/tags/"],
        html[data-rb-pfad="explore"] a[href*="/explore/locations/"]
        { display: none !important; }
      `,
      umleiten: p =>
        /^\/reels\/?$|^\/reels\/audio\//.test(p)      ? "/"         : // Reels-Feed -> Startseite
        /^\/explore\/(tags|locations)\//.test(p)      ? "/explore/" : // Hashtag-/Ortsseiten -> leere Suche
        null,
      // Ein einzelnes Reel: /reel/ABC/, /reels/ABC/ oder /name/reel/ABC/
      video: p => p.match(/^\/(?:[^/]+\/)?reels?\/([\w-]+)\/?$/)?.[1],
      // Hier darf nur EIN Video laufen: auf Reel-Seiten und in den Nachrichten
      einVideoBereich: p => /^\/direct\/|^\/(?:[^/]+\/)?reels?\/[\w-]+/.test(p),
      aufraeumen() {
        // Den Reels-Knopf samt seiner leeren Hülle verstecken, damit keine Lücke in der Leiste bleibt.
        document.querySelectorAll('a[href="/reels/"]').forEach(el => {
          for (let i = 0; i < 6 && el.parentElement?.children.length === 1; i++) el = el.parentElement;
          el.style.display = "none";
        });
        // Startseite: Beiträge von Fremden (Vorschläge, Werbung) verstecken. Freunde bleiben.
        if (location.pathname === "/") document.querySelectorAll("article").forEach(beitrag => {
          if (/Vorgeschlagen|Suggested|Gesponsert|Sponsored/.test(beitrag.textContent.slice(0, 300)))
            beitrag.style.display = "none";
        });
      },
    },

    youtube: {
      css: `
        /* Shorts-Knopf im Menü (Handy und Computer) */
        ytm-pivot-bar-item-renderer:has(.pivot-shorts),
        ytd-guide-entry-renderer:has(a[title="Shorts"]),
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        /* Shorts-Reihen auf Startseite, in der Suche und bei Abos */
        ytd-reel-shelf-renderer, ytm-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts], ytd-rich-section-renderer:has([is-shorts]),
        ytm-shorts-lockup-view-model, ytm-rich-section-renderer:has(ytm-shorts-lockup-view-model),
        grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
        /* Einzelne Einträge, die auf ein Short verlinken */
        ytd-rich-item-renderer:has(a[href^="/shorts/"]),
        ytd-video-renderer:has(a[href^="/shorts/"]),
        ytm-video-with-context-renderer:has(a[href^="/shorts/"]),
        /* Shorts-Tab auf Kanalseiten */
        yt-tab-shape[tab-title="Shorts"], a[href$="/shorts"]
        { display: none !important; }
      `,
      // Jede Adresse mit /shorts/ -> zurück zur Startseite
      umleiten: p => p.startsWith("/shorts") ? "/" : null,
      // Die mobile Seite (m.youtube.com) ändert ihre Bauteile oft.
      // Darum suchen wir zusätzlich nach dem WORT "Shorts" und nach LINKS auf /shorts/.
      aufraeumen() {
        // Untere Leiste, Tabs und Filter-Chips, die "Shorts" heißen
        document.querySelectorAll("ytm-pivot-bar-item-renderer, yt-tab-shape, ytm-chip-cloud-chip-renderer")
          .forEach(el => { if (el.textContent.trim() === "Shorts") el.style.display = "none"; });
        // Ganze Reihen, in denen Shorts stecken
        document.querySelectorAll("ytm-rich-section-renderer, ytm-shelf-renderer, ytm-reel-shelf-renderer, grid-shelf-view-model")
          .forEach(reihe => { if (reihe.querySelector('a[href*="/shorts/"]')) reihe.style.display = "none"; });
        // Einzelne Videos, die auf ein Short zeigen
        document.querySelectorAll('a[href*="/shorts/"]').forEach(link => {
          const eintrag = link.closest("ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer");
          (eintrag || link).style.display = "none";
        });
      },
    },

    tiktok: {
      // TikTok besteht nur aus Kurzvideos. Erlaubt sind nur einzelne geschickte Videos.
      umleiten: p => /^\/@[^/]+\/(video|photo)\/\d+/.test(p) ? null : "SPERRE",
      video: p => p.match(/\/(?:video|photo)\/(\d+)/)?.[1],
      einVideoBereich: p => /\/(video|photo)\/\d+/.test(p),
    },
  };


  // ================================================================
  // 3. START – herausfinden, auf welcher Seite wir sind
  // ================================================================
  const seite = Object.keys(SPERREN).find(name => location.hostname.includes(name));
  if (!seite || !SPERREN[seite]) return;          // Seite nicht ausgewählt -> nichts tun
  const regel = REGELN[seite];

  // CSS sofort einfügen (noch bevor die Seite geladen ist)
  if (regel.css) {
    const style = document.createElement("style");
    style.textContent = regel.css;
    document.documentElement.append(style);
  }


  // ================================================================
  // 4. SPERRBILD – ein Vorhang über der ganzen Seite
  // ================================================================
  let vorhang = null;

  function sperrbild(text, zurueckUrl) {
    vorhang?.remove();
    vorhang = document.createElement("div");
    vorhang.style.cssText = `position:fixed; inset:0; z-index:2147483647; background:#111; color:#fff;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;
      font:17px -apple-system, sans-serif; text-align:center; padding:24px;`;
    vorhang.innerHTML = `<div style="font-size:44px">✋</div><div>${text}</div>`;
    const knopf = (beschriftung, aktion) => {
      const b = document.createElement("button");
      b.textContent = beschriftung;
      b.style.cssText = "font:inherit; padding:10px 20px; border-radius:10px; border:0; background:#fff; color:#111";
      b.onclick = aktion;
      vorhang.append(b);
    };
    if (zurueckUrl) knopf("Zurück zum Video", () => location.replace(zurueckUrl));
    knopf("Zur Startseite", () => location.href = "/");
    document.documentElement.append(vorhang);
  }


  // ================================================================
  // 5. HAUPTSCHLEIFE – läuft alle 0,3 Sekunden
  //    Instagram, YouTube und TikTok laden neue Seiten, ohne wirklich neu zu laden.
  //    Darum schauen wir regelmäßig nach, ob sich die Adresse geändert hat.
  // ================================================================
  let erlaubt = null;      // das EINE Video, das gerade angesehen werden darf: { id, url }
  let letzterPfad = null;

  setInterval(() => {
    regel.aufraeumen?.();
    if (vorhang) document.querySelectorAll("video").forEach(v => v.pause()); // hinter dem Vorhang läuft nichts

    const pfad = location.pathname;
    if (pfad === letzterPfad) return;                // nichts Neues
    letzterPfad = pfad;
    vorhang?.remove(); vorhang = null;
    document.documentElement.dataset.rbPfad = pfad.split("/")[1];   // z.B. "explore" -> für das CSS oben

    // a) Verbotene Seite?
    const ziel = regel.umleiten?.(pfad);
    if (ziel === "SPERRE") return sperrbild("Diese Seite ist gesperrt.<br>Geschickte Videos kannst du trotzdem öffnen.");
    if (ziel) return location.replace(ziel);

    // b) Einzelnes Kurzvideo?
    const id = regel.video?.(pfad);
    if (!id) { erlaubt = null; erstesVideo = null; return; }   // normale Seite (Nachrichten, Profil, ...) -> zurücksetzen
    if (!erlaubt) { erlaubt = { id, url: location.href }; return; }   // erstes Video -> erlaubt
    if (id !== erlaubt.id)                              // direkt danach ein ANDERES Video = weitergescrollt
      sperrbild("Das war dein Video.<br>Weiterscrollen ist gesperrt.", erlaubt.url);
  }, 300);


  // ================================================================
  // 6. VIDEO-WÄCHTER – zweite Sicherung
  //    Auf dem Handy ändert Instagram beim Weiterwischen oft NICHT die Adresse.
  //    Darum schauen wir zusätzlich, welches Video startet:
  //    Das erste sichtbare Video darf laufen, jedes weitere wird gestoppt.
  // ================================================================
  let erstesVideo = null;                               // { el, src, url }
  const quelle   = v => v.currentSrc || v.src;           // "Adresse" der Videodatei
  const sichtbar = v => { const r = v.getBoundingClientRect(); return r.top < innerHeight / 2 && r.bottom > innerHeight / 2; };

  document.addEventListener("play", e => {               // "play" = ein Video fängt an zu laufen
    const v = e.target;
    if (!regel.einVideoBereich?.(location.pathname)) return;     // z.B. Startseite: Freunde-Videos sind ok
    if (!sichtbar(v)) { if (erstesVideo) v.pause(); return; }    // im Hintergrund vorgeladenes Video stoppen
    if (!erstesVideo || !erstesVideo.el.isConnected) {           // erstes Video (oder altes ist geschlossen)
      erstesVideo = { el: v, src: quelle(v), url: location.href };
      return;
    }
    if (v === erstesVideo.el && quelle(v) === erstesVideo.src) return;  // dasselbe Video läuft nur erneut
    v.pause();                                                    // ein ANDERES Video -> weitergewischt
    sperrbild("Das war dein Video.<br>Weiterscrollen ist gesperrt.", erstesVideo.url);
  }, true);  // true = wir hören zu, bevor Instagram selbst reagiert


  // ================================================================
  // 7. WISCH-SPERRE – dritte Sicherung
  //    Auf einer Reel-Seite wird das Hoch- und Runterwischen einfach blockiert.
  //    Ausnahme: Kommentare (Fenster) und Eingabefelder.
  // ================================================================
  let startY = 0;
  document.addEventListener("touchstart", e => startY = e.touches[0].clientY, { capture: true, passive: true });
  document.addEventListener("touchmove", e => {
    if (!regel.video?.(location.pathname)) return;                          // keine Reel-Seite
    if (e.target.closest?.('[role="dialog"], textarea, input')) return;     // Kommentare dürfen scrollen
    if (Math.abs(e.touches[0].clientY - startY) > 8) e.preventDefault();    // senkrechtes Wischen verbieten
  }, { capture: true, passive: false });  // passive:false = wir dürfen das Wischen verhindern

})();
