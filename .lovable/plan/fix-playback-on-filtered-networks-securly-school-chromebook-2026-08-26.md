# Fix playback on filtered networks (Securly / school Chromebook)

## What's happening

On your Chromebook, a web filter inspects requests before letting them through. The player currently loads YouTube from `youtube-nocookie.com` (set as the `host` in the embed component, with the API script loaded from `youtube.com`). Regular `youtube.com` is allowed on your network — you can browse and play there — but the nocookie domain and the embed path are being delayed or blocked by the filter, so the player never becomes ready and nothing plays.

## Plan

**1. Use the allowed YouTube domain**
Switch the player host from `youtube-nocookie.com` to `www.youtube.com`, matching the domain that already works on your network. The API script already comes from `youtube.com`, so both will be consistent and the origin/postMessage mismatch errors go away too.

**2. Handle the slow filter check**
The filter can hold requests for ~30 seconds. Extend the player-ready wait so it doesn't give up early, and keep showing a loading state instead of failing while it waits.

**3. Show a clear message when the network blocks it**
If the player still can't initialize after the extended wait, show a short, plain notice in the player ("Your network is blocking YouTube playback") instead of a silent stall or a generic error.

**4. Warm up the player on app load**
Create the YouTube player once at startup rather than on first song, so the filter's check happens while you're browsing — by the time you press play, the player is already through.

## Technical details

- `src/components/player/YouTubeEmbed.tsx`: change `host` to `https://www.youtube.com`; init on mount at app start (already mounted with the player bar — confirm it mounts before first play).
- `src/stores/playerStore.ts`: raise the player-ready polling window (currently 20 × 100ms = 2s) to roughly 30s, keep `isLoadingAudio` true meanwhile, and set a distinct blocked/error state when it times out.
- Player UI: surface that blocked state as user-facing text.

## Caveat

If Securly blocks YouTube embeds outright (rather than just the nocookie domain), no code change can bypass it — that's enforced on the network, not in the app. In that case the notice from step 3 tells you clearly, and playback will work normally on any unfiltered network.
