import type { LegalDoc } from "./types";

const nb: LegalDoc = {
  title: "Personvernerklæring",
  lead: "Slik behandler CIE AS personopplysninger i AllSeats CRM og på allseats.no. Gjelder fra 2. oktober 2026.",
  sections: [
    {
      h: "1. Hvem som er ansvarlig",
      body: [
        "CIE AS (org.nr. 818 823 452 MVA, Bjørøyvegen 332, 5177 Bjørøyhamn) er behandlingsansvarlig for opplysninger om brukerne av AllSeats CRM og om besøkende på allseats.no. Spørsmål om personvern sendes til post@allseats.no.",
        "Opplysningene kundene våre legger inn i CRM-et om sine egne kunder og kontakter, behandler vi på vegne av kunden som databehandler. For disse er kunden behandlingsansvarlig, og databehandleravtalen gjelder.",
      ],
    },
    {
      h: "2. Hvilke opplysninger vi behandler",
      body: [
        {
          list: [
            "Konto: navn, e-postadresse, språkvalg, rolle i bedriften og hvilken bedrift du tilhører.",
            "Innlogging: passord (lagret kryptert som hash), eventuell to-trinnsverifisering og passkeys (vi lagrer bare den offentlige nøkkelen), tidspunkt for innlogging.",
            "Bruk: hvem som har opprettet og endret oppføringer, notater og oppgaver, og hvem som har lastet opp vedlegg.",
            "Teknisk: IP-adresse og nettleserinformasjon i serverlogger, som brukes til drift og sikkerhet.",
            "Kommunikasjon: e-poster vi sender deg (invitasjoner, innloggingslenker, varsler om oppgaver) og henvendelser du sender oss.",
            "Betaling (når betaling innføres): fakturaopplysninger om bedriften. Kortopplysninger håndteres av betalingsleverandøren og lagres ikke hos oss.",
          ],
        },
      ],
    },
    {
      h: "3. Formål og rettslig grunnlag",
      body: [
        {
          list: [
            "Levere tjenesten, holde kontoen din sikker og gi deg tilgang til bedriftens data – nødvendig for å oppfylle avtalen med bedriften du jobber for (GDPR art. 6 nr. 1 b og f).",
            "Sende varsler om oppgaver og prosjekter – berettiget interesse i at tjenesten fungerer. Du kan slå av varslene under Konto og sikkerhet (art. 6 nr. 1 f).",
            "Fakturering og regnskap – rettslig forpliktelse etter bokføringsloven (art. 6 nr. 1 c).",
            "Sikkerhet, feilsøking og forebygging av misbruk – berettiget interesse (art. 6 nr. 1 f).",
          ],
        },
        "Vi bruker ikke opplysningene til reklame, selger dem ikke og bruker dem ikke til å trene kunstig intelligens.",
        "Det er ikke lovpålagt å gi oss opplysningene, men uten navn og e-postadresse kan vi ikke opprette en konto. Vi bruker ikke automatiserte avgjørelser eller profilering.",
      ],
    },
    {
      h: "4. Informasjonskapsler (cookies)",
      body: [
        "Vi bruker bare informasjonskapsler som er strengt nødvendige for å levere tjenesten du har bedt om. De krever derfor ikke samtykke etter ekomloven § 3-15:",
        {
          list: [
            "innloggingsøkt (sb-…-auth-token) – holder deg innlogget,",
            "cfa_lang – husker språkvalget ditt,",
            "cfa_ws – husker hvilken bedrift du jobber i.",
          ],
        },
        "Vi bruker ingen analyse-, sporings- eller reklamekapsler.",
      ],
    },
    {
      h: "5. Hvem vi deler opplysninger med",
      body: [
        "Vi bruker disse underleverandørene (databehandlere) for å drive tjenesten:",
        {
          list: [
            "Supabase Inc. – database, innlogging og fillagring. Data lagres i Frankfurt (EU).",
            "Vercel Inc. – drift av nettsiden og applikasjonen. Serverfunksjonene kjører i Frankfurt (EU).",
            "One.com Group AB (Sverige) – utsending av e-post fra noreply@allseats.no. E-posten behandles i datasentre i Danmark (EU).",
          ],
        },
        "Supabase og Vercel er amerikanske selskaper. Overføringer utenfor EØS er sikret med EUs standard personvernbestemmelser (SCC), og Vercel er i tillegg sertifisert under EU–US Data Privacy Framework.",
        "Vi utleverer ikke opplysninger til andre, med mindre loven krever det.",
      ],
    },
    {
      h: "6. Hvor lenge vi lagrer opplysningene",
      body: [
        {
          list: [
            "Kontoopplysninger lagres så lenge du har tilgang til en bedrift i AllSeats CRM. Når bedriften avslutter abonnementet, slettes dataene etter reglene i brukervilkårene.",
            "Serverlogger lagres i kort tid, normalt under 90 dager.",
            "Regnskapsmateriale, som fakturaer, lagres i minst fem år etter utløpet av regnskapsåret, slik bokføringsloven krever.",
          ],
        },
      ],
    },
    {
      h: "7. Sikkerhet",
      body: [
        "All trafikk er kryptert (HTTPS). Hver bedrifts data er skilt fra andre bedrifter i databasen, og tilgangen styres per bruker. Du kan beskytte kontoen din med to-trinnsverifisering eller passkey.",
      ],
    },
    {
      h: "8. Dine rettigheter",
      body: [
        "Du har rett til innsyn i, retting og sletting av opplysningene om deg, og til å protestere mot eller be om begrensning av behandlingen. Du kan også be om å få opplysningene utlevert i et maskinlesbart format (dataportabilitet). Rettighetene følger av personopplysningsloven og personvernforordningen (GDPR).",
        "Gjelder henvendelsen opplysninger en kunde har lagt inn om deg i CRM-et, sender vi den videre til kunden, som er ansvarlig for disse opplysningene.",
        "Skriv til post@allseats.no. Vi svarer innen 30 dager.",
        "Mener du at vi behandler opplysninger i strid med regelverket, kan du klage til Datatilsynet (datatilsynet.no).",
      ],
    },
    {
      h: "9. Endringer",
      body: ["Vi oppdaterer erklæringen når behandlingen endres. Datoen øverst viser når den sist ble endret."],
    },
  ],
};

const en: LegalDoc = {
  title: "Privacy policy",
  lead: "How CIE AS processes personal data in AllSeats CRM and on allseats.no. Effective from 2 October 2026.",
  sections: [
    {
      h: "1. Who is responsible",
      body: [
        "CIE AS (org. no. 818 823 452 MVA, Bjørøyvegen 332, 5177 Bjørøyhamn, Norway) is the controller for data about the users of AllSeats CRM and about visitors to allseats.no. Questions about privacy can be sent to post@allseats.no.",
        "Data our customers enter into the CRM about their own customers and contacts is processed by us on the customer’s behalf, as a processor. For that data the customer is the controller, and the data processing agreement applies.",
      ],
    },
    {
      h: "2. What data we process",
      body: [
        {
          list: [
            "Account: name, e-mail address, language, role in the company and which company you belong to.",
            "Login: password (stored as an encrypted hash), any two-step verification and passkeys (we only store the public key), time of login.",
            "Use: who created and changed records, notes and tasks, and who uploaded attachments.",
            "Technical: IP address and browser information in server logs, used for operations and security.",
            "Communication: e-mails we send you (invitations, login links, task notifications) and messages you send us.",
            "Payment (once payments are introduced): billing details about the company. Card details are handled by the payment provider and are not stored by us.",
          ],
        },
      ],
    },
    {
      h: "3. Purposes and legal basis",
      body: [
        {
          list: [
            "Providing the service, keeping your account secure and giving you access to your company’s data – necessary to perform the agreement with the company you work for (GDPR Art. 6(1)(b) and (f)).",
            "Sending notifications about tasks and projects – legitimate interest in the service working. You can turn notifications off under Account and security (Art. 6(1)(f)).",
            "Invoicing and accounting – legal obligation under the Norwegian Bookkeeping Act (Art. 6(1)(c)).",
            "Security, troubleshooting and preventing misuse – legitimate interest (Art. 6(1)(f)).",
          ],
        },
        "We do not use the data for advertising, do not sell it and do not use it to train artificial intelligence.",
        "You are not required by law to give us the data, but without a name and e-mail address we cannot create an account. We do not use automated decision-making or profiling.",
      ],
    },
    {
      h: "4. Cookies",
      body: [
        "We only use cookies that are strictly necessary to provide the service you have asked for. They therefore do not require consent under section 3-15 of the Norwegian Electronic Communications Act:",
        {
          list: [
            "login session (sb-…-auth-token) – keeps you logged in,",
            "cfa_lang – remembers your language,",
            "cfa_ws – remembers which company you are working in.",
          ],
        },
        "We use no analytics, tracking or advertising cookies.",
      ],
    },
    {
      h: "5. Who we share data with",
      body: [
        "We use these sub-processors to run the service:",
        {
          list: [
            "Supabase Inc. – database, login and file storage. Data is stored in Frankfurt (EU).",
            "Vercel Inc. – hosting of the website and application. Server functions run in Frankfurt (EU).",
            "One.com Group AB (Sweden) – sending e-mail from noreply@allseats.no. E-mail is processed in data centres in Denmark (EU).",
          ],
        },
        "Supabase and Vercel are US companies. Transfers outside the EEA are covered by the EU Standard Contractual Clauses (SCC), and Vercel is also certified under the EU–US Data Privacy Framework.",
        "We do not disclose data to anyone else unless required by law.",
      ],
    },
    {
      h: "6. How long we keep data",
      body: [
        {
          list: [
            "Account data is kept for as long as you have access to a company in AllSeats CRM. When a company ends its subscription, its data is deleted as described in the terms of service.",
            "Server logs are kept for a short time, normally less than 90 days.",
            "Accounting records, such as invoices, are kept for at least five years after the end of the financial year, as the Bookkeeping Act requires.",
          ],
        },
      ],
    },
    {
      h: "7. Security",
      body: [
        "All traffic is encrypted (HTTPS). Each company’s data is separated from other companies in the database, and access is controlled per user. You can protect your account with two-step verification or a passkey.",
      ],
    },
    {
      h: "8. Your rights",
      body: [
        "You have the right to access, correct and delete data about you, and to object to or ask us to restrict the processing. You can also ask to receive your data in a machine-readable format (data portability). These rights follow from the Norwegian Personal Data Act and the GDPR.",
        "If your request concerns data a customer has entered about you in the CRM, we forward it to that customer, who is responsible for that data.",
        "Write to post@allseats.no. We reply within 30 days.",
        "If you believe we process data in breach of the rules, you can complain to the Norwegian Data Protection Authority (Datatilsynet, datatilsynet.no).",
      ],
    },
    {
      h: "9. Changes",
      body: ["We update this policy when the processing changes. The date at the top shows when it was last changed."],
    },
  ],
};

export const privacy = { nb, en };
