# Supabase Auth – e-postmaler og innstillinger

Appen bruker `token_hash`-lenker, slik at lenkene virker uansett hvilken enhet
eller nettleser e-posten åpnes i.

Supabase → Authentication → Emails → Templates. Lenken i malene:

| Mal | Lenke |
| --- | --- |
| Magic link (innloggingslenke og invitasjoner) | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` |
| Confirm signup | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` |
| Reset password | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery` |

`RedirectTo` inneholder alltid `?neste=...`, derfor `&` foran `token_hash`.

## Innlogging
- E-post + passord er standard. Alternativt: innloggingslenke på e-post (Magic link-malen,
  `shouldCreateUser: false`) eller passkey. Brukere uten passord (opprettet via invitasjon)
  sendes til `/nytt-passord` (styres av `user_metadata.has_password`).
- To-trinnsverifisering (TOTP) er valgfri per bruker, under Konto og sikkerhet.
- Passkeys: Authentication → Passkeys. RP ID `allseats.no`, origin `https://allseats.no`.

## Magic link-mal (nøytral – brukes både til innlogging og invitasjoner)

Subject: `Logg inn i AllSeats CRM / Log in to AllSeats CRM`

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-weight:bold;color:#1f6f54;font-size:15px">AllSeats CRM</p>
  <p style="font-size:15px;line-height:1.5">Klikk på knappen for å logge inn. Lenken kan brukes én gang og utløper etter en time.</p>
  <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#1f6f54;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Logg inn</a></p>
  <p style="font-size:13px;color:#52525b;line-height:1.5">Click the button to log in. The link works once and expires after an hour.</p>
  <p style="font-size:12px;color:#71717a">Har du ikke bedt om dette, kan du se bort fra e-posten. / If you didn't ask for this, you can ignore this e-mail.</p>
</div>
```
