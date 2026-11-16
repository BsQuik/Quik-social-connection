/* Valori PUBBLICI: possono stare nel repository, anche se è pubblico.
   Servono al sito per sapere dove inviare le statistiche e al pannello per fare il login.

   MAI scrivere qui la chiave "secret" o "service_role": darebbe accesso totale al database.
   La chiave "publishable" (o "anon") è fatta per stare nel front-end perché il database
   è protetto da Row Level Security (vedi supabase/schema.sql). */
window.BSQUIK = {
  SUPABASE_URL: 'https://XXXXXXXXXXXX.supabase.co',
  SUPABASE_KEY: 'sb_publishable_XXXXXXXXXXXXXXXXXXXX'
};
