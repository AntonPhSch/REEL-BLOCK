const test = require("node:test");
const assert = require("node:assert/strict");
const { RULES, BLOCK, PROMOTED, matchSite, step } = require("../reelblock.user.js");

const { instagram, youtube, tiktok } = RULES;

test("matchSite accepts the domain and its subdomains only", () => {
  assert.equal(matchSite("instagram.com"), "instagram");
  assert.equal(matchSite("www.instagram.com"), "instagram");
  assert.equal(matchSite("m.youtube.com"), "youtube");
  assert.equal(matchSite("www.tiktok.com"), "tiktok");
  assert.equal(matchSite("notinstagram.com"), null);
  assert.equal(matchSite("instagram.com.example.net"), null);
  assert.equal(matchSite("example.com"), null);
});

test("instagram: reels feed and hashtag/location pages redirect", () => {
  assert.equal(instagram.redirect("/reels/"), "/");
  assert.equal(instagram.redirect("/reels"), "/");
  assert.equal(instagram.redirect("/reels/audio/123456/"), "/");
  assert.equal(instagram.redirect("/explore/tags/cats/"), "/explore/");
  assert.equal(instagram.redirect("/explore/locations/123/berlin/"), "/explore/");
  assert.equal(instagram.redirect("/explore/"), null);
  assert.equal(instagram.redirect("/"), null);
  assert.equal(instagram.redirect("/reel/ABC123/"), null);
});

test("instagram: videoId recognises single reels", () => {
  assert.equal(instagram.videoId("/reel/ABC123/"), "ABC123");
  assert.equal(instagram.videoId("/reels/Ab-c_1"), "Ab-c_1");
  assert.equal(instagram.videoId("/someuser/reel/XYZ/"), "XYZ");
  assert.equal(instagram.videoId("/reels/"), null);
  assert.equal(instagram.videoId("/someuser/reels/"), null);
  assert.equal(instagram.videoId("/direct/inbox/"), null);
  assert.equal(instagram.videoId("/"), null);
});

test("instagram: single-video zone covers DMs and reel pages", () => {
  assert.ok(instagram.singleVideoZone("/direct/t/12345/"));
  assert.ok(instagram.singleVideoZone("/reel/ABC/"));
  assert.ok(!instagram.singleVideoZone("/"));
  assert.ok(!instagram.singleVideoZone("/someuser/"));
});

test("instagram: promoted label detection", () => {
  assert.ok(PROMOTED.test("janedoeSponsored"));
  assert.ok(PROMOTED.test("Vorgeschlagen für dich"));
  assert.ok(PROMOTED.test("Suggested for you"));
  assert.ok(!PROMOTED.test("max.mustermann • 2 h"));
});

test("youtube: every shorts URL redirects home", () => {
  assert.equal(youtube.redirect("/shorts/dQw4w9WgXcQ"), "/");
  assert.equal(youtube.redirect("/shorts"), "/");
  assert.equal(youtube.redirect("/watch"), null);
  assert.equal(youtube.redirect("/@channel/videos"), null);
});

test("tiktok: only single videos and photos are allowed", () => {
  assert.equal(tiktok.redirect("/@user/video/7300000000000000000"), null);
  assert.equal(tiktok.redirect("/@user/photo/7300000000000000000"), null);
  assert.equal(tiktok.redirect("/"), BLOCK);
  assert.equal(tiktok.redirect("/foryou"), BLOCK);
  assert.equal(tiktok.redirect("/@user"), BLOCK);
  assert.equal(tiktok.videoId("/@user/video/123"), "123");
});

// Walks through a list of paths and returns the action for each one.
function run(rule, paths) {
  let state = { allowed: null };
  return paths.map((path) => {
    const result = step(state, path, "https://example.test" + path, rule);
    state = result.state;
    return result.action;
  });
}

test("step: the first reel is allowed, the next one locks", () => {
  const [, first, second] = run(instagram, ["/direct/t/1/", "/reel/A/", "/reel/B/"]);
  assert.equal(first.type, "none");
  assert.deepEqual(second, { type: "lock", backUrl: "https://example.test/reel/A/" });
});

test("step: returning to a normal page allows the next reel", () => {
  const actions = run(instagram, ["/reel/A/", "/direct/t/1/", "/reel/B/"]);
  assert.deepEqual(actions.map((a) => a.type), ["none", "reset", "none"]);
});

test("step: reloading the same reel stays allowed", () => {
  const actions = run(instagram, ["/reel/A/", "/reel/A/"]);
  assert.deepEqual(actions.map((a) => a.type), ["none", "none"]);
});

test("step: redirects do not touch the allowed video", () => {
  const actions = run(instagram, ["/reel/A/", "/reels/", "/reel/B/"]);
  assert.deepEqual(actions[1], { type: "redirect", to: "/" });
  assert.equal(actions[2].type, "lock");
});

test("step: tiktok feed is blocked", () => {
  const [action] = run(tiktok, ["/foryou"]);
  assert.equal(action.type, "block");
});
