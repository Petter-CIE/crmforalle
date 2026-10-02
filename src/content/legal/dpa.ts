import type { LegalDoc } from "./types";

const nb: LegalDoc = {
  title: "Databehandleravtale",
  lead: "Avtale etter personvernforordningen (GDPR) artikkel 28 mellom Kunden som behandlingsansvarlig og CIE AS (org.nr. 818 823 452 MVA) som databehandler. Inngås når Kunden godtar brukervilkårene for AllSeats CRM. Gjelder fra 2. oktober 2026.",
  sections: [
    {
      h: "1. Formål og omfang",
      body: [
        "Avtalen regulerer hvordan CIE AS («Databehandleren») behandler personopplysninger på vegne av Kunden («Behandlingsansvarlig») når Kunden bruker AllSeats CRM.",
        "Databehandleren skal bare behandle personopplysningene for å levere tjenesten og etter Kundens dokumenterte instrukser, også når det gjelder overføring til land utenfor EØS. Brukervilkårene, denne avtalen og Kundens bruk av funksjonene i tjenesten utgjør instruksene. Avtalen oppfyller kravene i personopplysningsloven og personvernforordningen artikkel 28 nr. 3.",
      ],
    },
    {
      h: "2. Behandlingen",
      body: [
        {
          list: [
            "Formål: lagring, organisering og visning av Kundens kunde- og kontaktdata, salg, oppgaver og vedlegg, og utsending av varsler til Kundens brukere.",
            "Kategorier av registrerte: Kundens kontaktpersoner, kunder (også privatpersoner), leverandører og andre forbindelser, samt Kundens egne brukere.",
            "Typer opplysninger: navn, stilling, e-post, telefon, adresse, bedriftstilknytning, samtykke til markedsføring, notater, oppgaver, salgsinformasjon, innholdet i opplastede filer og e-poster Kunden sender til bedriftens CRM-adresse.",
            "Varighet: så lenge Kunden har et aktivt abonnement, og deretter til opplysningene er slettet etter punkt 9.",
          ],
        },
        "Kunden skal ikke legge inn særlige kategorier av personopplysninger (for eksempel helseopplysninger) eller opplysninger om straffedommer i tjenesten, med mindre Kunden har et klart rettslig grunnlag og selv vurderer sikkerheten som tilstrekkelig.",
      ],
    },
    {
      h: "3. Kundens plikter",
      body: [
        "Kunden er ansvarlig for at det finnes rettslig grunnlag for behandlingen, for å informere de registrerte og for å besvare deres henvendelser om egne rettigheter.",
      ],
    },
    {
      h: "4. Databehandlerens plikter",
      body: [
        {
          list: [
            "Behandle opplysningene bare etter Kundens instrukser, og varsle Kunden dersom en instruks etter Databehandlerens syn er i strid med personvernregelverket.",
            "Sørge for at alle som har tilgang til opplysningene, har taushetsplikt.",
            "Bistå Kunden, så langt det er rimelig, med å oppfylle de registrertes rettigheter og med pliktene i artikkel 32–36: sikkerhet, melding om brudd, vurderinger av personvernkonsekvenser og forhåndsdrøftinger med Datatilsynet.",
            "Føre protokoll over behandlingsaktivitetene etter artikkel 30 nr. 2.",
            "Ikke bruke opplysningene til egne formål, som markedsføring, salg eller trening av kunstig intelligens.",
          ],
        },
      ],
    },
    {
      h: "5. Sikkerhet",
      body: [
        "Databehandleren skal gjennomføre egnede tekniske og organisatoriske tiltak, blant annet:",
        {
          list: [
            "kryptering av all trafikk (HTTPS/TLS) og kryptering av lagrede data hos underleverandøren,",
            "logisk skille mellom kundene i databasen (radnivåsikkerhet), slik at en bedrift aldri får tilgang til en annens data,",
            "individuelle innlogginger, roller og mulighet for to-trinnsverifisering og passkeys,",
            "private fillagre der vedlegg bare kan åpnes via kortvarige, signerte lenker,",
            "sikkerhetskopier og tilgangsbegrensning for Databehandlerens egne ansatte, som bare får tilgang til Kundens data når det er nødvendig for drift eller support.",
          ],
        },
      ],
    },
    {
      h: "6. Underleverandører",
      body: [
        "Kunden gir generell forhåndsgodkjenning til at Databehandleren bruker disse underleverandørene:",
        {
          list: [
            "Supabase Inc. (USA) – database, innlogging og fillagring. Data lagres i AWS-regionen eu-central-1 (Frankfurt). Overføring sikres med EUs standard personvernbestemmelser (SCC).",
            "Vercel Inc. (USA) – drift av applikasjonen, serverfunksjoner i Frankfurt. Sertifisert under EU–US Data Privacy Framework, i tillegg til SCC.",
            "One.com Group AB (Sverige) – utsending og mottak av e-post. Behandlingen skjer i datasentre i Danmark (EU), og databehandleravtale inngår i avtalen med One.com.",
          ],
        },
        "Databehandleren varsler Kunden på e-post minst 30 dager før en ny underleverandør tas i bruk. Kunden kan protestere innen fristen og har da rett til å si opp avtalen uten kostnad.",
        "Databehandleren skal pålegge underleverandørene minst de samme forpliktelsene som følger av denne avtalen, og er ansvarlig overfor Kunden for deres behandling.",
      ],
    },
    {
      h: "7. Overføring utenfor EØS",
      body: [
        "Opplysningene lagres i EU. Teknisk tilgang fra underleverandører utenfor EØS skjer bare med et gyldig overføringsgrunnlag etter GDPR kapittel V.",
      ],
    },
    {
      h: "8. Brudd på personopplysningssikkerheten",
      body: [
        "Databehandleren skal varsle Kunden uten ugrunnet opphold, og senest innen 48 timer etter å ha blitt kjent med et brudd som berører Kundens opplysninger. Varselet skal beskrive hva som har skjedd, hvilke opplysninger og registrerte som er berørt, og hvilke tiltak som er satt i verk, slik at Kunden kan melde fra til Datatilsynet innen 72 timer.",
      ],
    },
    {
      h: "9. Avslutning, tilbakelevering og sletting",
      body: [
        "Kunden kan eksportere sine data gjennom hele avtaleperioden og i 30 dager etter at abonnementet er avsluttet. Deretter slettes opplysningene fra tjenesten innen 60 dager etter avslutning. Sikkerhetskopier slettes etter hvert som de roterer ut, senest innen 90 dager.",
        "Databehandleren bekrefter slettingen skriftlig dersom Kunden ber om det. Plikten til å slette gjelder ikke opplysninger Databehandleren er pålagt å lagre etter norsk lov eller EU-retten.",
      ],
    },
    {
      h: "10. Revisjon",
      body: [
        "Databehandleren skal gjøre tilgjengelig informasjonen som trengs for å vise at avtalen overholdes, og legge til rette for revisjon. Revisjon varsles minst 30 dager i forveien, gjennomføres i vanlig arbeidstid og bekostes av Kunden. Rapporter fra underleverandørene (for eksempel SOC 2) kan brukes som dokumentasjon.",
      ],
    },
    {
      h: "11. Varighet og forholdet til brukervilkårene",
      body: [
        "Avtalen gjelder så lenge Databehandleren behandler personopplysninger for Kunden. Ved motstrid mellom denne avtalen og brukervilkårene går denne avtalen foran når det gjelder personopplysninger. Ansvarsbegrensningen i brukervilkårene gjelder også for denne avtalen, så langt loven tillater.",
        "Avtalen reguleres av norsk rett, med Hordaland tingrett som verneting.",
      ],
    },
  ],
};

const en: LegalDoc = {
  title: "Data processing agreement",
  lead: "Agreement under Article 28 of the General Data Protection Regulation (GDPR) between the Customer as controller and CIE AS (org. no. 818 823 452 MVA) as processor. Entered into when the Customer accepts the AllSeats CRM terms of service. Effective from 2 October 2026. In case of doubt, the Norwegian version applies.",
  sections: [
    {
      h: "1. Purpose and scope",
      body: [
        "This agreement governs how CIE AS (the “Processor”) processes personal data on behalf of the Customer (the “Controller”) when the Customer uses AllSeats CRM.",
        "The Processor shall process the personal data only to provide the service and on the Customer’s documented instructions, including with regard to transfers outside the EEA. The terms of service, this agreement and the Customer’s use of the features of the service constitute the instructions. This agreement meets the requirements of the Norwegian Personal Data Act and Article 28(3) of the GDPR.",
      ],
    },
    {
      h: "2. The processing",
      body: [
        {
          list: [
            "Purpose: storing, organising and displaying the Customer’s customer and contact data, deals, tasks and attachments, and sending notifications to the Customer’s users.",
            "Categories of data subjects: the Customer’s contact persons, customers (including private individuals), suppliers and other relations, and the Customer’s own users.",
            "Types of data: name, job title, e-mail, phone, address, company affiliation, marketing consent, notes, tasks, sales information, the content of uploaded files and e-mails the Customer sends to the company's CRM address.",
            "Duration: as long as the Customer has an active subscription, and thereafter until the data is deleted under section 9.",
          ],
        },
        "The Customer shall not enter special categories of personal data (for example health data) or data about criminal convictions into the service, unless the Customer has a clear legal basis and itself considers the security sufficient.",
      ],
    },
    {
      h: "3. The Customer’s obligations",
      body: [
        "The Customer is responsible for having a legal basis for the processing, for informing the data subjects and for answering their requests regarding their rights.",
      ],
    },
    {
      h: "4. The Processor’s obligations",
      body: [
        {
          list: [
            "Process the data only on the Customer’s instructions, and notify the Customer if an instruction in the Processor’s opinion infringes data protection law.",
            "Ensure that everyone with access to the data is bound by confidentiality.",
            "Assist the Customer, as far as reasonable, in fulfilling data subjects’ rights and with the obligations in Articles 32–36: security, breach notification, data protection impact assessments and prior consultations with the supervisory authority.",
            "Keep a record of processing activities under Article 30(2).",
            "Not use the data for its own purposes, such as marketing, sale or training artificial intelligence.",
          ],
        },
      ],
    },
    {
      h: "5. Security",
      body: [
        "The Processor shall implement appropriate technical and organisational measures, including:",
        {
          list: [
            "encryption of all traffic (HTTPS/TLS) and encryption of stored data at the sub-processor,",
            "logical separation of customers in the database (row-level security), so that one company never gets access to another’s data,",
            "individual logins, roles and the option of two-step verification and passkeys,",
            "private file storage where attachments can only be opened through short-lived signed links,",
            "backups and restricted access for the Processor’s own staff, who only access the Customer’s data when needed for operations or support.",
          ],
        },
      ],
    },
    {
      h: "6. Sub-processors",
      body: [
        "The Customer gives general prior authorisation for the Processor to use these sub-processors:",
        {
          list: [
            "Supabase Inc. (USA) – database, login and file storage. Data is stored in the AWS region eu-central-1 (Frankfurt). Transfers are covered by the EU Standard Contractual Clauses (SCC).",
            "Vercel Inc. (USA) – application hosting, server functions in Frankfurt. Certified under the EU–US Data Privacy Framework, in addition to SCC.",
            "One.com Group AB (Sweden) – sending and receiving e-mail. Processing takes place in data centres in Denmark (EU), and a data processing agreement forms part of the agreement with One.com.",
          ],
        },
        "The Processor notifies the Customer by e-mail at least 30 days before a new sub-processor is used. The Customer may object within that period and then has the right to terminate the agreement at no cost.",
        "The Processor shall impose on sub-processors at least the same obligations as follow from this agreement, and is liable to the Customer for their processing.",
      ],
    },
    {
      h: "7. Transfers outside the EEA",
      body: [
        "The data is stored in the EU. Technical access by sub-processors outside the EEA only takes place with a valid transfer mechanism under Chapter V of the GDPR.",
      ],
    },
    {
      h: "8. Personal data breaches",
      body: [
        "The Processor shall notify the Customer without undue delay, and no later than 48 hours after becoming aware of a breach affecting the Customer’s data. The notice shall describe what happened, which data and data subjects are affected, and which measures have been taken, so that the Customer can notify the supervisory authority within 72 hours.",
      ],
    },
    {
      h: "9. Termination, return and deletion",
      body: [
        "The Customer can export its data throughout the agreement and for 30 days after the subscription has ended. The data is then deleted from the service within 60 days after the end. Backups are deleted as they rotate out, at the latest within 90 days.",
        "The Processor confirms the deletion in writing if the Customer asks. The obligation to delete does not apply to data the Processor is required to keep under Norwegian or EU law.",
      ],
    },
    {
      h: "10. Audits",
      body: [
        "The Processor shall make available the information needed to demonstrate compliance with this agreement and allow for audits. Audits are announced at least 30 days in advance, carried out during normal working hours and paid for by the Customer. Reports from the sub-processors (for example SOC 2) may be used as documentation.",
      ],
    },
    {
      h: "11. Duration and relation to the terms of service",
      body: [
        "This agreement applies for as long as the Processor processes personal data for the Customer. In case of conflict between this agreement and the terms of service, this agreement prevails as regards personal data. The limitation of liability in the terms of service also applies to this agreement, to the extent permitted by law.",
        "This agreement is governed by Norwegian law, with Hordaland District Court as the venue.",
      ],
    },
  ],
};

export const dpa = { nb, en };
