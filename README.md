# Bitrock Labs

Gioco "taglia la bolla" in 3D che presenta i progetti nati in Bitrock. Implementazione del design Claude Design `Bitrock Labs v3`.

```sh
npm install
npm run dev
```

## Struttura

- `src/config.ts`: le manopole di design del prototipo (font dei titoli, transizione di zoom, stile del taglio, bloom, aberrazione, audio…). Popup, sfondo, difficoltà e regola dei bug sono solo i default: il giocatore li cambia dal pannello Impostazioni (salvati in `localStorage`).
- `src/data/projects.ts`: i progetti e la bolla "Chi siamo". Senza `texSrc` la bolla mostra un wordmark generato da `word` + `accent`.
- `src/assets/`: le immagini, importate dal codice (non in `public/`) così Vite aggiunge l'hash al nome e a ogni rilascio un'immagine modificata bypassa la cache del browser.
- `src/game/Engine.ts`: scena three.js, fisica, taglio, coreografia della camera, input e canvas 2D degli effetti. Comunica con React solo tramite lo store zustand (`src/store.ts`).
- `src/game/{shaders,post,textures,audio}.ts`: shader, bloom e aberrazione cromatica, texture generate su canvas, effetti sonori sintetizzati con WebAudio.
- `src/ui/`: overlay React (HUD, intro, tray, game over, completamento, impostazioni, popup progetto nei quattro stili).
