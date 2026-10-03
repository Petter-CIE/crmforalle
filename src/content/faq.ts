import type { Locale } from "@/lib/i18n/dictionaries";

export type FaqItem = { q: string; a: string[]; link?: { href: string; label: string } };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };
export type Faq = { title: string; lead: string; groups: FaqGroup[]; contactTitle: string; contactText: string };

const nb: Faq = {
  title: "Spørsmål og svar",
  lead: "Alt du lurer på om AllSeats CRM – fra pris og brukere til import, oppgaver og sikkerhet.",
  groups: [
    {
      id: "pris",
      title: "Pris og abonnement",
      items: [
        {
          q: "Hva koster AllSeats CRM?",
          a: [
            "Start koster 249 kr/mnd og Bedrift 590 kr/mnd, eks. mva. Prisen gjelder for hele bedriften – alle brukere er inkludert.",
            "Betaler dere årlig, får dere 2 måneder gratis (dere betaler for 10 av 12 måneder).",
          ],
          link: { href: "/#pris", label: "Se prisene" },
        },
        {
          q: "Hva betyr ubegrenset antall brukere?",
          a: [
            "Dere kan invitere så mange kolleger dere vil uten at prisen endres. Prisen avhenger bare av hvor mange bedrifter og kontakter dere har i CRM-et: opptil 2 000 på Start og 25 000 på Bedrift.",
          ],
        },
        {
          q: "Hva teller med i grensen på 2 000 eller 25 000?",
          a: [
            "Bedrifter og kontakter til sammen. Salg, oppgaver, notater, prosjekter og vedlegg teller ikke.",
            "Trenger dere flere, kan dere kjøpe ekstra kontaktpakker: på Start +2 000 for 50 kr/mnd (opptil to pakker), på Bedrift +25 000 for 250 kr/mnd. Skriv til post@allseats.no.",
            "Når grensen er nådd, kan dere fortsatt bruke alt som ligger inne, men ikke legge til nye bedrifter eller kontakter før dere har kjøpt en pakke eller byttet til Bedrift.",
          ],
        },
        {
          q: "Hvordan fungerer prøveperioden?",
          a: [
            "De første 14 dagene er gratis, og dere trenger ikke kort. Dere får tilgang til alt i Start-planen.",
            "Når prøveperioden er over, velger dere et abonnement for å fortsette. Gjør dere ikke det, kan dere fortsatt lese og eksportere dataene i 30 dager før de slettes – vi varsler på e-post først.",
          ],
        },
        {
          q: "Hvordan velger eller bytter vi abonnement?",
          a: ["Skriv til post@allseats.no, så setter vi opp eller endrer abonnementet for dere. Dere kan bytte mellom Start og Bedrift og mellom månedlig og årlig betaling."],
        },
        {
          q: "Hvordan betaler vi?",
          a: [
            "Med faktura. Vi sender fakturaen på e-post forskuddsvis for en måned eller et år om gangen, med mva. i tillegg. Vi tar ikke betalt med kort.",
            "Fortell oss hvilken e-postadresse fakturaen skal til, og om dere trenger en referanse eller et bestillingsnummer på den.",
          ],
        },
        {
          q: "Hva er tillegget for Tripletex og Fiken?",
          a: [
            "En kobling til regnskapsprogrammet, slik at kunder og fakturaer henger sammen med CRM-et. Den er under utvikling.",
            "Tillegget koster 50 kr/mnd på Start og er inkludert i Bedrift.",
          ],
        },
        {
          q: "Hvordan sier vi opp?",
          a: [
            "Skriv til post@allseats.no. Månedsabonnement løper ut perioden som er betalt, årsabonnement løper ut året og fornyes ikke.",
            "Etter oppsigelse kan dere lese og eksportere dataene i 30 dager. Deretter slettes de.",
          ],
          link: { href: "/vilkar", label: "Les brukervilkårene" },
        },
      ],
    },
    {
      id: "kom-i-gang",
      title: "Kom i gang",
      items: [
        {
          q: "Hvordan inviterer jeg kollegene?",
          a: ["Gå til Innstillinger og skriv inn e-postadressen. Kollegaen får en e-post med lenke og blir med i bedriften når hen har logget inn eller opprettet konto."],
        },
        {
          q: "Hva er forskjellen på eier, administrator og bruker?",
          a: [
            "Alle kan jobbe med bedrifter, kontakter, salg, oppgaver og prosjekter.",
            "Eier og administrator kan i tillegg invitere og fjerne brukere, endre roller, endre salgsfasene og eksportere alle data. Det er bare én eier – den som opprettet bedriften.",
          ],
        },
        {
          q: "Kan jeg være med i flere bedrifter?",
          a: ["Ja. Blir du invitert til flere bedrifter, bytter du mellom dem øverst i menyen. Dataene holdes helt adskilt."],
        },
        {
          q: "Kan vi bruke CRM-et på mobilen?",
          a: ["Ja, det fungerer i nettleseren på mobil, nettbrett og PC. Det er ingen app å installere."],
        },
        {
          q: "Hvilke språk finnes?",
          a: ["Norsk og engelsk. Hver bruker velger språk selv nederst i menyen."],
        },
      ],
    },
    {
      id: "import",
      title: "Import og eksport",
      items: [
        {
          q: "Hvordan får jeg inn kundene vi har fra før?",
          a: [
            "Gå til Bedrifter eller Kontakter og trykk Importer. Last opp en Excel-fil (.xlsx) eller CSV med overskrifter i første rad, og koble kolonnene til feltene i CRM-et.",
            "På importsiden kan du laste ned en Excel-mal med veiledning. Bedrifter som ikke finnes, opprettes automatisk, og kontakter med en e-post som allerede finnes, hoppes over.",
          ],
          link: { href: "/importmal-allseats.xlsx", label: "Last ned Excel-malen" },
        },
        {
          q: "Kan dere importere for oss?",
          a: ["Ja. Send filen til post@allseats.no, så importerer vi kontaktene og bedriftene for dere for 150 kr eks. mva. Formatet spiller ingen rolle – Excel, CSV eller en eksport fra et annet system."],
        },
        {
          q: "Kan vi få ut dataene våre?",
          a: ["Ja, når som helst. Eier og administrator kan laste ned bedrifter og kontakter som CSV-filer under Innstillinger. Filene kan åpnes i Excel."],
        },
      ],
    },
    {
      id: "bruk",
      title: "Daglig bruk",
      items: [
        {
          q: "Hvorfor er bedrifter og kontakter skilt?",
          a: [
            "En bedrift kan ha mange kontaktpersoner, og en person kan bytte jobb. Derfor er bedriften og personene egne oppføringer som kobles sammen.",
            "Privatkunder legges inn som kontakter uten bedrift, med egen adresse og eventuelt samtykke til markedsføring.",
          ],
        },
        {
          q: "Må jeg skrive inn alt om bedriften selv?",
          a: ["Nei. Skriv navnet eller org.nr. når du oppretter en bedrift, så hentes adresse, bransje og org.nr. fra Brønnøysundregistrene."],
        },
        {
          q: "Hva brukes prosjekter til?",
          a: [
            "Et prosjekt samler bedrifter, kontakter, salg og oppgaver som hører sammen – for eksempel en kampanje, et produkt eller en kundegruppe. Hvert prosjekt kan ha en prosjektleder.",
            "I listene over bedrifter og kontakter ser du hvilke prosjekter hver av dem er med i, og du kan filtrere på prosjekt.",
          ],
        },
        {
          q: "Kan jeg endre mange bedrifter eller kontakter på en gang?",
          a: ["Ja. Huk av radene i listen (eller alle med boksen øverst), og velg handling i linjen som dukker opp: legg til i eller fjern fra prosjekt, sett ansvarlig eller slett."],
        },
        {
          q: "Hvordan fungerer oppgaver?",
          a: [
            "En oppgave har en ansvarlig og kan ha flere som jobber med den. Den kan være åpen, pågår eller ferdig, og du kan skrive notater og legge ved filer.",
            "Administratorer ser alle oppgaver først, andre ser sine egne. Du kan filtrere på person og prosjekt.",
          ],
        },
        {
          q: "Kan jeg lagre e-poster i CRM-et?",
          a: [
            "Ja. Hver bedrift får automatisk en egen CRM-adresse – du finner den under E-post. Legg den i blindkopi (Bcc) når du skriver til en kunde, eller videresend e-poster du har fått. Det virker fra Outlook, Gmail og mobilen, og under E-post finner du en steg-for-steg-veiledning.",
            "E-posten lagres på kontakten med samme e-postadresse eller på bedriften med samme domene. Finner vi ingen, venter den i en liste til du har opprettet kontakten.",
          ],
        },
        {
          q: "Når får jeg e-post fra CRM-et?",
          a: [
            "Når du får en oppgave eller et prosjekt, når noen legger deg til på en oppgave, og når noen skriver et notat på en oppgave du er med på.",
            "Du kan slå av e-postvarslene under Konto og sikkerhet.",
          ],
        },
      ],
    },
    {
      id: "sikkerhet",
      title: "Innlogging og sikkerhet",
      items: [
        {
          q: "Hvordan kan jeg logge inn?",
          a: [
            "Med e-post og passord, med en innloggingslenke på e-post eller med en passkey (Windows Hello, Face ID, Touch ID eller fingeravtrykk på mobilen). Hver bruker velger selv.",
            "Innloggingslenken krever ingen oppsett. En passkey legger du til under Konto og sikkerhet.",
          ],
        },
        {
          q: "Hvor lenge virker innloggingslenken?",
          a: ["Lenken kan bare brukes én gang og virker i kort tid. Har den gått ut, ber du bare om en ny."],
        },
        {
          q: "Har dere to-trinnsverifisering?",
          a: [
            "Ja. Du kan slå på to-trinnsverifisering med en autentiseringsapp under Konto og sikkerhet. Logger du inn med passkey, regnes det allerede som to trinn: noe du har (enheten) og noe du er eller vet (ansikt, fingeravtrykk eller PIN).",
          ],
        },
        {
          q: "Hvor lagres dataene?",
          a: [
            "I EU – databasen ligger i Frankfurt. Hver bedrift er skilt fra de andre i databasen, så ingen andre bedrifter kan se dataene deres.",
            "Vi bruker ikke dataene til reklame, selger dem ikke og bruker dem ikke til å trene kunstig intelligens.",
          ],
          link: { href: "/personvern", label: "Les personvernerklæringen" },
        },
        {
          q: "Har dere databehandleravtale?",
          a: ["Ja. Databehandleravtalen er en del av brukervilkårene og gjelder automatisk for alle kunder. Den oppfyller kravene i personvernforordningen (GDPR) art. 28."],
          link: { href: "/databehandleravtale", label: "Les databehandleravtalen" },
        },
      ],
    },
  ],
  contactTitle: "Fant du ikke svaret?",
  contactText: "Skriv til oss, så svarer vi så fort vi kan.",
};

const en: Faq = {
  title: "Questions and answers",
  lead: "Everything you might wonder about AllSeats CRM – from pricing and users to import, tasks and security.",
  groups: [
    {
      id: "pris",
      title: "Pricing and subscription",
      items: [
        {
          q: "How much does AllSeats CRM cost?",
          a: [
            "Start costs NOK 249/month and Bedrift NOK 590/month, excl. VAT. The price covers the whole company – every user is included.",
            "Pay yearly and you get 2 months free (you pay for 10 of 12 months).",
          ],
          link: { href: "/#pris", label: "See pricing" },
        },
        {
          q: "What does unlimited users mean?",
          a: [
            "You can invite as many colleagues as you like without the price changing. The price only depends on how many companies and contacts you have in the CRM: up to 2,000 on Start and 25,000 on Bedrift.",
          ],
        },
        {
          q: "What counts towards the 2,000 or 25,000 limit?",
          a: [
            "Companies and contacts together. Deals, tasks, notes, projects and attachments don't count.",
            "Need more? Buy extra contact packs: on Start +2,000 for NOK 50/month (up to two packs), on Bedrift +25,000 for NOK 250/month. Write to post@allseats.no.",
            "Once the limit is reached you can still use everything you have, but you can't add new companies or contacts until you've bought a pack or switched to Bedrift.",
          ],
        },
        {
          q: "How does the trial work?",
          a: [
            "The first 14 days are free and no card is needed. You get everything in the Start plan.",
            "When the trial ends, choose a subscription to continue. If you don't, you can still read and export your data for 30 days before it is deleted – we warn you by e-mail first.",
          ],
        },
        {
          q: "How do we choose or change our subscription?",
          a: ["Write to post@allseats.no and we'll set up or change the subscription for you. You can switch between Start and Bedrift and between monthly and yearly payment."],
        },
        {
          q: "How do we pay?",
          a: [
            "By invoice. We send the invoice by e-mail in advance for one month or one year at a time, with VAT added. We don't take card payments.",
            "Tell us which e-mail address the invoice should go to, and whether you need a reference or purchase order number on it.",
          ],
        },
        {
          q: "What is the Tripletex and Fiken add-on?",
          a: [
            "A link to your accounting software so customers and invoices tie in with the CRM. It is in development.",
            "The add-on costs NOK 50/month on Start and is included in Bedrift.",
          ],
        },
        {
          q: "How do we cancel?",
          a: [
            "Write to post@allseats.no. A monthly subscription runs to the end of the paid period; a yearly one runs to the end of the year and is not renewed.",
            "After cancelling you can read and export your data for 30 days. After that it is deleted.",
          ],
          link: { href: "/vilkar", label: "Read the terms of service" },
        },
      ],
    },
    {
      id: "kom-i-gang",
      title: "Getting started",
      items: [
        {
          q: "How do I invite my colleagues?",
          a: ["Go to Settings and enter their e-mail address. They get an e-mail with a link and join the company once they have logged in or created an account."],
        },
        {
          q: "What's the difference between owner, admin and user?",
          a: [
            "Everyone can work with companies, contacts, deals, tasks and projects.",
            "The owner and admins can also invite and remove users, change roles, edit the sales stages and export all data. There is only one owner – the person who created the company.",
          ],
        },
        {
          q: "Can I belong to several companies?",
          a: ["Yes. If you're invited to several companies, you switch between them at the top of the menu. The data is kept completely separate."],
        },
        {
          q: "Can we use the CRM on our phones?",
          a: ["Yes, it works in the browser on phones, tablets and computers. There is no app to install."],
        },
        {
          q: "Which languages are available?",
          a: ["Norwegian and English. Each user picks their language at the bottom of the menu."],
        },
      ],
    },
    {
      id: "import",
      title: "Import and export",
      items: [
        {
          q: "How do I bring in the customers we already have?",
          a: [
            "Go to Companies or Contacts and click Import. Upload an Excel file (.xlsx) or CSV with headers in the first row, and match the columns to the fields in the CRM.",
            "On the import page you can download an Excel template with instructions. Companies that don't exist are created automatically, and contacts whose e-mail already exists are skipped.",
          ],
          link: { href: "/import-template-allseats.xlsx", label: "Download the Excel template" },
        },
        {
          q: "Can you import for us?",
          a: ["Yes. Send the file to post@allseats.no and we'll import the contacts and companies for you for NOK 150 excl. VAT. Any format works – Excel, CSV or an export from another system."],
        },
        {
          q: "Can we get our data out?",
          a: ["Yes, at any time. The owner and admins can download companies and contacts as CSV files under Settings. The files open in Excel."],
        },
      ],
    },
    {
      id: "bruk",
      title: "Everyday use",
      items: [
        {
          q: "Why are companies and contacts separate?",
          a: [
            "A company can have many contact people, and a person can change jobs. So the company and the people are separate records that are linked together.",
            "Private customers are added as contacts without a company, with their own address and, if given, consent to marketing.",
          ],
        },
        {
          q: "Do I have to type in everything about a company?",
          a: ["No. Type the name or org. no. when you create a company, and the address, industry and org. no. are fetched from the Brønnøysund Register Centre."],
        },
        {
          q: "What are projects for?",
          a: [
            "A project groups companies, contacts, deals and tasks that belong together – a campaign, a product or a customer segment, for example. Each project can have a project lead.",
            "The company and contact lists show which projects each one belongs to, and you can filter by project.",
          ],
        },
        {
          q: "Can I change many companies or contacts at once?",
          a: ["Yes. Tick the rows in the list (or all of them with the box at the top) and choose an action in the bar that appears: add to or remove from a project, set the owner or delete."],
        },
        {
          q: "How do tasks work?",
          a: [
            "A task has an assignee and can have several people working on it. It can be open, in progress or done, and you can write notes and attach files.",
            "Admins see all tasks first; others see their own. You can filter by person and project.",
          ],
        },
        {
          q: "Can I save e-mails in the CRM?",
          a: [
            "Yes. Every company automatically gets its own CRM address – you'll find it under E-mail. Put it in Bcc when you write to a customer, or forward e-mails you've received. It works from Outlook, Gmail and your phone, and there's a step-by-step guide under E-mail.",
            "The e-mail is saved on the contact with the same e-mail address or on the company with the same domain. If we find none, it waits in a list until you've created the contact.",
          ],
        },
        {
          q: "When does the CRM send me e-mail?",
          a: [
            "When you're given a task or a project, when someone adds you to a task, and when someone writes a note on a task you're part of.",
            "You can turn the e-mail notifications off under Account and security.",
          ],
        },
      ],
    },
    {
      id: "sikkerhet",
      title: "Login and security",
      items: [
        {
          q: "How can I log in?",
          a: [
            "With e-mail and password, with a login link sent by e-mail, or with a passkey (Windows Hello, Face ID, Touch ID or the fingerprint on your phone). Each user chooses.",
            "The login link needs no setup. You add a passkey under Account and security.",
          ],
        },
        {
          q: "How long does the login link work?",
          a: ["The link can only be used once and works for a short time. If it has expired, just ask for a new one."],
        },
        {
          q: "Do you have two-step verification?",
          a: [
            "Yes. You can turn on two-step verification with an authenticator app under Account and security. Logging in with a passkey already counts as two steps: something you have (the device) and something you are or know (face, fingerprint or PIN).",
          ],
        },
        {
          q: "Where is the data stored?",
          a: [
            "In the EU – the database is in Frankfurt. Each company is separated from the others in the database, so no other company can see your data.",
            "We do not use the data for advertising, do not sell it and do not use it to train artificial intelligence.",
          ],
          link: { href: "/personvern", label: "Read the privacy policy" },
        },
        {
          q: "Do you have a data processing agreement?",
          a: ["Yes. The data processing agreement is part of the terms of service and applies automatically to every customer. It meets the requirements of GDPR Art. 28."],
          link: { href: "/databehandleravtale", label: "Read the data processing agreement" },
        },
      ],
    },
  ],
  contactTitle: "Didn't find the answer?",
  contactText: "Write to us and we'll reply as soon as we can.",
};

export const faq: Record<Locale, Faq> = { nb, en };
