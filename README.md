# ReelBlock

A userscript for Safari on iOS that removes short-form video from Instagram, YouTube and TikTok while leaving the rest of each site usable.

| Site | Removed | Kept |
|---|---|---|
| Instagram | Reels tab, Reels feed, Explore grid, hashtag and location results, suggested posts, ads | Stories and posts from accounts you follow, DMs, profile search, profiles |
| YouTube (incl. m.youtube.com) | Shorts tab, Shorts shelves, Shorts on channel pages; any `/shorts/` URL redirects to the home page | Regular videos |
| TikTok | Everything | Single videos opened from a link |

A reel someone sends you in a DM still opens and plays. Swiping to the next reel pauses playback and shows an overlay with *Back to video* and *Go to home page*.

## Why a userscript

iOS does not let one app modify another, so the Reels tab inside the native Instagram app cannot be removed by any third-party code. The web versions in Safari can be modified through a Safari extension, which means the code has to be JavaScript running in the page. The approach is therefore: remove (or lock) the native apps and use the sites in Safari with this script.

## Installation

1. Install [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) from the App Store.
2. Open it, tap **Set Userscripts Directory** and pick a folder in Files, e.g. `iCloud Drive/Userscripts`.
3. Copy `reelblock.user.js` into that folder.
4. Enable the extension under *Settings → Apps → Safari → Extensions → Userscripts* and allow it on instagram.com, youtube.com, m.youtube.com and tiktok.com.
5. Delete the native Instagram, YouTube and TikTok apps, or lock them with a Screen Time app limit. As long as an app is installed, links tend to open in the app instead of Safari.

Use the sites in a regular Safari tab. Home-screen web apps ("Add to Home Screen") do not run Safari extensions.

## Configuration

Each site can be turned off at the top of the script:

```js
const ENABLED = {
  instagram: true,
  youtube: true,
  tiktok: true,
};
```

`PROMOTED_LABELS` lists the words Instagram uses to mark suggested posts and ads. If your Instagram UI is in a language that is not listed, add its label there.

## How it works

The script is built around a `RULES` table with one entry per site:

| Field | Purpose |
|---|---|
| `css` | Selectors hidden with a stylesheet injected at `document-start`, so nothing flashes before the page has loaded |
| `redirect(path)` | Returns a path to redirect to, `BLOCK` to show the overlay, or `null` to allow the page |
| `videoId(path)` | Extracts the ID of a single short video from the URL |
| `singleVideoZone(path)` | Pages where only one video may play (Instagram reel pages and DMs) |
| `clean(roots)` | DOM cleanup that CSS cannot express, e.g. detecting ads by their label or hiding the empty wrapper around the Reels tab |

The pure parts (`redirect`, `videoId`, `singleVideoZone`, `matchSite` and the navigation state machine `step`) have no DOM access and are covered by unit tests.

### Detecting navigation

Instagram, YouTube and TikTok are single-page apps: navigating changes the URL through the History API without a page load, so the script never gets a load event. Userscripts runs scripts in an isolated content world by default, so patching `history.pushState` would not see the site's own calls.

Instead, a single `MutationObserver` watches the document. Every client-side navigation changes the DOM, so each mutation batch triggers a cheap comparison of `location.pathname` with the last known path. `popstate` and, where available, the Navigation API cover back/forward navigation. The observer also passes the added nodes to `clean()`, which only searches inside those nodes rather than querying the whole document again.

An earlier version polled every 300 ms. The observer reacts immediately instead of up to 300 ms late, does no work while the page is idle, and keeps the cleanup scoped to what actually changed.

### One video, three layers

1. **Route check.** `step()` remembers the first reel opened from a normal page. If the URL then changes to a different reel, the overlay is shown. Going back to a normal page resets it.
2. **Play guard.** Mobile Instagram often swaps the video on swipe without changing the URL. A capture-phase `play` listener lets the first centred video play inside a single-video zone and pauses any other one. Preloaded off-screen videos are paused silently, and videos that start while the overlay is up are paused as well.
3. **Swipe lock.** On reel pages vertical `touchmove` is cancelled, except inside dialogs (comments) and text fields.

## Development

The script is a single file because Userscripts loads one file per script. When it is loaded by Node, it exports its rule functions instead of touching the DOM, so they can be tested without a browser:

```sh
npm test
```

The tests use the built-in `node:test` runner and need no dependencies. They also run on every push via GitHub Actions.

## Limitations

- Selectors depend on markup that Instagram and YouTube change from time to time. If a Reels button or Shorts shelf reappears, inspect it with Safari's Web Inspector and add the new selector to `css`.
- Ad and suggestion detection relies on the visible label, so it only works for languages listed in `PROMOTED_LABELS`.
- Scrolling on a reel page is disabled; comments open through the comment icon.
- Hashtag pages are blocked, so hashtags in captions lead to the empty search page.
- Shorts sent to you cannot be opened, since every `/shorts/` URL redirects.
- The block can be bypassed by turning the extension off. It is meant to support self-control, not to enforce it.

## License

[MIT](LICENSE)
