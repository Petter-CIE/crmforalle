# Supabase Auth – e-postmaler

Appen bruker `token_hash`-lenker, slik at innloggingslenken virker uansett hvilken
enhet eller nettleser e-posten åpnes i (også for invitasjoner).

Supabase → Authentication → Emails (Templates). Bytt lenken i **Magic Link** og
**Confirm signup** til:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Logg inn</a>
```

`RedirectTo` inneholder alltid `?neste=...`, derfor `&` foran `token_hash`.
Callback-ruten `/auth/callback` håndterer både `code` og `token_hash`.
