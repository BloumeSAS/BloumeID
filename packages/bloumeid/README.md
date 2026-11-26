# `@bloume/id`

Zero-dependency browser fingerprinting, anti-spoofing, bot detection and server verification SDK for **BloumeID** (Bloume SAS).

## Features
- **48+ Deterministic Browser Signals**: Canvas 2D (with double-render noise probing), WebGL 1/2 & shader precision, WebGPU adapter limits, `OfflineAudioContext` compressor dynamics, hardware & screen HDR/gamut, 100+ OS font probing, Intl/timezone, math engine constants (`V8`, `SpiderMonkey`, `JavaScriptCore`), WebRTC ICE & Network Information API.
- **Anti-Spoof & Bot Detection**: Detects `navigator.webdriver`, Playwright/Puppeteer/CDP/Selenium globals, malformed `window.chrome`, inconsistent `Permissions.query`, Web Worker vs Main Thread navigator tampering, and private/incognito quota heuristics.
- **100% ThumbmarkJS Pro Compatible API**: `new BloumeID({ apiKey, endpoint, options })`, `get()`, `getFingerprint()`, `getFingerprintData()`, `setOption()`.
- **Server-Side Verification (`@bloume/id/server`)**: `BloumeIDServer` with `verifyRequest(requestId)` and `getVisitor(visitorId)`.

