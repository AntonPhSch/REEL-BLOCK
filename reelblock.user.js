// ==UserScript==
// @name         ReelBlock
// @namespace    https://github.com/AntonPhSch
// @version      1.1.0
// @description  Hides Instagram Reels, YouTube Shorts and TikTok in Safari. A reel someone sends you still plays; swiping to the next one is blocked.
// @license      MIT
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

(function () {
  "use strict";

  const ENABLED = {
    instagram: true,
    youtube: true,
    tiktok: true,
  };

  // Labels Instagram shows above suggested posts and ads. Add your UI language here if needed.
  const PROMOTED_LABELS = ["Suggested", "Sponsored", "Vorgeschlagen", "Gesponsert", "Sponsorisé", "Patrocinado"];
  const PROMOTED = new RegExp(PROMOTED_LABELS.join("|"));

  const BLOCK = "block";

  const RULES = {
    instagram: {
      domain: "instagram.com",
      css: `
        a[href="/reels/"],
        html[data-rb-section="explore"] main a[href*="/p/"],
        html[data-rb-section="explore"] main a[href*="/reel/"],
        html[data-rb-section="explore"] a[href*="/explore/tags/"],
        html[data-rb-section="explore"] a[href*="/explore/locations/"]
        { display: none !important; }
      `,
      redirect: (path) =>
        /^\/reels\/?$|^\/reels\/audio\//.test(path) ? "/" :
        /^\/explore\/(tags|locations)\//.test(path) ? "/explore/" :
        null,
      // Matches /reel/ID/, /reels/ID/ and /username/reel/ID/
      videoId: (path) => path.match(/^\/(?:[^/]+\/)?reels?\/([\w-]+)\/?$/)?.[1] ?? null,
      singleVideoZone: (path) => /^\/direct\/|^\/(?:[^/]+\/)?reels?\/[\w-]+/.test(path),
      clean(roots) {
        for (let el of within(roots, 'a[href="/reels/"]')) {
          // Also hide the wrappers that only contain the button, otherwise the tab bar keeps a gap.
          for (let i = 0; i < 6 && el.parentElement?.children.length === 1; i++) el = el.parentElement;
          hide(el);
        }
        if (location.pathname === "/") {
          for (const post of within(roots, "article")) {
            if (PROMOTED.test(post.textContent.slice(0, 300))) hide(post);
          }
        }
      },
    },

    youtube: {
      domain: "youtube.com",
      css: `
        ytm-pivot-bar-item-renderer:has(.pivot-shorts),
        ytd-guide-entry-renderer:has(a[title="Shorts"]),
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-reel-shelf-renderer, ytm-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts], ytd-rich-section-renderer:has([is-shorts]),
        ytm-shorts-lockup-view-model, ytm-rich-section-renderer:has(ytm-shorts-lockup-view-model),
        grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
        ytd-rich-item-renderer:has(a[href^="/shorts/"]),
        ytd-video-renderer:has(a[href^="/shorts/"]),
        ytm-video-with-context-renderer:has(a[href^="/shorts/"]),
        yt-tab-shape[tab-title="Shorts"], a[href$="/shorts"]
        { display: none !important; }
      `,
      redirect: (path) => (path.startsWith("/shorts") ? "/" : null),
      // m.youtube.com renames its components often, so also match on the label and on /shorts/ links.
      clean(roots) {
        for (const el of within(roots, "ytm-pivot-bar-item-renderer, yt-tab-shape, ytm-chip-cloud-chip-renderer")) {
          if (el.textContent.trim() === "Shorts") hide(el);
        }
        for (const shelf of within(roots, "ytm-rich-section-renderer, ytm-shelf-renderer, ytm-reel-shelf-renderer, grid-shelf-view-model")) {
          if (shelf.querySelector('a[href*="/shorts/"]')) hide(shelf);
        }
        for (const link of within(roots, 'a[href*="/shorts/"]')) {
          hide(link.closest("ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer") || link);
        }
      },
    },

    tiktok: {
      domain: "tiktok.com",
      // Only single videos (usually shared links) are allowed.
      redirect: (path) => (/^\/@[^/]+\/(video|photo)\/\d+/.test(path) ? null : BLOCK),
      videoId: (path) => path.match(/\/(?:video|photo)\/(\d+)/)?.[1] ?? null,
      singleVideoZone: (path) => /\/(video|photo)\/\d+/.test(path),
    },
  };

  function matchSite(hostname) {
    return Object.keys(RULES).find((name) => {
      const domain = RULES[name].domain;
      return hostname === domain || hostname.endsWith("." + domain);
    }) ?? null;
  }

  // Decides what happens when the path changes. `allowed` is the one short video that may be watched.
  function step(state, path, href, rule) {
    const target = rule.redirect?.(path) ?? null;
    if (target === BLOCK) return { state, action: { type: "block" } };
    if (target) return { state, action: { type: "redirect", to: target } };

    const id = rule.videoId?.(path) ?? null;
    if (!id) return { state: { allowed: null }, action: { type: "reset" } };
    if (!state.allowed) return { state: { allowed: { id, url: href } }, action: { type: "none" } };
    if (id !== state.allowed.id) return { state, action: { type: "lock", backUrl: state.allowed.url } };
    return { state, action: { type: "none" } };
  }

  // All elements matching `selector` that are inside one of `roots`, or that contain one of them.
  function within(roots, selector) {
    const found = new Set();
    for (const root of roots) {
      const ancestor = root.closest(selector);
      if (ancestor) found.add(ancestor);
      root.querySelectorAll(selector).forEach((el) => found.add(el));
    }
    return found;
  }

  function hide(el) {
    el.style.setProperty("display", "none", "important");
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { RULES, BLOCK, PROMOTED, matchSite, step };
    return;
  }

  // ---------------------------------------------------------------- browser only

  const site = matchSite(location.hostname);
  if (!site || !ENABLED[site]) return;
  const rule = RULES[site];

  if (rule.css) {
    const style = document.createElement("style");
    style.textContent = rule.css;
    document.documentElement.append(style);
  }

  const MESSAGE_BLOCKED = "This page is blocked.\nVideos sent to you still open.";
  const MESSAGE_LOCKED = "That was your video.\nScrolling further is blocked.";

  let overlay = null;

  function showOverlay(message, backUrl) {
    removeOverlay();
    overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed; inset:0; z-index:2147483647; background:#111; color:#fff;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;
      font:17px -apple-system, sans-serif; text-align:center; padding:24px; white-space:pre-line;`;

    const icon = document.createElement("div");
    icon.style.fontSize = "44px";
    icon.textContent = "✋";
    const text = document.createElement("div");
    text.textContent = message;
    overlay.append(icon, text);

    const addButton = (label, onClick) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.style.cssText = "font:inherit; padding:10px 20px; border-radius:10px; border:0; background:#fff; color:#111";
      button.onclick = onClick;
      overlay.append(button);
    };
    if (backUrl) addButton("Back to video", () => location.replace(backUrl));
    addButton("Go to home page", () => (location.href = "/"));

    document.documentElement.append(overlay);
    document.querySelectorAll("video").forEach((v) => v.pause());
  }

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  // Route handling. These sites are single-page apps: navigation swaps the DOM without a page load.

  let nav = { allowed: null };
  let firstVideo = null; // { el, src, url } – the video that started first in a single-video zone
  let lastPath = null;

  function checkRoute() {
    const path = location.pathname;
    if (path === lastPath) return false;
    lastPath = path;
    removeOverlay();
    document.documentElement.dataset.rbSection = path.split("/")[1];

    const { state, action } = step(nav, path, location.href, rule);
    nav = state;
    if (action.type === "redirect") location.replace(action.to);
    else if (action.type === "block") showOverlay(MESSAGE_BLOCKED);
    else if (action.type === "lock") showOverlay(MESSAGE_LOCKED, action.backUrl);
    else if (action.type === "reset") firstVideo = null;
    return true;
  }

  function onNavigate() {
    if (checkRoute()) rule.clean?.([document.documentElement]);
  }

  const elementOf = (node) => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);

  const observer = new MutationObserver((records) => {
    if (checkRoute()) {
      rule.clean?.([document.documentElement]);
      return;
    }
    if (!rule.clean) return;

    const roots = new Set();
    for (const record of records) {
      if (record.type === "childList") {
        record.addedNodes.forEach((node) => {
          const el = elementOf(node);
          if (el) roots.add(el);
        });
      } else {
        const el = elementOf(record.target);
        if (el) roots.add(el);
      }
    }
    if (roots.size) rule.clean(roots);
  });

  const observed = { childList: true, subtree: true };
  if (rule.clean) Object.assign(observed, { attributes: true, attributeFilter: ["href"], characterData: true });
  observer.observe(document.documentElement, observed);

  addEventListener("popstate", onNavigate);
  globalThis.navigation?.addEventListener?.("navigatesuccess", onNavigate);
  document.addEventListener("DOMContentLoaded", () => rule.clean?.([document.documentElement]));
  checkRoute();

  // Single-video guard. On mobile Instagram often swaps the video without changing the URL,
  // so the route check alone misses a swipe. Here we watch which video starts playing instead.

  const sourceOf = (video) => video.currentSrc || video.src;
  const isCentered = (video) => {
    const r = video.getBoundingClientRect();
    return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
  };

  document.addEventListener("play", (event) => {
    const video = event.target;
    if (video.tagName !== "VIDEO") return;
    if (overlay) return video.pause();
    if (!rule.singleVideoZone?.(location.pathname)) return;

    if (!isCentered(video)) {
      if (firstVideo) video.pause(); // preloaded off-screen
      return;
    }
    if (!firstVideo || !firstVideo.el.isConnected) {
      firstVideo = { el: video, src: sourceOf(video), url: location.href };
      return;
    }
    if (video === firstVideo.el && sourceOf(video) === firstVideo.src) return;

    video.pause();
    showOverlay(MESSAGE_LOCKED, firstVideo.url);
  }, true); // capture phase: runs before the site's own handlers

  // Swipe lock on reel pages. Comment sheets and text fields keep scrolling.

  let touchStartY = 0;
  document.addEventListener("touchstart", (e) => (touchStartY = e.touches[0].clientY), { capture: true, passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!rule.videoId?.(location.pathname)) return;
    if (e.target.closest?.('[role="dialog"], textarea, input')) return;
    if (Math.abs(e.touches[0].clientY - touchStartY) > 8) e.preventDefault();
  }, { capture: true, passive: false });
})();
