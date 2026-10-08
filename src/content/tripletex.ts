import type { Locale } from "@/lib/i18n/dictionaries";

export type TripletexPage = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  features: { title: string; text: string }[];
  stepsTitle: string;
  steps: string[];
  priceTitle: string;
  priceText: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  tripletexNote: string;
  ctaTitle: string;
  ctaText: string;
};

const nb: TripletexPage = {
  metaTitle: "CRM for Tripletex – kunder og fakturaer rett i CRM-et",
  metaDescription:
    "AllSeats CRM henter kunder, kontaktpersoner og fakturaer automatisk fra Tripletex. Én fast pris for hele bedriften – ubegrenset antall brukere.",
  eyebrow: "Integrasjon med Tripletex",
  title: "CRM for bedrifter som bruker Tripletex",
  lead: "Koble AllSeats til Tripletex, så hentes kundene, kontaktpersonene og fakturaene deres automatisk inn i CRM-et. Selgerne ser hva kunden har kjøpt og om de har betalt – uten å logge inn i regnskapet.",
  cta: "Prøv gratis",
  features: [
    {
      title: "Kunder og kontaktpersoner",
      text: "Kunderegisteret i Tripletex blir bedrifter og kontakter i CRM-et. Finnes bedriften fra før, kobles den på organisasjonsnummer – ingen dobbeltregistrering.",
    },
    {
      title: "Fakturaer på kundekortet",
      text: "Se fakturaer, utestående beløp og betalingsstatus direkte på bedriften i CRM-et, også fra mobilen.",
    },
    {
      title: "Oppfølging av forfalte fakturaer",
      text: "Når en faktura forfaller, får kundeansvarlig automatisk en oppfølgingsoppgave i CRM-et.",
    },
    {
      title: "Alltid oppdatert",
      text: "Dataene synkroniseres automatisk hver sjette time, og du kan synkronisere manuelt når du vil.",
    },
  ],
  stepsTitle: "Kom i gang på fem minutter",
  steps: [
    "Opprett en konto på allseats.no – gratis prøveperiode, uten kort.",
    "I Tripletex: Selskap → Ansatte → åpne ansattkortet ditt → fanen API-tilgang → Ny nøkkel, og velg applikasjonen All Seats CRM.",
    "I AllSeats: Innstillinger → Regnskap → lim inn nøkkelen og trykk Koble til.",
  ],
  priceTitle: "Pris",
  priceText:
    "Tripletex-integrasjonen er inkludert i Bedrift (990 kr/mnd for hele bedriften) og kan legges til Start for 99 kr/mnd. Alle priser eks. mva., ubegrenset antall brukere.",
  faqTitle: "Spørsmål om integrasjonen",
  faq: [
    {
      q: "Endrer AllSeats noe i regnskapet vårt?",
      a: "Nei. AllSeats leser kunder, kontaktpersoner og fakturaer fra Tripletex. Regnskapet ditt blir ikke endret.",
    },
    {
      q: "Hva trenger vi i Tripletex?",
      a: "Tilleggstjenesten Integrasjoner må være aktiv i Tripletex-abonnementet (Selskap → Mitt abonnement). Den som lager nøkkelen, må ha tilgang til kundene og fakturaene.",
    },
    {
      q: "Kan vi koble fra igjen?",
      a: "Ja, med ett klikk under Innstillinger → Regnskap. Fakturaoversikten fjernes fra CRM-et, mens bedrifter og kontakter blir liggende.",
    },
  ],
  tripletexNote: "Tripletex er et regnskapsprogram fra Tripletex AS.",
  ctaTitle: "Klar til å koble CRM og regnskap?",
  ctaText: "Prøv AllSeats gratis og koble til Tripletex på noen minutter.",
};

const en: TripletexPage = {
  metaTitle: "CRM for Tripletex – customers and invoices right in the CRM",
  metaDescription:
    "AllSeats CRM fetches customers, contact persons and invoices from Tripletex automatically. One fixed price for the whole company – unlimited users.",
  eyebrow: "Tripletex integration",
  title: "CRM for companies that use Tripletex",
  lead: "Connect AllSeats to Tripletex and your customers, contact persons and invoices are fetched into the CRM automatically. Sales sees what the customer has bought and whether they have paid – without logging in to the accounting system.",
  cta: "Try for free",
  features: [
    {
      title: "Customers and contact persons",
      text: "The customer register in Tripletex becomes companies and contacts in the CRM. Companies you already have are matched by organisation number – no duplicates.",
    },
    {
      title: "Invoices on the customer card",
      text: "See invoices, outstanding amounts and payment status right on the company in the CRM, on your phone too.",
    },
    {
      title: "Follow-up on overdue invoices",
      text: "When an invoice becomes overdue, the account owner automatically gets a follow-up task in the CRM.",
    },
    {
      title: "Always up to date",
      text: "Data is synced automatically every six hours, and you can sync manually whenever you like.",
    },
  ],
  stepsTitle: "Get started in five minutes",
  steps: [
    "Create an account at allseats.no – free trial, no card.",
    "In Tripletex: Company → Employees → open your employee card → API access tab → New key, and choose the application All Seats CRM.",
    "In AllSeats: Settings → Accounting → paste the key and press Connect.",
  ],
  priceTitle: "Price",
  priceText:
    "The Tripletex integration is included in Bedrift (NOK 990/month for the whole company) and can be added to Start for NOK 99/month. All prices excl. VAT, unlimited users.",
  faqTitle: "Questions about the integration",
  faq: [
    {
      q: "Does AllSeats change anything in our accounts?",
      a: "No. AllSeats reads customers, contact persons and invoices from Tripletex. Your accounts are not changed.",
    },
    {
      q: "What do we need in Tripletex?",
      a: "The Integrations add-on must be active in your Tripletex subscription (Company → My subscription). Whoever creates the key needs access to customers and invoices.",
    },
    {
      q: "Can we disconnect again?",
      a: "Yes, with one click under Settings → Accounting. The invoice overview is removed from the CRM, while companies and contacts stay.",
    },
  ],
  tripletexNote: "Tripletex is an accounting system from Tripletex AS.",
  ctaTitle: "Ready to connect CRM and accounting?",
  ctaText: "Try AllSeats for free and connect Tripletex in a few minutes.",
};

export const tripletexPage: Record<Locale, TripletexPage> = { nb, en };
