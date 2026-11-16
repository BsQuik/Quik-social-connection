# Statistiche private con Supabase: guida passo passo

Cosa ottieni:
- conteggio dei **click su ogni link** e delle visite, per giorno e per **paese**;
- un pannello `admin.html` che vedi **solo tu** (login), con grafici;
- banner cookie e pagina `cookie.html` con l'elenco di tutto ciò che viene salvato.

## Come funziona (e perché è sicuro anche con GitHub pubblico)

```
visitatore ──(accetta i cookie)──► analytics.js ──► Edge Function "track" ──► tabella "events"
                                                      (scrive lei, con la chiave segreta
                                                       che resta dentro Supabase)

tu ──(email + password)──► admin.html ──► funzione stats() ──► risponde solo se sei il proprietario
```

- Nel repository ci sono solo **due valori pubblici**: l'indirizzo del progetto e la chiave **publishable** (`config.js`).
  Sono fatti per stare nel front-end: da soli non danno accesso ai dati, perché le tabelle sono chiuse (Row Level Security senza policy).
- La chiave **secret / service_role** NON va mai nel repository: vive solo dentro Supabase e la usa la Edge Function.
- Nessuno può leggere le statistiche senza fare login con **il tuo** account.

## 1. Crea il progetto

1. Vai su <https://supabase.com>, accedi con GitHub e crea un **nuovo progetto**.
2. Scegli una **regione europea** (per i dati dei visitatori) e una password del database robusta (salvala nel gestore di password).

## 2. Crea il tuo utente e blocca le iscrizioni

1. **Authentication → Users → Add user**: email e password forti. Segna l'email.
2. Nelle impostazioni di Authentication (Sign In / Providers) **disattiva "Allow new users to sign up"**, così nessun altro può creare un account.
3. Consigliato: attiva la verifica a due fattori per il tuo account.

I nomi dei menu possono cambiare un po' nel tempo.

## 3. Crea le tabelle e i permessi

1. **SQL Editor → New query**: incolla tutto il contenuto di `supabase/schema.sql` e premi **Run**.
2. Nell'ultima istruzione cambia `LA-TUA-EMAIL@esempio.it` con l'email del passo 2 e rilancia **solo quella parte**.
   Se funziona, nella tabella `owner` c'è una riga.

## 4. Pubblica la Edge Function che salva i click

Con il terminale (serve la [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase login
supabase link --project-ref IL_TUO_PROJECT_REF
supabase functions deploy track --no-verify-jwt
supabase secrets set ALLOWED_ORIGINS=https://bsquik.github.io
```

- `IL_TUO_PROJECT_REF` è la parte iniziale dell'indirizzo del progetto (`https://IL_TUO_PROJECT_REF.supabase.co`).
- `--no-verify-jwt` serve perché la funzione è pubblica per scelta: controlla da sola cosa accetta.
- `ALLOWED_ORIGINS` accetta solo richieste dal tuo sito. Metti il dominio senza `/` finale; più domini separati da virgola.

Senza terminale: **Edge Functions → Create function**, nome `track`, incolla `supabase/functions/track/index.ts`, Deploy,
poi nelle impostazioni della funzione disattiva "Verify JWT" e aggiungi il segreto `ALLOWED_ORIGINS`.

## 5. Compila `config.js`

In **Project Settings → API Keys** copia:
- l'indirizzo del progetto (Project URL) → `SUPABASE_URL`
- la chiave **publishable** (o `anon` se il tuo progetto usa le vecchie chiavi) → `SUPABASE_KEY`

Non copiare mai la chiave `secret` o `service_role`.

## 6. Carica tutto su GitHub

Metti nel repository i file di questa cartella (stessa struttura). Il pannello sarà su
`https://bsquik.github.io/Quik-social-connection/admin.html` (adatta al tuo indirizzo).
Non è linkato da nessuna parte e ha `noindex`, ma **la protezione vera è il login**, non il nome della pagina.

## 7. Prova che funzioni

1. Apri il sito in una finestra anonima: deve comparire il banner. Premi **Accetta** e clicca un paio di link.
2. Apri `admin.html`, accedi, scegli "Ultimi 7 giorni": devi vedere visite e click.
3. Guarda il **paese**. Se compare sempre "Sconosciuto", l'header del paese non arriva alla funzione:
   dimmelo e troviamo un'alternativa. Lo script salva comunque il resto.
4. Premi **Rifiuta** e riprova: non deve arrivare nessun nuovo dato.

## Cookie e privacy

- Prima del consenso non parte nessuna richiesta di statistiche e non viene salvato nessun codice.
- Il banner ha **Accetta** e **Rifiuta** con la stessa evidenza, più una **X** che chiude senza accettare e **Personalizza**.
  Il consenso si può cambiare dal link "Gestisci cookie" in fondo alle pagine.
- Il rifiuto viene ricordato 6 mesi, il consenso 12.
- Se il browser ha attivo "Do Not Track" o Global Privacy Control, il sito non conta niente e non mostra il banner.
- In `cookie.html` **compila i campi evidenziati** (`[NOME E COGNOME]`, `[EMAIL]`, `[DATA]`).
- Il **paese** si ricava dall'IP, che non viene salvato. È una stima del luogo di connessione, **non la nazionalità**:
  una persona italiana in vacanza in Spagna risulta "Spagna".
- Il sito carica i caratteri da **Google Fonts** (Google vede l'IP del visitatore): è indicato nella pagina cookie.
  Per eliminare questo punto si possono includere i font nel repository.
- Per cancellare i dati dopo 12 mesi in automatico, nel file SQL c'è un blocco facoltativo con `pg_cron` (sezione 5).

Questa guida e i testi non sono una consulenza legale. Se il sito cresce o fai attività commerciali, fai controllare policy e informativa da un professionista.
Le regole italiane di riferimento sono le Linee guida cookie del Garante privacy (giugno 2021).

## Limiti da conoscere

- Chiunque potrebbe inviare click falsi chiamando la funzione a mano: la lista dei link ammessi e `ALLOWED_ORIGINS` riducono il rumore, ma non sono una difesa perfetta.
  Per un linktree personale è un rischio accettabile; se i numeri sembrano strani, controlla gli "Ultimi eventi".
- I click sulle tendine e sui popup che non aprono link non vengono contati: si contano i click sui link.
- I progetti gratuiti di Supabase hanno limiti e possono essere messi in pausa se inutilizzati: controlla le condizioni attuali del piano.
- Il codice SQL e la funzione non sono stati eseguiti su un tuo progetto reale: se vedi un errore quando lo lanci, incollamelo.
