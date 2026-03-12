

## YouTube Integration Plan

Use **YouTube Data API v3** for searching mainstream music and **YouTube IFrame Player API** for playback. This gives access to the full mainstream catalog (every major artist) with complete songs.

### Requirements

- **YouTube Data API v3 key** — free tier gives 10,000 quota units/day (~100 searches). You'll need to create one at [console.cloud.google.com](https://console.cloud.google.com/) (enable "YouTube Data API v3", create an API key).
- The **IFrame Player API** is free and requires no key.

### Important Tradeoff

YouTube's Terms of Service require the video player to be **visible** to the user (audio-only / fully hidden players violate ToS). We'll include a small, minimized video thumbnail in the player bar to stay compliant. Many music web apps do this.

### Architecture

```text
User clicks song (iTunes metadata)
        │
        ▼
YouTube Data API v3 search
  "artist + track name" → get videoId
        │
        ▼
YouTube IFrame Player API
  embed video by videoId → full playback
        │
        ▼
Player controls (play/pause/seek/volume)
  driven by IFrame API postMessage events
```

### Changes

**1. Create `src/lib/youtube.ts`**
- `searchYouTubeVideo(trackName, artistName)` — calls Data API v3 to find the best matching music video, returns `videoId`
- Cache results to minimize quota usage
- The API key will be stored as a constant (it's a public/restricted browser key)

**2. Create `src/components/player/YouTubeEmbed.tsx`**
- Renders a hidden-but-present YouTube IFrame (small thumbnail, ~60x40px, in the player bar)
- Exposes player control via the IFrame Player API (`onReady`, `onStateChange`)
- Handles autoplay policies by requiring user interaction first

**3. Rewrite `src/stores/playerStore.ts`**
- On `playTrack`: search YouTube for the `videoId`, then load it into the IFrame player
- Map IFrame player events (`PLAYING`, `PAUSED`, `ENDED`) to store state
- Use `player.getCurrentTime()` / `player.getDuration()` for progress tracking
- Keep Jamendo as secondary fallback, iTunes 30s preview as last resort
- Priority: **YouTube → Jamendo → iTunes preview**

**4. Update `src/components/player/PlayerBar.tsx`**
- Mount `<YouTubeEmbed />` component (small video thumbnail visible in the track info area)
- Update playback source badge: green "▶ Full Song (YT)" / "▶ Full Song" / orange "⚠ 30s Preview"

**5. Keep existing iTunes search for metadata**
- iTunes remains the source for track metadata, artwork, and browse/search UI
- YouTube is only used for finding and playing the actual audio/video

### Quota Considerations
- Each search costs ~100 units; daily free limit is 10,000 units (~100 searches/day)
- Aggressive caching (in-memory + localStorage) to minimize API calls
- Pre-fetch next track's videoId while current track plays

