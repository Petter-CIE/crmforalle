# AllSeats CRM

CRM for små bedrifter – én fast pris per bedrift, alle brukere inkludert ("every seat included").

Status: MVP under utvikling. Fase 1 (innlogging, bedrift, brukere og invitasjoner) er ferdig.

## Teknologi

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Row Level Security), region eu-central-1 (Frankfurt)
- Brønnøysundregistrene (Enhetsregisteret) for oppslag av bedrifter

## Kom i gang lokalt

```bash
cp .env.example .env.local   # fyll inn Supabase URL og publishable key
npm install
npm run dev                  # http://localhost:3000
```

## Struktur

- `src/app/logg-inn` – innlogging med e-postlenke (magic link)
- `src/app/auth` – callback og utlogging
- `src/app/kom-i-gang` – oppretting av bedrift med Brreg-søk
- `src/app/app` – selve appen (I dag, Salg, Bedrifter, Kontakter, Oppgaver, Innstillinger)
- `src/app/invitasjon/[token]` – godta invitasjon
- `src/lib/supabase` – Supabase-klienter for nettleser, server og proxy
- `supabase/migrations` – databaseskjema (kilde til sannhet for databasen)

## Sikkerhet

- Hver bedrift er en *workspace*; all data skilles med Row Level Security.
- Abonnementsfelt (plan, kontaktgrense, Stripe-ID) kan bare endres av backend.
- Kun publishable key brukes i appen. Service role-nøkkelen skal aldri inn i koden.
