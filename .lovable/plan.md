

## Fix: Remove COOP/COEP Headers from vite.config.ts

### What changes
**One file, one edit.** Remove the `headers` block from `vite.config.ts`.

### Before → After

```text
server: {                          server: {
  host: "::",                        host: "::",
  port: 8080,                        port: 8080,
  headers: {                       },
    'Cross-Origin-Opener-Policy':
      'same-origin',
    'Cross-Origin-Embedder-Policy':
      'credentialless',
  },
},
```

### Impact
- **Fixed:** Site loads on university/dorm Wi-Fi networks
- **Trade-off:** Instagram Story video generation uses single-threaded FFmpeg (~2-3s slower)
- **Nothing else changes.** No other files are touched. No other features are affected.

