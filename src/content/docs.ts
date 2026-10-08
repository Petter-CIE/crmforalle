import type { Locale } from "@/lib/i18n/dictionaries";

/**
 * Product documentation shown at /dokumentasjon. One long page with a table of contents.
 * Menu paths use the names in the app, in the reader's language.
 */
export type DocBlock = { h?: string; p?: string[]; steps?: string[]; bullets?: string[] };
export type DocSection = { id: string; title: string; lead?: string; blocks: DocBlock[] };
export type DocGroup = { title: string; sections: DocSection[] };
export type Docs = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  lead: string;
  contents: string;
  updated: string;
  groups: DocGroup[];
  contactTitle: string;
  contactText: string;
  faqLink: string;
};

const nb: Docs = {
  metaTitle: "Dokumentasjon – AllSeats CRM",
  metaDescription:
    "Brukerveiledning for AllSeats CRM: bedrifter, kontakter, salg, tilbud, oppgaver, prosjekter, e-post, nettskjema, booking, Tripletex, import og sikkerhet.",
  title: "Dokumentasjon",
  lead: "Alt du trenger for å komme i gang og få mest mulig ut av AllSeats CRM – fra første innlogging til tilbud, automatisering og kobling mot regnskapet.",
  contents: "Innhold",
  updated: "Sist oppdatert oktober 2026",
  groups: [
    {
      title: "Kom i gang",
      sections: [
        {
          id: "oversikt",
          title: "Hva er AllSeats CRM?",
          blocks: [
            {
              p: [
                "AllSeats er et norsk CRM for små og mellomstore bedrifter. Her samler dere kunder, kontaktpersoner, salg, tilbud, oppgaver og e-post på ett sted, slik at hele teamet ser det samme og ingen kunder faller mellom to stoler.",
                "Prisen gjelder for hele bedriften, ikke per bruker. Dere kan invitere så mange kolleger dere vil uten at prisen endres.",
              ],
            },
            {
              h: "Slik henger det sammen",
              bullets: [
                "Bedrifter er kundene og leverandørene deres – med org.nr., adresse og bransje fra Brønnøysundregistrene.",
                "Kontakter er personene, enten kontaktpersoner i en bedrift (B2B) eller privatkunder (B2C).",
                "Salg er mulighetene dere jobber med, fra første kontakt til vunnet eller tapt.",
                "Tilbud lages fra et salg og sendes som PDF med lenke der kunden kan akseptere.",
                "Oppgaver er det som skal gjøres – med frist, ansvarlig og varsler.",
                "Prosjekter samler bedrifter, kontakter, salg og oppgaver som hører sammen.",
              ],
            },
          ],
        },
        {
          id: "konto",
          title: "Opprett konto og prøveperiode",
          blocks: [
            {
              steps: [
                "Gå til allseats.no og trykk Prøv gratis.",
                "Registrer deg med e-post og passord, eller med en innloggingslenke på e-post.",
                "Skriv inn bedriftens navn eller org.nr. – opplysningene hentes fra Brønnøysundregistrene.",
                "Godta vilkårene, så er dere i gang.",
              ],
            },
            {
              p: [
                "De første 14 dagene er gratis, uten kort. Dere har tilgang til alle funksjonene. Når prøveperioden er over, velger dere abonnement under Abonnement i menyen. Gjør dere ikke det, kan dere fortsatt lese og eksportere dataene i 30 dager.",
              ],
            },
          ],
        },
        {
          id: "team",
          title: "Inviter kolleger og roller",
          blocks: [
            {
              steps: [
                "Åpne Team i menyen.",
                "Skriv inn kollegaens navn og e-postadresse, gjerne også telefonnummer, og velg rolle.",
                "Kollegaen får en e-post med lenke, kan rette navnet og telefonnummeret og blir med i bedriften etter innlogging.",
              ],
            },
            {
              h: "Navn og telefon",
              p: [
                "I CRM-et vises kollegene med navn – på oppgaver, salg, i historikken og i lister – ikke med e-postadresse.",
                "Eier og administratorer kan endre navn og telefonnummer på kollegene under Team → Rediger. Hver bruker kan selv endre sine under Konto og sikkerhet. Mangler navnet ditt, ber AllSeats deg om å fylle det inn øverst på siden.",
              ],
            },
            {
              h: "Roller",
              bullets: [
                "Eier – den som opprettet bedriften. Kan alt, også abonnement. Det finnes bare én eier.",
                "Administrator – kan invitere og fjerne brukere, endre roller, salgsfaser, egne felt, automatisering og eksportere data.",
                "Bruker – jobber med bedrifter, kontakter, salg, tilbud, oppgaver og prosjekter.",
              ],
            },
            {
              h: "Tilgang bare til bestemte prosjekter",
              p: [
                "Finnes i Bedrift. En bruker kan begrenses til ett eller flere prosjekter – for eksempel en innleid selger eller en partner. Velg prosjektene når du inviterer, eller senere under Team. Brukeren ser da bare bedrifter, kontakter, salg, tilbud, oppgaver og e-post som hører til disse prosjektene, pluss det hen selv har lagt inn.",
                "Velger du ingen prosjekter, ser brukeren hele bedriften. Eier og administratorer ser alltid alt.",
              ],
            },
            {
              h: "Flere bedrifter",
              p: ["Blir du invitert til flere bedrifter, bytter du mellom dem øverst i menyen. Dataene holdes helt adskilt."],
            },
          ],
        },
        {
          id: "mobil",
          title: "Mobil, app og språk",
          blocks: [
            {
              p: [
                "AllSeats fungerer på PC, nettbrett og mobil. Legg den på hjemskjermen, så fungerer den som en app med eget ikon, ringe- og SMS-knapper på kundene og varsler – uten App Store.",
              ],
              bullets: [
                "Android: åpne allseats.no i Chrome og velg «Installer appen».",
                "iPhone: åpne allseats.no i Safari, trykk Del og «Legg til på Hjem-skjerm».",
                "Varsler slår du på under Konto og sikkerhet.",
              ],
            },
            {
              p: ["AllSeats finnes på norsk og engelsk. Hver bruker velger språk selv nederst i menyen."],
            },
          ],
        },
      ],
    },
    {
      title: "Kunder og salg",
      sections: [
        {
          id: "bedrifter",
          title: "Bedrifter",
          blocks: [
            {
              h: "Legg til en bedrift",
              p: [
                "Trykk Ny bedrift og skriv navnet eller org.nr. Velg bedriften fra Brønnøysundregistrene, så fylles org.nr., adresse og bransje inn automatisk. Finnes bedriften ikke i registeret, skriver du opplysningene selv.",
              ],
            },
            {
              h: "Bedriftskortet",
              p: [
                "På kortet ser du kontaktpersoner, salg, tilbud, oppgaver, prosjekter, e-post og hele historikken. Er Tripletex koblet til, ser du også fakturaene og utestående beløp.",
              ],
            },
            {
              h: "Søk og filtre",
              p: [
                "Listen filtreres mens du skriver. Søket treffer på bedriftsnavn (alle ordene må være med) eller starten av org.nr. Du kan også filtrere på ansvarlig, sted, prosjekt og «ingen aktivitet på 60 dager», og lagre utvalget som en visning – for deg selv eller delt med teamet.",
              ],
            },
            {
              h: "Overvåking i Brønnøysund",
              p: [
                "Alle bedrifter med org.nr. sjekkes hver natt. Ved konkurs, avvikling, sletting, nytt navn, ny adresse eller ny næringskode får den ansvarlige varsel, og endringen lagres i historikken.",
              ],
            },
          ],
        },
        {
          id: "kontakter",
          title: "Kontakter (B2B og B2C)",
          blocks: [
            {
              p: [
                "En kontakt er en person. Ingen felt er påkrevd – en første henvendelse kan godt bare være post@firma.no – men kontakten må ha minst ett av navn, e-post, telefon eller bedrift.",
              ],
            },
            {
              h: "B2B eller B2C",
              bullets: [
                "B2B: kontaktpersonen hører til en bedrift. Velg bedriften i feltet Bedrift – du kan søke på navn eller org.nr., også i Brønnøysundregistrene, og bedriften opprettes automatisk. Adresse trengs bare hvis den er en annen enn bedriftens.",
                "B2C: privatkunde uten bedrift, med egen adresse og eventuelt samtykke til markedsføring.",
              ],
            },
            {
              h: "Prosjekter på kontakten",
              p: [
                "Velg hvilke prosjekter kontakten hører til direkte i skjemaet. Bedriften til kontakten blir automatisk med i de samme prosjektene.",
              ],
            },
            {
              h: "Innsyn og sletting (GDPR)",
              p: [
                "Spør en person hva dere har lagret, åpner du kontakten og trykker «Last ned data (GDPR)». Da får du en fil med alle opplysninger, historikk, salg, tilbud og oppgaver. Ber personen om sletting, sletter du kontakten.",
              ],
            },
          ],
        },
        {
          id: "duplikater",
          title: "Duplikater",
          blocks: [
            {
              p: [
                "CRM-et varsler når du legger inn en bedrift eller kontakt som ser ut til å finnes fra før. Under Bedrifter → Mulige duplikater ser dere alle mulige dobbeltregistreringer og kan slå dem sammen, så all historikk havner på ett sted.",
              ],
            },
          ],
        },
        {
          id: "salg",
          title: "Salg og pipeline",
          blocks: [
            {
              p: [
                "Under Salg ser dere alle åpne salg som kort i fasene sine. Dra et kort til neste fase når salget går videre, og merk det som vunnet eller tapt når det er avgjort.",
                "Hvert salg har verdi, forventet dato, ansvarlig, bedrift, kontaktperson og eventuelt prosjekt. Sannsynligheten følger fasen og brukes i salgstrakten.",
              ],
            },
            {
              h: "Egne faser og flere pipeliner",
              p: [
                "Under Innstillinger → Salgsfaser kan eier og administratorer gi fasene nye navn, endre sannsynlighet, dra dem i ny rekkefølge, legge til og slette faser. Selger dere på ulike måter – for eksempel nye kunder, fornyelser og partnere – kan dere lage flere pipeliner med hver sine faser (Bedrift – Start har én pipeline).",
              ],
            },
          ],
        },
        {
          id: "tilbud",
          title: "Tilbud",
          blocks: [
            {
              steps: [
                "Åpne et salg og trykk «Lag tilbud». Kunde, kontaktperson og tittel fylles inn.",
                "Legg til produkter fra produktlisten eller skriv egne linjer. MVA (25, 15, 12 eller 0 %) og rabatt regnes ut automatisk.",
                "Trykk «Send tilbudet». Kunden får e-post med tilbudet som PDF og en lenke der det kan aksepteres eller avslås med ett klikk.",
              ],
            },
            {
              p: [
                "Du ser om og hvor mange ganger tilbudet er åpnet. Når kunden svarer, får du e-post og varsel, og svaret noteres på salget med kundens kommentar. Har kunden sagt ja på telefon, kan du merke tilbudet som akseptert selv.",
              ],
            },
            {
              h: "Oppsett",
              bullets: [
                "Tilbud → Produkter: produktlisten med priser og MVA.",
                "Tilbud → Innstillinger: adresse, kontonummer, vilkår og hvor mange dager tilbudet gjelder.",
                "Innstillinger: logoen, som vises i menyen, i PDF-en og på siden kunden ser.",
              ],
            },
          ],
        },
        {
          id: "prosjekter",
          title: "Prosjekter",
          blocks: [
            {
              p: [
                "Et prosjekt samler bedrifter, kontakter, salg og oppgaver som hører sammen – en kampanje, et produkt, en kundegruppe eller en egen virksomhet. Hvert prosjekt har farge og kan ha en prosjektleder.",
                "I listene ser du hvilke prosjekter hver bedrift og kontakt er med i, og du kan filtrere på prosjekt. Prosjekter brukes også til å begrense tilgangen for enkelte brukere (se Inviter kolleger og roller).",
              ],
            },
          ],
        },
        {
          id: "oppgaver",
          title: "Oppgaver",
          blocks: [
            {
              p: [
                "En oppgave har tittel, frist, en ansvarlig og eventuelt flere som jobber med den. Den kan være åpen, pågår eller ferdig, og du kan skrive notater og legge ved filer. Oppgaver kan kobles til bedrift, kontakt, salg og prosjekt.",
                "Administratorer ser alle oppgaver, andre ser sine egne og dem de er med på. På mobilen sveiper du en oppgave mot høyre for å huke den av.",
              ],
            },
            {
              h: "Koble oppgaven til bedrift og kontakt",
              p: [
                "Når du lager en oppgave under Oppgaver, eller åpner en eksisterende, kan du velge bedrift og kontakt. Har du valgt en bedrift, viser kontaktfeltet bare kontaktene i den bedriften. Velger du bare en kontakt, kobles oppgaven også til bedriften kontakten hører til.",
                "Oppgaven vises da også under Oppgaver på kortet til bedriften og kontakten.",
              ],
            },
            {
              h: "Vedlegg",
              p: [
                "Du kan legge ved filer på opptil 25 MB: PDF, bilder (JPG, PNG, WebP, GIF, HEIC), Word, Excel, PowerPoint, OpenDocument, TXT, CSV og ZIP. Andre filtyper, for eksempel programfiler, kan ikke lastes opp.",
                "PDF og bilder åpnes i nettleseren. Andre filer lastes alltid ned. Bare de som har tilgang til oppgaven, kan åpne vedleggene.",
              ],
            },
            {
              h: "Oppgaver i kalenderen",
              p: [
                "Under Konto og sikkerhet → Kalender lager du en personlig lenke som du legger inn i Google Kalender, Outlook eller på iPhone. Oppgavene dine med frist dukker da opp i kalenderen og oppdateres av seg selv.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "E-post og henvendelser",
      sections: [
        {
          id: "e-post",
          title: "E-post",
          blocks: [
            {
              h: "Send e-post fra CRM-et",
              p: [
                "Trykk «Send e-post» på en kontakt, bedrift eller et salg. Velg gjerne en mal – navn og firma fylles inn automatisk. E-posten lagres i historikken, og svar fra kunden kommer til din egen innboks. Malene lages under Innstillinger → E-postmaler.",
              ],
            },
            {
              h: "Lagre e-post med blindkopi (Bcc)",
              p: [
                "Bedriften deres får en egen CRM-adresse som slutter på @inn.allseats.no – du finner den under E-post. Legg den i Bcc når du skriver til en kunde, eller videresend e-post du har fått. Det virker fra Outlook, Gmail og mobilen.",
                "Har du lagret en eldre CRM-adresse som slutter på @allseats.no (uten «inn»), bytt den ut med den nye i kontaktlisten, videresendingen og e-postreglene dine.",
                "E-posten lagres på kontakten med samme e-postadresse eller på bedriften med samme domene, og får med seg prosjektene til kontakten. Finner vi ingen, venter den i en liste til du har opprettet kontakten.",
                "I historikken vises e-posten sammenslått med emnet – trykk på den for å lese hele.",
              ],
            },
            {
              h: "Koble til Outlook / Microsoft 365",
              p: [
                "Inkludert i Bedrift, tillegg til Start (99 kr/mnd). Under Konto og sikkerhet kan du koble til e-posten og kalenderen din (kun lesetilgang). E-post du sender til og får fra kontakter i CRM-et, havner da automatisk i historikken. Annen e-post leses ikke inn. Du kan også legge til delte postkasser og knytte en postkasse til et prosjekt.",
              ],
            },
            {
              h: "Gmail og Google Workspace",
              p: [
                "Gmail kan sende en kopi av all innkommende e-post til CRM-adressen. Bare e-post fra kontakter og bedrifter som finnes i CRM-et, blir lagret – resten ignoreres. E-post du sender selv, legger du i Bcc.",
              ],
              steps: [
                "I Gmail på PC: tannhjulet → Se alle innstillingene → Videresending og POP/IMAP → «Legg til en videresendingsadresse», og lim inn CRM-adressen.",
                "Bekreftelseskoden fra Google dukker opp under E-post → «Venter på kontakt» i AllSeats. Skriv den inn i Gmail.",
                "Velg «Videresend en kopi av innkommende e-post til» CRM-adressen, behold Gmail-kopien i innboksen og lagre.",
              ],
            },
          ],
        },
        {
          id: "nettskjema",
          title: "Nettskjema",
          blocks: [
            {
              p: [
                "Under Innstillinger → Nettskjema lager dere et kontaktskjema og limer inn koden på nettsiden (WordPress, Wix, Squarespace m.fl.), eller lar deres eget skjema sende til AllSeats.",
                "Hver henvendelse blir en kontakt, et salg og en oppfølgingsoppgave, og den ansvarlige får varsel på mobil og e-post.",
              ],
            },
          ],
        },
        {
          id: "kampanjer",
          title: "Kampanjer (nyhetsbrev)",
          blocks: [
            {
              p: [
                "Under E-post → Kampanjer kan eier og administratorer sende samme e-post til mange kontakter – for eksempel et nyhetsbrev til alle kunder i et prosjekt.",
              ],
              steps: [
                "Trykk «Ny kampanje» og skriv emne og tekst. {fornavn}, {etternavn}, {navn} og {firma} fylles inn for hver mottaker.",
                "Velg mottakere: type (B2B/B2C), prosjekt og ansvarlig. Antallet oppdateres med en gang.",
                "Send en test til deg selv, og trykk «Send kampanjen».",
              ],
            },
            {
              p: [
                "Privatkunder får bare kampanjer når de har samtykket til markedsføring. Kontakter som har meldt seg av, og bedrifter som er slettet eller konkurs, hoppes over. Hver e-post får bedriftens navn og adresse og en lenke for å melde seg av. Svar fra mottakerne kommer til den som opprettet kampanjen.",
                "Du ser hvor mange som har fått, åpnet og meldt seg av, og utsendelsen lagres i historikken til hver kontakt. Start inkluderer 500 kampanje-e-poster i måneden og Bedrift 5 000.",
              ],
            },
          ],
        },
        {
          id: "booking",
          title: "Bookinglenke",
          blocks: [
            {
              p: [
                "Del en lenke der kunder selv velger en ledig tid for et møte med deg. Under Konto og sikkerhet → Bookinglenke velger du adresse, møtenavn, sted eller videolenke, varighet, dager og klokkeslett, pause mellom møter, minste varsel og hvor langt frem i tid det kan bookes.",
                "Møtet blir en oppgave for deg, og kunden blir en kontakt. Har du koblet til Outlook eller Google Kalender under Konto og sikkerhet, blir opptatte tider i kalenderen ikke tilbudt.",
              ],
            },
          ],
        },
        {
          id: "varsler",
          title: "Varsler og daglig oppsummering",
          blocks: [
            {
              p: ["Du får varsel på e-post og mobil når:"],
              bullets: [
                "du får en oppgave eller et prosjekt, eller blir lagt til på en oppgave",
                "noen skriver et notat på en oppgave du er med på",
                "en kunde svarer på et tilbud du har sendt",
                "det kommer en henvendelse fra nettskjemaet",
                "en kunde endrer status i Brønnøysundregistrene",
              ],
            },
            {
              p: [
                "Hverdager kl. 7 får du en kort oppsummering med dagens og forfalte oppgaver, salg uten aktivitet og svar på tilbud – bare når det er noe å følge opp. Varsler og oppsummering slår du av under Konto og sikkerhet.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Tilpasning og analyse",
      sections: [
        {
          id: "i-dag",
          title: "I dag-siden, meny og søk",
          blocks: [
            {
              h: "Din egen forside",
              p: [
                "Trykk «Tilpass» på I dag-siden. Dra widgetene i den rekkefølgen du vil, gjør dem brede eller smale, skjul dem og legg til andre – for eksempel nøkkeltall, salgstrakt, vunnet denne måneden, siste aktivitet og tilbud.",
              ],
            },
            {
              h: "Din egen meny",
              p: [
                "Hver bruker kan endre rekkefølgen på menyen og skjule det hen ikke bruker. På mobilen blir de fire første punktene fanene nederst på skjermen.",
              ],
            },
            {
              h: "Søk og hurtigtaster",
              p: [
                "Søkefeltet øverst (/ eller Ctrl+K) finner bedrifter, kontakter, salg, tilbud og oppgaver på navn, e-post, telefon, org.nr. eller tittel. På PC viser ? alle hurtigtastene – for eksempel N for noe nytt og G S for Salg.",
                "Under Konto og sikkerhet → Utseende velger du lys, mørk eller automatisk modus. Har du slettet noe ved en feil, trykker du «Angre» nederst på skjermen.",
              ],
            },
          ],
        },
        {
          id: "egne-felt",
          title: "Egne felt",
          blocks: [
            {
              p: [
                "Under Innstillinger → Egne felt kan eier og administratorer legge til felt på bedrifter, kontakter og salg – for eksempel «Kundetype», «Bilmodell» eller «Kilde». Feltene kan være tekst, tall, dato, valgliste, ja/nei eller lenke, og de vises i skjemaene, på kortet og i eksporten.",
              ],
            },
          ],
        },
        {
          id: "automatisering",
          title: "Automatisering",
          blocks: [
            {
              p: [
                "Automatisering finnes i Bedrift. Under Innstillinger → Automatisering lager dere regler som «når et salg flyttes til Tilbud sendt, opprett ‘Følg opp tilbudet’ med frist om 3 dager». Oppgaven gis til den som er ansvarlig for salget.",
              ],
            },
          ],
        },
        {
          id: "rapporter",
          title: "Rapporter",
          blocks: [
            {
              p: [
                "Under Rapporter ser dere vunnet og tapt, vinnrate, snitt per salg, salgstid, åpne salg per fase, vunnet per måned og aktiviteten til hver i teamet. Velg periode og person, og last ned salgene til Excel.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Integrasjoner og data",
      sections: [
        {
          id: "tripletex",
          title: "Tripletex",
          blocks: [
            {
              p: [
                "Med Tripletex-koblingen hentes kunder, kontaktpersoner og fakturaer automatisk inn i CRM-et hver sjette time. Fakturaer og utestående beløp vises på bedriftskortet, og forfalte fakturaer blir en oppfølgingsoppgave for kundeansvarlig. Kunder kobles mot eksisterende bedrifter på org.nr. AllSeats leser bare data – regnskapet blir ikke endret.",
              ],
            },
            {
              steps: [
                "I Tripletex: Selskap → Ansatte → åpne ansattkortet ditt → fanen API-tilgang → Ny nøkkel, og velg applikasjonen All Seats CRM.",
                "Kopier hele nøkkelen.",
                "I AllSeats: Innstillinger → Regnskap → lim inn nøkkelen og trykk Koble til.",
              ],
            },
            {
              p: [
                "Ser du ikke fanen API-tilgang, må tilleggstjenesten Integrasjoner bestilles under Selskap → Mitt abonnement i Tripletex. Koblingen er inkludert i Bedrift og koster 99 kr/mnd på Start. Fiken og PowerOffice Go kommer.",
              ],
            },
          ],
        },
        {
          id: "import",
          title: "Import og eksport",
          blocks: [
            {
              h: "Importer kundene dere har",
              steps: [
                "Gå til Bedrifter eller Kontakter og trykk Importer.",
                "Last opp en Excel-fil (.xlsx) eller CSV med overskrifter i første rad. Du kan laste ned en mal med veiledning på importsiden.",
                "Koble kolonnene til feltene i CRM-et og start importen.",
              ],
            },
            {
              p: [
                "Bedrifter som ikke finnes, opprettes automatisk, og kontakter med en e-post som allerede finnes, hoppes over. Vil dere heller at vi gjør det, send filen til post@allseats.no – vi importerer for 150 kr eks. mva.",
              ],
            },
            {
              h: "Eksport",
              p: [
                "Eier og administrator kan når som helst laste ned bedrifter og kontakter som CSV-filer under Innstillinger. Rapporter kan lastes ned til Excel.",
              ],
            },
          ],
        },
        {
          id: "endre-mange",
          title: "Endre mange på en gang",
          blocks: [
            {
              p: [
                "Huk av radene i listen over bedrifter eller kontakter (eller alle med boksen øverst), og velg handling i linjen som dukker opp: legg til i eller fjern fra prosjekt, sett ansvarlig eller slett.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Konto, sikkerhet og abonnement",
      sections: [
        {
          id: "sikkerhet",
          title: "Innlogging og sikkerhet",
          blocks: [
            {
              bullets: [
                "Logg inn med e-post og passord, en engangslenke på e-post eller en passkey (Windows Hello, Face ID, Touch ID eller fingeravtrykk).",
                "To-trinnsverifisering med autentiseringsapp slår du på under Konto og sikkerhet. Passkey regnes allerede som to trinn.",
                "Passord som er kjent fra datalekkasjer, blir avvist, så ingen kan bruke et passord som allerede er på avveie.",
                "Dataene lagres i EU (Frankfurt), og hver bedrift er skilt fra de andre i databasen. Vi tester at en bruker i én bedrift verken kan lese, endre, slette eller legge til data i en annen.",
                "Vedlegg kan bare lastes opp i vanlige dokument- og bildeformater, og bare de med tilgang til oppgaven kan åpne dem.",
                "Vi bruker ikke dataene til reklame, selger dem ikke og bruker dem ikke til å trene kunstig intelligens.",
                "Databehandleravtalen er en del av vilkårene og gjelder automatisk (GDPR art. 28).",
              ],
            },
          ],
        },
        {
          id: "abonnement",
          title: "Abonnement og pris",
          blocks: [
            {
              bullets: [
                "Start – 249 kr/mnd: ubegrenset antall brukere, opptil 2 000 bedrifter og kontakter, én salgspipeline. Tillegg: regnskapskobling (99 kr/mnd) og Outlook / Microsoft 365-synk (99 kr/mnd).",
                "Bedrift – 990 kr/mnd: alt i Start, opptil 25 000 bedrifter og kontakter, regnskapskobling og Outlook-synk inkludert, flere pipeliner, automatisering og brukere som bare ser egne prosjekter.",
                "Prøveperioden (14 dager) har alt som finnes i Bedrift.",
                "Årlig betaling gir 2 måneder gratis. Alle priser er eks. mva.",
              ],
            },
            {
              p: [
                "Bare bedrifter og kontakter teller med i grensen. Trenger dere flere, kan dere kjøpe kontaktpakker (Start: +2 000 for 50 kr/mnd, Bedrift: +25 000 for 250 kr/mnd).",
                "Abonnementet velges og endres under Abonnement i menyen, med betaling på faktura eller kort. For oppsigelse, skriv til post@allseats.no. Etter oppsigelse kan dere lese og eksportere dataene i 30 dager.",
                "Eieren kan også slette hele bedriften selv under Innstillinger → Slett bedriften. CRM-et stenges med en gang, abonnementet fornyes ikke, og alt slettes permanent etter 30 dager. Fram til da kan eieren laste ned kontakter og bedrifter eller angre. Hver bruker kan slette sin egen brukerkonto under Konto og sikkerhet.",
              ],
            },
          ],
        },
      ],
    },
  ],
  contactTitle: "Finner du ikke svaret?",
  contactText: "Skriv til oss, så hjelper vi deg – vanligvis samme dag.",
  faqLink: "Se også spørsmål og svar",
};

const en: Docs = {
  metaTitle: "Documentation – AllSeats CRM",
  metaDescription:
    "User guide for AllSeats CRM: companies, contacts, deals, quotes, tasks, projects, e-mail, web forms, booking, Tripletex, import and security.",
  title: "Documentation",
  lead: "Everything you need to get started and get the most out of AllSeats CRM – from your first login to quotes, automation and the connection to your accounting system.",
  contents: "Contents",
  updated: "Last updated October 2026",
  groups: [
    {
      title: "Getting started",
      sections: [
        {
          id: "oversikt",
          title: "What is AllSeats CRM?",
          blocks: [
            {
              p: [
                "AllSeats is a Norwegian CRM for small and medium-sized companies. It brings customers, contact persons, deals, quotes, tasks and e-mail together in one place, so the whole team sees the same picture and no customer falls through the cracks.",
                "The price is for the whole company, not per user. Invite as many colleagues as you like – the price stays the same.",
              ],
            },
            {
              h: "How it fits together",
              bullets: [
                "Companies are your customers and suppliers – with org. no., address and industry from the Brønnøysund Register Centre.",
                "Contacts are people, either contact persons at a company (B2B) or private customers (B2C).",
                "Deals are the opportunities you work on, from first contact to won or lost.",
                "Quotes are created from a deal and sent as a PDF with a link where the customer can accept.",
                "Tasks are what needs doing – with a due date, an owner and notifications.",
                "Projects group companies, contacts, deals and tasks that belong together.",
              ],
            },
          ],
        },
        {
          id: "konto",
          title: "Create an account and trial",
          blocks: [
            {
              steps: [
                "Go to allseats.no and press Try for free.",
                "Sign up with e-mail and password, or with a login link sent by e-mail.",
                "Enter your company name or org. no. – the details are fetched from the Brønnøysund Register Centre.",
                "Accept the terms, and you are ready to go.",
              ],
            },
            {
              p: [
                "The first 14 days are free, no card needed, with access to every feature. When the trial ends, choose a subscription under Subscription in the menu. If you don't, you can still read and export your data for 30 days.",
              ],
            },
          ],
        },
        {
          id: "team",
          title: "Invite colleagues and roles",
          blocks: [
            {
              steps: [
                "Open Team in the menu.",
                "Enter your colleague's name and e-mail address, ideally also a phone number, and choose a role.",
                "Your colleague gets an e-mail with a link, can correct their name and phone number, and joins the company after logging in.",
              ],
            },
            {
              h: "Name and phone",
              p: [
                "In the CRM, colleagues are shown by name – on tasks, deals, the timeline and in lists – not by e-mail address.",
                "The owner and admins can change colleagues' names and phone numbers under Team → Edit. Each user can change their own under Account and security. If your name is missing, AllSeats asks you to fill it in at the top of the page.",
              ],
            },
            {
              h: "Roles",
              bullets: [
                "Owner – the person who created the company. Can do everything, including the subscription. There is only one owner.",
                "Admin – can invite and remove users, change roles, pipeline stages, custom fields and automation, and export data.",
                "User – works with companies, contacts, deals, quotes, tasks and projects.",
              ],
            },
            {
              h: "Access to selected projects only",
              p: [
                "Part of Business. A user can be limited to one or more projects – for example a contracted sales rep or a partner. Choose the projects when you invite them, or later under Team. The user then only sees the companies, contacts, deals, quotes, tasks and e-mail that belong to those projects, plus what they entered themselves.",
                "If you choose no projects, the user sees the whole company. Owners and admins always see everything.",
              ],
            },
            {
              h: "Several companies",
              p: ["If you are invited to several companies, switch between them at the top of the menu. The data is kept completely separate."],
            },
          ],
        },
        {
          id: "mobil",
          title: "Mobile, app and language",
          blocks: [
            {
              p: [
                "AllSeats works on PC, tablet and phone. Add it to your home screen and it works like an app, with its own icon, call and text buttons on customers, and notifications – no App Store needed.",
              ],
              bullets: [
                "Android: open allseats.no in Chrome and choose “Install app”.",
                "iPhone: open allseats.no in Safari, tap Share and “Add to Home Screen”.",
                "Turn on notifications under Account and security.",
              ],
            },
            {
              p: ["AllSeats is available in Norwegian and English. Each user picks their language at the bottom of the menu."],
            },
          ],
        },
      ],
    },
    {
      title: "Customers and sales",
      sections: [
        {
          id: "bedrifter",
          title: "Companies",
          blocks: [
            {
              h: "Add a company",
              p: [
                "Press New company and type the name or org. no. Pick the company from the Brønnøysund Register Centre and the org. no., address and industry are filled in automatically. If the company isn't in the register, enter the details yourself.",
              ],
            },
            {
              h: "The company card",
              p: [
                "The card shows contact persons, deals, quotes, tasks, projects, e-mail and the full history. With Tripletex connected, you also see invoices and outstanding amounts.",
              ],
            },
            {
              h: "Search and filters",
              p: [
                "The list filters as you type. Search matches the company name (all words must match) or the start of the org. no. You can also filter by owner, place, project and “no activity in 60 days”, and save the selection as a view – for yourself or shared with the team.",
              ],
            },
            {
              h: "Brønnøysund watch",
              p: [
                "Every company with an org. no. is checked each night. On bankruptcy, liquidation, deletion, a new name, new address or new industry code, the owner is notified and the change is saved in the history.",
              ],
            },
          ],
        },
        {
          id: "kontakter",
          title: "Contacts (B2B and B2C)",
          blocks: [
            {
              p: [
                "A contact is a person. No field is required – a first enquiry may just be post@company.no – but the contact needs at least one of name, e-mail, phone or company.",
              ],
            },
            {
              h: "B2B or B2C",
              bullets: [
                "B2B: the contact person belongs to a company. Choose it in the Company field – search by name or org. no., including the Brønnøysund Register Centre, and the company is created automatically. An address is only needed if it differs from the company's.",
                "B2C: a private customer without a company, with their own address and optional marketing consent.",
              ],
            },
            {
              h: "Projects on the contact",
              p: ["Choose the contact's projects right in the form. The contact's company is automatically added to the same projects."],
            },
            {
              h: "Access and deletion (GDPR)",
              p: [
                "If a person asks what you store about them, open the contact and press “Download data (GDPR)”. You get a file with all their details, history, deals, quotes and tasks. If they ask to be deleted, delete the contact.",
              ],
            },
          ],
        },
        {
          id: "duplikater",
          title: "Duplicates",
          blocks: [
            {
              p: [
                "The CRM warns you when you add a company or contact that seems to exist already. Under Companies → Possible duplicates you see all possible duplicates and can merge them, so all history ends up in one place.",
              ],
            },
          ],
        },
        {
          id: "salg",
          title: "Deals and pipeline",
          blocks: [
            {
              p: [
                "Under Sales you see all open deals as cards in their stages. Drag a card to the next stage as the deal progresses, and mark it won or lost when it is decided.",
                "Each deal has a value, expected date, owner, company, contact person and optionally a project. The probability follows the stage and is used in the sales funnel.",
              ],
            },
            {
              h: "Your own stages and several pipelines",
              p: [
                "Under Settings → Pipeline stages, owners and admins can rename stages, change probabilities, drag them into a new order, and add or delete stages. If you sell in different ways – new customers, renewals and partners, for example – you can create several pipelines, each with its own stages (Business – Start has one pipeline).",
              ],
            },
          ],
        },
        {
          id: "tilbud",
          title: "Quotes",
          blocks: [
            {
              steps: [
                "Open a deal and press “Create quote”. Customer, contact person and title are filled in.",
                "Add products from the product list or write your own lines. VAT (25, 15, 12 or 0 %) and discounts are calculated automatically.",
                "Press “Send quote”. The customer gets an e-mail with the quote as a PDF and a link where it can be accepted or declined with one click.",
              ],
            },
            {
              p: [
                "You see whether and how many times the quote has been opened. When the customer replies you get an e-mail and a notification, and the answer is logged on the deal with the customer's comment. If the customer said yes on the phone, you can mark the quote as accepted yourself.",
              ],
            },
            {
              h: "Setup",
              bullets: [
                "Quotes → Products: the product list with prices and VAT.",
                "Quotes → Settings: address, bank account, terms and how many days a quote is valid.",
                "Settings: your logo, shown in the menu, in the PDF and on the page the customer sees.",
              ],
            },
          ],
        },
        {
          id: "prosjekter",
          title: "Projects",
          blocks: [
            {
              p: [
                "A project groups companies, contacts, deals and tasks that belong together – a campaign, a product, a customer segment or a separate line of business. Each project has a colour and can have a project manager.",
                "The lists show which projects each company and contact belongs to, and you can filter by project. Projects are also used to limit access for selected users (see Invite colleagues and roles).",
              ],
            },
          ],
        },
        {
          id: "oppgaver",
          title: "Tasks",
          blocks: [
            {
              p: [
                "A task has a title, due date, one owner and optionally several people working on it. It can be open, in progress or done, and you can add notes and attach files. Tasks can be linked to a company, contact, deal and project.",
                "Admins see all tasks; others see their own and the ones they are part of. On your phone, swipe a task to the right to tick it off.",
              ],
            },
            {
              h: "Link a task to a company and contact",
              p: [
                "When you create a task under Tasks, or open an existing one, you can choose a company and a contact. Once a company is chosen, the contact field only lists that company's contacts. If you only choose a contact, the task is also linked to the contact's company.",
                "The task then also appears under Tasks on the company's and the contact's page.",
              ],
            },
            {
              h: "Attachments",
              p: [
                "You can attach files of up to 25 MB: PDF, images (JPG, PNG, WebP, GIF, HEIC), Word, Excel, PowerPoint, OpenDocument, TXT, CSV and ZIP. Other file types, such as programs, can't be uploaded.",
                "PDFs and images open in the browser. Other files are always downloaded. Only people with access to the task can open its attachments.",
              ],
            },
            {
              h: "Tasks in your calendar",
              p: [
                "Under Account and security → Calendar, create a personal link and add it to Google Calendar, Outlook or your iPhone. Your tasks with a due date then appear in your calendar and update automatically.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "E-mail and enquiries",
      sections: [
        {
          id: "e-post",
          title: "E-mail",
          blocks: [
            {
              h: "Send e-mail from the CRM",
              p: [
                "Press “Send e-mail” on a contact, company or deal. Pick a template if you like – name and company are filled in automatically. The e-mail is saved in the history, and the customer's reply comes to your own inbox. Templates are created under Settings → E-mail templates.",
              ],
            },
            {
              h: "Save e-mail with blind copy (Bcc)",
              p: [
                "Your company gets its own CRM address ending in @inn.allseats.no – find it under E-mail. Add it as Bcc when you write to a customer, or forward e-mail you have received. It works from Outlook, Gmail and your phone.",
                "If you saved an older CRM address ending in @allseats.no (without “inn”), replace it with the new one in your contacts, forwarding and e-mail rules.",
                "The e-mail is saved on the contact with the same e-mail address or on the company with the same domain, and is tagged with the contact's projects. If no match is found, it waits in a list until you create the contact.",
                "On the timeline, e-mails are collapsed to their subject – click one to read it in full.",
              ],
            },
            {
              h: "Connect Outlook / Microsoft 365",
              p: [
                "Included in Business, an add-on to Start (NOK 99/month). Under Account and security you can connect your e-mail and calendar (read only). E-mail you exchange with contacts in the CRM is then added to their history automatically. Other e-mail is not read. You can also add shared mailboxes and link a mailbox to a project.",
              ],
            },
            {
              h: "Gmail and Google Workspace",
              p: [
                "Gmail can send a copy of all incoming e-mail to the CRM address. Only e-mail from contacts and companies that exist in the CRM is saved – the rest is ignored. For e-mail you send yourself, use Bcc.",
              ],
              steps: [
                "In Gmail on a computer: the gear → See all settings → Forwarding and POP/IMAP → “Add a forwarding address”, and paste the CRM address.",
                "The confirmation code from Google shows up under E-mail → “Waiting for a contact” in AllSeats. Enter it in Gmail.",
                "Choose “Forward a copy of incoming mail to” the CRM address, keep Gmail's copy in the Inbox and save.",
              ],
            },
          ],
        },
        {
          id: "nettskjema",
          title: "Web forms",
          blocks: [
            {
              p: [
                "Under Settings → Web forms you create a contact form and paste the code into your website (WordPress, Wix, Squarespace and others), or let your own form send to AllSeats.",
                "Every enquiry becomes a contact, a deal and a follow-up task, and the owner is notified on their phone and by e-mail.",
              ],
            },
          ],
        },
        {
          id: "kampanjer",
          title: "Campaigns (newsletters)",
          blocks: [
            {
              p: [
                "Under E-mail → Campaigns, owners and admins can send the same e-mail to many contacts – for example a newsletter to all customers in a project.",
              ],
              steps: [
                "Press “New campaign” and write the subject and text. {first_name}, {last_name}, {name} and {company} are filled in for each recipient.",
                "Choose the recipients: type (B2B/B2C), project and owner. The count updates right away.",
                "Send a test to yourself, then press “Send the campaign”.",
              ],
            },
            {
              p: [
                "Private customers only get campaigns if they have consented to marketing. Contacts who have unsubscribed, and companies that are deleted or bankrupt, are skipped. Every e-mail includes your company's name and address and an unsubscribe link. Replies go to the person who created the campaign.",
                "You see how many received, opened and unsubscribed, and the mailing is saved in each contact's history. Start includes 500 campaign e-mails a month and Bedrift 5,000.",
              ],
            },
          ],
        },
        {
          id: "booking",
          title: "Booking link",
          blocks: [
            {
              p: [
                "Share a link where customers pick a free time for a meeting with you themselves. Under Account and security → Booking link you choose the address, meeting name, place or video link, duration, days and hours, break between meetings, minimum notice and how far ahead people can book.",
                "The meeting becomes a task for you and the customer becomes a contact. With Outlook or Google Calendar connected under Account and security, busy times in your calendar are not offered.",
              ],
            },
          ],
        },
        {
          id: "varsler",
          title: "Notifications and daily summary",
          blocks: [
            {
              p: ["You are notified by e-mail and on your phone when:"],
              bullets: [
                "you get a task or a project, or are added to a task",
                "someone writes a note on a task you are part of",
                "a customer replies to a quote you sent",
                "an enquiry arrives from the web form",
                "a customer's status changes in the Brønnøysund Register Centre",
              ],
            },
            {
              p: [
                "On weekdays at 7 am you get a short summary of today's and overdue tasks, deals without activity and quote replies – only when there is something to follow up. Turn notifications and the summary off under Account and security.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Customization and insight",
      sections: [
        {
          id: "i-dag",
          title: "Today page, menu and search",
          blocks: [
            {
              h: "Your own start page",
              p: [
                "Press “Customize” on the Today page. Drag the widgets into the order you want, make them wide or narrow, hide them and add others – such as key figures, sales funnel, won this month, latest activity and quotes.",
              ],
            },
            {
              h: "Your own menu",
              p: ["Each user can reorder the menu and hide what they don't use. On phones, the first four items become the tabs at the bottom of the screen."],
            },
            {
              h: "Search and shortcuts",
              p: [
                "The search field at the top (/ or Ctrl+K) finds companies, contacts, deals, quotes and tasks by name, e-mail, phone, org. no. or title. On a PC, press ? to see all shortcuts – for example N for something new and G S for Sales.",
                "Under Account and security → Appearance, choose light, dark or automatic mode. Deleted something by mistake? Press “Undo” at the bottom of the screen.",
              ],
            },
          ],
        },
        {
          id: "egne-felt",
          title: "Custom fields",
          blocks: [
            {
              p: [
                "Under Settings → Custom fields, owners and admins can add fields to companies, contacts and deals – such as “Customer type”, “Car model” or “Source”. Fields can be text, number, date, drop-down, yes/no or link, and they appear in the forms, on the card and in exports.",
              ],
            },
          ],
        },
        {
          id: "automatisering",
          title: "Automation",
          blocks: [
            {
              p: [
                "Automation is part of Business. Under Settings → Automation you create rules such as “when a deal moves to Quote sent, create ‘Follow up the quote’ due in 3 days”. The task is assigned to the deal's owner.",
              ],
            },
          ],
        },
        {
          id: "rapporter",
          title: "Reports",
          blocks: [
            {
              p: [
                "Under Reports you see won and lost, win rate, average deal size, sales cycle, open deals by stage, won per month and each team member's activity. Choose a period and person, and download the deals to Excel.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Integrations and data",
      sections: [
        {
          id: "tripletex",
          title: "Tripletex",
          blocks: [
            {
              p: [
                "With the Tripletex connection, customers, contact persons and invoices are fetched into the CRM automatically every six hours. Invoices and outstanding amounts appear on the company card, and overdue invoices become a follow-up task for the account owner. Customers are matched with existing companies by org. no. AllSeats only reads data – your accounts are not changed.",
              ],
            },
            {
              steps: [
                "In Tripletex: Company → Employees → open your employee card → API access tab → New key, and choose the application All Seats CRM.",
                "Copy the whole key.",
                "In AllSeats: Settings → Accounting → paste the key and press Connect.",
              ],
            },
            {
              p: [
                "If you don't see the API access tab, order the Integrations add-on under Company → My subscription in Tripletex. The connection is included in Business and costs NOK 99/month on Start. Fiken and PowerOffice Go are coming.",
              ],
            },
          ],
        },
        {
          id: "import",
          title: "Import and export",
          blocks: [
            {
              h: "Import your existing customers",
              steps: [
                "Go to Companies or Contacts and press Import.",
                "Upload an Excel file (.xlsx) or CSV with headings in the first row. A template with instructions can be downloaded on the import page.",
                "Map the columns to the fields in the CRM and start the import.",
              ],
            },
            {
              p: [
                "Companies that don't exist are created automatically, and contacts with an e-mail that already exists are skipped. Prefer that we do it? Send the file to post@allseats.no – we import it for NOK 150 excl. VAT.",
              ],
            },
            {
              h: "Export",
              p: ["Owners and admins can download companies and contacts as CSV files under Settings at any time. Reports can be downloaded to Excel."],
            },
          ],
        },
        {
          id: "endre-mange",
          title: "Change many at once",
          blocks: [
            {
              p: [
                "Tick the rows in the company or contact list (or all of them with the box at the top), and pick an action in the bar that appears: add to or remove from a project, set the owner or delete.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Account, security and subscription",
      sections: [
        {
          id: "sikkerhet",
          title: "Login and security",
          blocks: [
            {
              bullets: [
                "Log in with e-mail and password, a one-time link by e-mail, or a passkey (Windows Hello, Face ID, Touch ID or fingerprint).",
                "Turn on two-step verification with an authenticator app under Account and security. A passkey already counts as two steps.",
                "Passwords known from data breaches are rejected, so nobody can use a password that is already out there.",
                "Data is stored in the EU (Frankfurt), and each company is kept separate from the others in the database. We test that a user in one company can't read, change, delete or add data in another.",
                "Attachments can only be uploaded in common document and image formats, and only people with access to the task can open them.",
                "We don't use your data for advertising, don't sell it and don't use it to train artificial intelligence.",
                "The data processing agreement is part of the terms and applies automatically (GDPR Art. 28).",
              ],
            },
          ],
        },
        {
          id: "abonnement",
          title: "Subscription and price",
          blocks: [
            {
              bullets: [
                "Start – NOK 249/month: unlimited users, up to 2,000 companies and contacts, one sales pipeline. Add-ons: accounting integration (NOK 99/month) and Outlook / Microsoft 365 sync (NOK 99/month).",
                "Business – NOK 990/month: everything in Start, up to 25,000 companies and contacts, accounting integration and Outlook sync included, several pipelines, automation and users who only see their own projects.",
                "The free trial (14 days) includes everything in Business.",
                "Paying yearly gives you 2 months free. All prices excl. VAT.",
              ],
            },
            {
              p: [
                "Only companies and contacts count towards the limit. Need more? Buy extra contact packs (Start: +2,000 for NOK 50/month, Bedrift: +25,000 for NOK 250/month).",
                "Choose and change the subscription under Subscription in the menu, paying by invoice or card. To cancel, write to post@allseats.no. After cancelling you can read and export your data for 30 days.",
                "The owner can also delete the whole company under Settings → Delete the company. The CRM closes at once, the subscription is not renewed, and everything is permanently deleted after 30 days. Until then the owner can download contacts and companies or undo. Each user can delete their own user account under Account and security.",
              ],
            },
          ],
        },
      ],
    },
  ],
  contactTitle: "Can't find the answer?",
  contactText: "Write to us and we'll help – usually the same day.",
  faqLink: "See also questions and answers",
};

export const docs: Record<Locale, Docs> = { nb, en };
