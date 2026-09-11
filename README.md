# LIVNOI V1

Mobile-first English learning PWA prototype.

## Included
- Rescue vocabulary game with timer, hearts, combo and XP
- Grammar rescue mode
- Listening via browser speech synthesis
- Speaking practice via browser SpeechRecognition where supported
- Reading + focus room
- Writing mini challenge
- XP, streak, accuracy, progress and local persistence
- PWA manifest + offline service worker
- Early-access subscription screen (payments are intentionally not connected yet)

## Run locally
Because service workers need HTTP/HTTPS, do not open index.html directly if you want full PWA/offline features.

From this folder run:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 on a computer.

For phone use, deploy this folder to any HTTPS static host such as GitHub Pages, Netlify, Cloudflare Pages or Vercel. Then open the HTTPS URL on the phone. On iPhone Safari use Share > Add to Home Screen.

## Oxford / CEFR note
The starter vocabulary is selected to be compatible with the type of high-frequency learner vocabulary covered by the Oxford 3000 / CEFR framework, but LIVNOI's meanings, examples and questions are original and are not copied from Oxford dictionary entries. Before commercial launch, review Oxford licensing/branding rules if you want to display Oxford trademarks or reproduce their word-list data at scale.

## V1 limitations
- No real account backend yet: progress is stored in the browser's localStorage.
- Subscription checkout is not connected yet.
- A normal website cannot force users to stay inside the app or block other phone apps. Focus mode can request a screen wake lock when supported.
- Speech recognition support differs by browser, especially on iOS.
