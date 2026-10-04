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
          a: [
            "Ja. Den fungerer på mobil, nettbrett og PC, og dere kan legge AllSeats på hjemskjermen som en app – med egen ikon, ringe- og SMS-knapper på kundene og varsler når du får en oppgave eller en kunde svarer på et tilbud. Ingen App Store nødvendig.",
            "Android: åpne allseats.no i Chrome og velg «Installer appen». iPhone: åpne i Safari, trykk Del og «Legg til på Hjem-skjerm». Varsler slår du på under Konto og sikkerhet.",
          ],
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
          q: "Kan vi endre salgsfasene?",
          a: [
            "Ja. Under Innstillinger → Salgsfaser (eier og administratorer) kan dere gi fasene nye navn, endre sannsynlighet, dra dem i ny rekkefølge, legge til nye og slette dem dere ikke bruker. Salg i en fase som slettes, flyttes til fasen dere velger.",
          ],
        },
        {
          q: "Kan jeg tilpasse forsiden?",
          a: [
            "Ja. Trykk «Tilpass» på I dag-siden. Da kan du dra widgetene i den rekkefølgen du vil, gjøre dem brede eller smale, skjule dem og legge til andre – for eksempel nøkkeltall, salgstrakt, vunnet denne måneden, siste aktivitet og tilbud. Oppsettet er ditt eget og følger deg på PC og mobil.",
          ],
        },
        {
          q: "Finnes det mørk modus og hurtigtaster?",
          a: [
            "Ja. Under Konto og sikkerhet → Utseende velger du lys, mørk eller automatisk (følger telefonen/PC-en).",
            "På PC: trykk ? for å se hurtigtastene, for eksempel N for å legge til noe nytt og G og S for å gå til Salg. På mobilen kan du sveipe en oppgave mot høyre for å huke den av, og dra ned for å oppdatere i appen.",
          ],
        },
        {
          q: "Kan jeg angre en sletting?",
          a: ["Ja, i noen sekunder. Etter at du har slettet noe, vises «Angre» nederst på skjermen."],
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
            "Når du får en oppgave eller et prosjekt, når noen legger deg til på en oppgave, når noen skriver et notat på en oppgave du er med på, og når en kunde svarer på et tilbud du har sendt.",
            "I tillegg får du en kort oppsummering hverdager kl. 7 med dagens og forfalte oppgaver, salg uten aktivitet og svar på tilbud – bare når det er noe å følge opp.",
            "Du kan slå av både varslene og oppsummeringen under Konto og sikkerhet.",
          ],
        },
      ],
    },
    {
      id: "tilbud",
      title: "Tilbud, rapporter og tilpasning",
      items: [
        {
          q: "Hvordan lager og sender jeg et tilbud?",
          a: [
            "Åpne et salg og trykk «Lag tilbud». Kunde, kontaktperson og tittel fylles inn. Legg til produkter fra produktlisten eller skriv egne linjer – MVA (25, 15, 12 eller 0 %) og rabatt regnes ut automatisk.",
            "Trykk «Send tilbudet», så får kunden e-post med tilbudet som PDF og en lenke der det kan aksepteres eller avslås med ett klikk. Svarer kunden på e-posten, kommer svaret til deg.",
          ],
          link: { href: "/app/tilbud", label: "Gå til tilbud" },
        },
        {
          q: "Ser jeg når kunden har åpnet tilbudet?",
          a: [
            "Ja. Du ser om og hvor mange ganger tilbudet er åpnet, og når kunden aksepterer eller avslår, får du e-post og det noteres på salget – med kundens kommentar.",
            "Har kunden sagt ja på telefon, kan du merke tilbudet som akseptert selv.",
          ],
        },
        {
          q: "Hvor legger vi inn adresse, kontonummer og vilkår på tilbudene?",
          a: [
            "Under Tilbud → Innstillinger (eier og administratorer). Der velger dere også hvor mange dager tilbudene skal gjelde.",
            "Logoen lastes opp under Innstillinger. Den vises i menyen, i tilbuds-PDF-en og på tilbudssiden kunden ser.",
          ],
        },
        {
          q: "Kan vi legge til egne felt?",
          a: [
            "Ja. Under Innstillinger → Egne felt kan eier og administratorer legge til felt på bedrifter, kontakter og salg – for eksempel «Kundetype», «Bilmodell» eller «Kilde».",
            "Feltene kan være tekst, tall, dato, valgliste, ja/nei eller lenke. De vises i skjemaene og på kortet, og kommer med når dere eksporterer.",
          ],
        },
        {
          q: "Kan CRM-et lage oppfølgingsoppgaver automatisk?",
          a: [
            "Ja. Under Innstillinger → Automatisering lager dere regler som «når et salg flyttes til Tilbud sendt, opprett ‘Følg opp tilbudet’ med frist om 3 dager». Oppgaven gis til den som er ansvarlig for salget.",
          ],
        },
        {
          q: "Hvilke rapporter finnes?",
          a: [
            "Under Rapporter ser dere vunnet og tapt, vinnrate, snitt per salg, salgstid, åpne salg per fase, vunnet per måned og aktiviteten til hver i teamet. Velg periode og person, og last ned salgene til Excel.",
          ],
        },
        {
          q: "Hvordan finner jeg en kunde raskt?",
          a: [
            "Bruk søkefeltet øverst i menyen. Skriv navn, e-post, telefon, org.nr. eller tittel, så får du treff blant bedrifter, kontakter, salg, tilbud og oppgaver. Hurtigtast: / eller Ctrl+K.",
            "Også når du velger bedrift eller kontakt i et skjema, kan du bare skrive – du trenger ikke bla i lange lister.",
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
          a: [
            "Yes. It works on phones, tablets and computers, and you can put AllSeats on your home screen as an app – with its own icon, call and SMS buttons on customers and notifications when you get a task or a customer replies to a quote. No App Store needed.",
            "Android: open allseats.no in Chrome and choose “Install app”. iPhone: open it in Safari, tap Share and “Add to Home Screen”. Turn notifications on under Account and security.",
          ],
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
          q: "Can we change the pipeline stages?",
          a: [
            "Yes. Under Settings → Pipeline stages (owner and admins) you can rename the stages, change the probability, drag them into a new order, add new ones and delete those you don't use. Deals in a stage you delete are moved to the stage you choose.",
          ],
        },
        {
          q: "Can I customize the start page?",
          a: [
            "Yes. Press “Customize” on the Today page. You can drag the widgets into the order you like, make them wide or narrow, hide them and add others – for example key figures, pipeline, won this month, latest activity and quotes. The layout is your own and follows you on computer and phone.",
          ],
        },
        {
          q: "Is there a dark mode and keyboard shortcuts?",
          a: [
            "Yes. Under Account and security → Appearance you choose light, dark or automatic (follows your phone/computer).",
            "On a computer: press ? to see the shortcuts, for example N to add something new and G then S to go to Deals. On the phone you can swipe a task to the right to tick it off, and pull down to refresh in the app.",
          ],
        },
        {
          q: "Can I undo a deletion?",
          a: ["Yes, for a few seconds. After deleting something, “Undo” appears at the bottom of the screen."],
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
            "When you're given a task or a project, when someone adds you to a task, when someone writes a note on a task you're part of, and when a customer replies to a quote you sent.",
            "You also get a short summary on weekdays at 7 with today's and overdue tasks, deals without activity and replies to quotes – only when there is something to follow up.",
            "You can turn off both the notifications and the summary under Account and security.",
          ],
        },
      ],
    },
    {
      id: "tilbud",
      title: "Quotes, reports and customization",
      items: [
        {
          q: "How do I create and send a quote?",
          a: [
            "Open a deal and press “Create quote”. Customer, contact person and title are filled in. Add products from the product list or write your own lines – VAT (25, 15, 12 or 0 %) and discounts are calculated automatically.",
            "Press “Send quote”, and the customer gets an e-mail with the quote as a PDF and a link where it can be accepted or declined with one click. If the customer replies to the e-mail, the reply comes to you.",
          ],
          link: { href: "/app/tilbud", label: "Go to quotes" },
        },
        {
          q: "Can I see when the customer opened the quote?",
          a: [
            "Yes. You see whether and how many times the quote was opened, and when the customer accepts or declines, you get an e-mail and it's noted on the deal – with the customer's comment.",
            "If the customer said yes on the phone, you can mark the quote as accepted yourself.",
          ],
        },
        {
          q: "Where do we enter our address, bank account and terms for quotes?",
          a: [
            "Under Quotes → Settings (owner and admins). There you also choose how many days quotes are valid.",
            "The logo is uploaded under Settings. It is shown in the menu, in the quote PDF and on the quote page your customer sees.",
          ],
        },
        {
          q: "Can we add our own fields?",
          a: [
            "Yes. Under Settings → Custom fields, owners and admins can add fields to companies, contacts and deals – for example “Customer type”, “Car model” or “Source”.",
            "Fields can be text, number, date, drop-down, yes/no or link. They show in the forms and on the record, and are included when you export.",
          ],
        },
        {
          q: "Can the CRM create follow-up tasks automatically?",
          a: [
            "Yes. Under Settings → Automation you create rules like “when a deal moves to Quote sent, create ‘Follow up the quote’ due in 3 days”. The task goes to the deal owner.",
          ],
        },
        {
          q: "Which reports are there?",
          a: [
            "Under Reports you see won and lost, win rate, average deal, sales cycle, open deals by stage, won per month and each team member's activity. Choose period and person, and download the deals to Excel.",
          ],
        },
        {
          q: "How do I find a customer quickly?",
          a: [
            "Use the search field at the top of the menu. Type a name, e-mail, phone, org. no. or title to find companies, contacts, deals, quotes and tasks. Shortcut: / or Ctrl+K.",
            "When you pick a company or contact in a form, you can also just type – no need to scroll through long lists.",
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
