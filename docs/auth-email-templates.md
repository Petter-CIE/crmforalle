# Supabase Auth – e-postmaler og innstillinger

Appen bruker `token_hash`-lenker, slik at lenkene virker uansett hvilken enhet
eller nettleser e-posten åpnes i.

Supabase → Authentication → Emails → Templates. Lenken i malene:

| Mal | Lenke |
| --- | --- |
| Magic link (invitasjoner) | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` |
| Confirm signup | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` |
| Reset password | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery` |

`RedirectTo` inneholder alltid `?neste=...`, derfor `&` foran `token_hash`.

## Innlogging
- E-post + passord er standard. Brukere uten passord (opprettet via invitasjon)
  sendes til `/nytt-passord` (styres av `user_metadata.has_password`).
- To-trinnsverifisering (TOTP) er valgfri per bruker, under Konto og sikkerhet.
- Passkeys: Authentication → Passkeys. RP ID `allseats.no`, origin `https://allseats.no`.
