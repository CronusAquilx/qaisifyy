# Fix the proxy YouTube handoff

## Goal
When a school proxy strips YouTube's player, stop sending users to the broken proxied YouTube page.

## Changes
- Keep Qaisify's normal embedded playback unchanged on regular networks.
- When Qaisify detects it is running inside a proxy frame, replace the unusable embedded player with one clear action.
- Open the selected song's canonical YouTube watch page in the top-level browser context, escaping the proxy frame when the browser permits it.
- Clarify that the song must be played outside the proxy because the proxy blocks YouTube's video resources.

## Verification
- Check the updated fallback renders the selected song and direct-open action.
- Run the existing TypeScript check.
