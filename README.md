# Prompt Vault v3 (multi-faner + kategorier)

## Sådan kører du
1. Upload mappen til GitHub som et nyt repo.
2. Åbn i StackBlitz: `https://stackblitz.com/github/<brugernavn>/<repo>`
3. Kør `npm i` hvis den spørger, ellers kør `npm run dev`.
4. Indsæt ét eller flere public CSV-links fra Google Sheets (én pr. linje) og tryk **Opdatér**.
5. Vælg fane (øverst) og kategori (kolonne A). Prompts (kolonne B) vises som kort med *Kopiér*-knap.

## PWA
- Appen registrerer en service worker og kan installeres på telefonen.
- Sidst hentede CSV filer caches så appen fungerer offline.
