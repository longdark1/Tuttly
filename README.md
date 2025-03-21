# Tuttly

Modern Twitch stream böngésző alkalmazás, amely lehetővé teszi a Twitch streamek egyszerű böngészését és megtekintését.

## Funkciók

- 🎮 Twitch kategóriák böngészése
- 📺 Élő streamek megtekintése
- 💬 Beépített chat funkció
- ⭐ Kedvencek kezelése
- 🌍 Többnyelvű támogatás
- 📱 Reszponzív dizájn
- 🔄 Offline mód támogatás

## Technológiák

- Three.js - 3D grafika és animációk
- GSAP - Fejlett animációk
- Axios - HTTP kérések kezelése
- Vite - Modern build eszköz
- Twitch API - Stream integráció

## Telepítés

1. Klónozd a repository-t:
```bash
git clone https://github.com/felhasznaloneved/tuttly.git
```

2. Navigálj a projekt mappájába:
```bash
cd tuttly
```

3. Telepítsd a függőségeket:
```bash
npm install
```

4. Indítsd el a fejlesztői szervert:
```bash
npm run dev
```

## Build

A production build elkészítéséhez futtasd:
```bash
npm run build
```

## Környezeti változók

A következő környezeti változókat kell beállítani:

- `VITE_TWITCH_CLIENT_ID` - Twitch API kliens azonosító
- `VITE_TWITCH_CLIENT_SECRET` - Twitch API kliens titok

## Licensz

MIT License - lásd a [LICENSE](LICENSE) fájlt a részletekért. 