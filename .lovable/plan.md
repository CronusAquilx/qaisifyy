

## Alternative Audio Sources

### Option 1: Jamendo API (Recommended)
- **Free, full-length tracks** — no 30s limit
- Creative Commons licensed music catalog
- Simple REST API, returns direct MP3 URLs → works perfectly with HTML5 `<audio>`
- No iframe hacks, no postMessage, no autoplay policy issues
- Downside: indie/lesser-known artists only, no mainstream pop

### Option 2: Enhanced iTunes Preview Experience  
- Keep the current 30s previews but make them seamless
- Auto-crossfade between tracks, loop previews, show "30s Preview" clearly
- Zero new API keys needed — works right now
- Downside: only 30s per track

### Option 3: Spotify Web Playback SDK
- Full songs from Spotify's catalog (mainstream artists)
- Requires user to have Spotify Premium and log in via OAuth
- More complex setup but huge catalog
- Downside: Premium-only, OAuth flow needed

### Option 4: SoundCloud API  
- Mix of indie and some mainstream, embeddable widget
- Requires API app approval (can take time)
- Downside: approval process, limited catalog

### Recommendation
**Jamendo** is the easiest win — full songs, direct audio URLs, free API key, works with a simple `<audio>` element. The tradeoff is the catalog is indie music only.

If mainstream music matters most, **polishing the iTunes 30s preview experience** is the most reliable path with zero risk of API failures.

