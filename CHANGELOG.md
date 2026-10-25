# Changelog

## 1.1.0

- Replace the 300 ms polling loop with a `MutationObserver`, `popstate` and the Navigation API
- Scope DOM cleanup to added or changed nodes instead of re-querying the whole document
- Move URL rules and the navigation state machine into pure functions with unit tests
- Match hostnames exactly (domain or subdomain) instead of by substring
- Make the promoted-post labels configurable and add French and Spanish
- Build the overlay without `innerHTML`
- Translate code and documentation to English, add MIT license and CI

## 1.0.0

- Initial version: hides Instagram Reels, YouTube Shorts and TikTok in Safari, with a one-video rule for shared reels
