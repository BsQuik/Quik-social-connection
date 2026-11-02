# Come mettere le API di Google (YouTube) nel sito, senza regalarle a nessuno

Il sito usa la **YouTube Data API v3** per due cose: il **counter degli iscritti** e la card **Ultimo video**.
Il repository su GitHub può essere pubblico, quindi **la chiave API non deve mai finire nel codice**.

## La regola d'oro

Se una chiave è scritta in un file del repository (`index.html`, `script.js`, `stats.json`, `.env`...),
è pubblica: la leggono tutti, anche dalla cronologia dei commit, e ci sono bot che scansionano GitHub apposta per rubarle.

Come funziona il sito, in modo sicuro:

```
GitHub Actions (ha la chiave nei Secrets)
        │  ogni 30 minuti chiede a YouTube iscritti e ultimo video
        ▼
   stats.json  ← contiene solo numeri e un titolo: dati già pubblici
        ▼
     il sito legge solo stats.json (nessuna chiave nel browser)
```

La chiave sta solo nei **Secrets** di GitHub e viene usata solo dal workflow
`.github/workflows/update-stats.yml` tramite `scripts/update-stats.mjs`.

## 1. Creare la chiave su Google Cloud

1. Vai su <https://console.cloud.google.com> e accedi con il tuo account Google.
2. In alto, menu dei progetti → **Nuovo progetto** (nome a piacere, es. `bsquik-sito`).
3. **API e servizi → Libreria** → cerca **YouTube Data API v3** → **Abilita**.
4. **API e servizi → Credenziali → Crea credenziali → Chiave API**.
5. Copia la chiave (inizia con `AIza...`) e tienila in un posto privato, per esempio un gestore di password.

I nomi dei menu possono cambiare un po' nel tempo, ma il percorso è questo.

## 2. Limitare la chiave (fondamentale)

Nella pagina **Credenziali**, clicca sul nome della chiave:

- **Restrizioni API → Limita chiave → spunta solo "YouTube Data API v3"** → Salva.
  Così, anche se qualcuno la rubasse, non potrebbe usarla per altri servizi Google.
- **Restrizioni applicazione**: lascia **Nessuna**. I server di GitHub Actions cambiano indirizzo IP
  a ogni esecuzione, quindi una restrizione per IP bloccherebbe anche te.
  La tua protezione è tenere la chiave **segreta** (passo 3) più la restrizione sull'API.

> Se un giorno mettessi la chiave direttamente nel browser, dovresti limitarla per **referrer HTTP**
> al tuo dominio e darla comunque per "visibile a tutti". Per questo il sito **non** lo fa: usa Actions.

## 3. Mettere la chiave nei Secrets di GitHub

1. Sul repository: **Settings → Secrets and variables → Actions → New repository secret**.
2. **Name:** `YOUTUBE_API_KEY` (identico, maiuscole comprese)
3. **Secret:** incolla la chiave → **Add secret**.
4. Scheda **Actions → Aggiorna iscritti YouTube → Run workflow** per provarlo subito.

Il workflow aggiorna `stats.json` solo se qualcosa è cambiato (iscritti o ultimo video).
Se il log dice "Nessuna novità", va tutto bene.

Se il repository ha dei fork: i Secrets **non** vengono passati ai workflow dei fork, quindi nessuno
può leggerli copiando il repo.

## 4. Cose da NON fare

- Non scrivere la chiave in nessun file e non committarla, nemmeno "per provare".
- Non stamparla nei log del workflow (niente `echo $YOUTUBE_API_KEY`).
- Non mandarla in chat, screenshot o video (attenzione alle dirette e ai tutorial!).
- Non usare file `.env` nel repository. Se ne usi uno in locale, aggiungi `.env` al file `.gitignore`.

Per provare lo script sul tuo computer senza salvare la chiave in un file:

```bash
YOUTUBE_API_KEY="la_tua_chiave" node scripts/update-stats.mjs
```

## 5. Se la chiave è finita online per sbaglio

Considerala **compromessa**, anche se cancelli il file: resta nella cronologia di Git.

1. Su Google Cloud → Credenziali → **elimina** la chiave (o rigenerala).
2. Creane una nuova, limitata come al punto 2.
3. Aggiorna il secret `YOUTUBE_API_KEY` su GitHub.
4. Controlla l'uso su Google Cloud (**API e servizi → Metriche**) per vedere se qualcuno l'ha usata.

## 6. Limiti e consumo

- Quota gratuita predefinita: **10.000 unità al giorno** per progetto.
- Ogni esecuzione usa **2 chiamate** (canale + ultimo video, circa 1 unità l'una).
  Ogni 30 minuti sono 48 esecuzioni al giorno, cioè circa **100 unità**: sei molto sotto il limite.
- Sopra i 1.000 iscritti l'API arrotonda il numero a **3 cifre significative** (es. 1.230).
- Su repository pubblici GitHub può **disattivare i workflow programmati** dopo un periodo lungo
  senza attività. Se il counter si ferma, apri **Actions** e riattiva il workflow.

## 7. Se qualcosa non funziona

| Problema | Cosa controllare |
|---|---|
| Errore `403` | La **YouTube Data API v3** è abilitata nel progetto? La restrizione della chiave include quell'API? |
| `Manca YOUTUBE_API_KEY` | Il secret si chiama esattamente `YOUTUBE_API_KEY`? È nel repository giusto? |
| `Canale @... non trovato` | Controlla `YOUTUBE_HANDLE` nel workflow (senza `@`, es. `BsQuik`). |
| `quotaExceeded` | Hai superato le 10.000 unità: aspetta il giorno dopo o riduci la frequenza nel `cron`. |
| Il workflow non fa commit | Nessun cambiamento nei dati: è normale. |
| Il sito mostra sempre 881 | `stats.json` non è stato ancora creato dal workflow, oppure il sito non è sullo stesso hosting del file. |

## Checklist finale

- [ ] Chiave creata e **limitata** a YouTube Data API v3
- [ ] Chiave salvata solo nei **Secrets** di GitHub
- [ ] Nessuna chiave in `index.html`, `script.js`, `stats.json` o `.env` committato
- [ ] Workflow lanciato a mano almeno una volta
- [ ] `stats.json` aggiornato nel repository
