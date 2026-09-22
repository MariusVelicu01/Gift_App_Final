// Conținutul politicii de confidențialitate și al termenilor și condițiilor,
// afișat din LegalDocumentModal. Reflectă exact procesările de date din aplicație
// (Firebase Auth/Firestore/Storage, OpenAI pentru GiftBot, PostHog, Sentry, push
// notifications, linkuri afiliate). Recomandat: o trecere rapidă printr-un jurist
// înainte de aplicarea la programele de afiliere sau de lansarea publică.

export const LEGAL_LAST_UPDATED = '27.07.2026';
export const LEGAL_CONTACT_EMAIL = 'velicu_marius@yahoo.com';
export const LEGAL_APP_NAME = 'PresentPerfect';

export type LegalSection = {
  heading: string;
  body: string;
};

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Operatorul de date',
    body: `Operatorul de date cu caracter personal pentru aplicația ${LEGAL_APP_NAME} este persoana/entitatea care operează serviciul. Pentru orice solicitare privind datele tale personale, ne poți contacta la ${LEGAL_CONTACT_EMAIL}.`,
  },
  {
    heading: '2. Ce date colectăm',
    body: 'Date de cont: nume, prenume, email, data nașterii, gen. Date despre persoanele dragi pe care le adaugi: nume, zi/lună/an de naștere sau interval estimat de vârstă, gen, notițe, fotografie (opțional). Date despre planurile de cadou: ocazie, buget, termene, produse selectate, istoricul cumpărăturilor și reacțiilor. Date tehnice: token de push notification, identificatori de sesiune. Date de utilizare colectate automat prin analytics și monitorizare erori (vezi secțiunea 5).',
  },
  {
    heading: '3. De ce prelucrăm datele (temei legal)',
    body: 'Executarea contractului (art. 6 alin. 1 lit. b GDPR): creare cont, gestionarea persoanelor dragi și a planurilor de cadou, alerte de preț, notificări push pentru termene și zile de naștere. Consimțământ (art. 6 alin. 1 lit. a): recomandările GiftBot bazate pe inteligență artificială și comunicările de marketing — ambele sunt opționale și pot fi retrase oricând din Setări. Interes legitim (art. 6 alin. 1 lit. f): securitatea aplicației, prevenirea abuzurilor, analiza agregată de utilizare pentru îmbunătățirea produsului.',
  },
  {
    heading: '4. GiftBot și inteligența artificială',
    body: 'Dacă activezi consimțământul pentru GiftBot, descrierea persoanei pentru care cauți un cadou și lista de produse disponibile sunt trimise către furnizorul OpenAI pentru a genera recomandări. Nu trimitem numele, emailul sau alte date de identificare directă către OpenAI — doar textul descriptiv pe care îl introduci și catalogul de produse. Poți dezactiva oricând această procesare din Setări → Datele mele & Confidențialitate.',
  },
  {
    heading: '5. Cui transmitem datele (subprocesatori)',
    body: 'Firebase / Google Cloud — autentificare, bază de date și stocare de imagini. OpenAI — generarea recomandărilor GiftBot (doar cu consimțământul tău explicit). PostHog (găzduit în UE) — analiză de utilizare, agregată și pseudonimizată. Sentry (găzduit în UE) — raportare automată de erori tehnice, pentru a putea depana problemele aplicației. Nu vindem datele tale către terți și nu le folosim în scopuri publicitare externe aplicației.',
  },
  {
    heading: '6. Linkuri afiliate',
    body: `${LEGAL_APP_NAME} afișează produse din magazine partenere. Unele linkuri către aceste magazine sunt linkuri afiliate (prin rețele precum 2Performant sau Profitshare): dacă cumperi un produs după ce ai accesat linkul din aplicație, putem primi un comision de la magazin, fără niciun cost suplimentar pentru tine. Comisionul nu influențează prețul afișat și nu determină ce produse îți sunt recomandate.`,
  },
  {
    heading: '7. Cât timp păstrăm datele',
    body: 'Datele contului și ale persoanelor dragi sunt păstrate cât timp contul este activ. Dacă ștergi o persoană dragă, istoricul cadourilor asociate este păstrat în scop statistic (fără a mai fi asociat vizibil unei persoane active), până la ștergerea contului. Poți solicita oricând ștergerea completă a contului și a datelor asociate, cu excepția situațiilor în care păstrarea este cerută de lege (de exemplu, evidențe fiscale, dacă există tranzacții).',
  },
  {
    heading: '8. Drepturile tale',
    body: 'Ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate a datelor și opoziție, precum și dreptul de a retrage oricând consimțământul acordat, fără a afecta legalitatea prelucrării anterioare retragerii. Ai, de asemenea, dreptul de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP). Pentru exercitarea drepturilor, scrie-ne la ' + LEGAL_CONTACT_EMAIL + '.',
  },
  {
    heading: '9. Vârsta minimă',
    body: `${LEGAL_APP_NAME} este destinată persoanelor cu vârsta de minimum 16 ani. Nu colectăm cu bună știință date de la persoane sub această vârstă.`,
  },
  {
    heading: '10. Securitate',
    body: 'Comunicația cu serverele noastre este criptată (HTTPS/TLS). Accesul la date este restricționat pe bază de autentificare, iar scrierile în baza de date trec exclusiv prin serverul aplicației, nu direct din aplicația client. Fotografiile persoanelor dragi sunt stocate cu identificatori unici greu de ghicit.',
  },
  {
    heading: '11. Modificări ale acestei politici',
    body: `Putem actualiza această politică periodic. Vei fi informat în aplicație despre modificările semnificative. Ultima actualizare: ${LEGAL_LAST_UPDATED}.`,
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Acceptarea termenilor',
    body: `Prin crearea unui cont în ${LEGAL_APP_NAME} confirmi că ai citit, înțeles și accepți acești Termeni și Condiții, precum și Politica de confidențialitate. Dacă nu ești de acord, te rugăm să nu folosești aplicația.`,
  },
  {
    heading: '2. Cine poate folosi aplicația',
    body: 'Aplicația este disponibilă persoanelor cu vârsta de minimum 16 ani. Ești responsabil pentru acuratețea informațiilor furnizate la înregistrare și pentru păstrarea confidențialității parolei contului tău.',
  },
  {
    heading: '3. Descrierea serviciului',
    body: `${LEGAL_APP_NAME} te ajută să organizezi persoanele dragi, să planifici cadouri, să urmărești prețuri la produse din magazine partenere și, opțional, să primești recomandări generate de inteligență artificială (GiftBot).`,
  },
  {
    heading: '4. Produse, prețuri și linkuri afiliate',
    body: 'Informațiile despre produse (preț, disponibilitate, promoții) provin din magazinele partenere și pot suferi modificări în afara controlului nostru. Achiziția produselor are loc integral pe site-ul/în aplicația magazinului partener, sub termenii și condițiile acelui magazin — noi nu suntem parte la tranzacția de cumpărare. Unele linkuri sunt linkuri afiliate: putem primi un comision din vânzările generate prin intermediul lor, fără cost suplimentar pentru tine (vezi și Politica de confidențialitate, secțiunea 6).',
  },
  {
    heading: '5. Conținutul tău',
    body: 'Rămâi proprietarul informațiilor și fotografiilor pe care le încarci. Ne acorzi o licență limitată de a le stoca și afișa exclusiv în scopul furnizării serviciului către tine. Ești responsabil să ai dreptul de a încărca fotografiile persoanelor pe care le adaugi ca "persoane dragi".',
  },
  {
    heading: '6. Comportament interzis',
    body: 'Nu ai voie să folosești aplicația pentru activități ilegale, să încerci să ocolești limitele tehnice sau de securitate (rate limiting, autentificare), să extragi în masă date din aplicație (scraping) sau să folosești funcția GiftBot în alte scopuri decât recomandări de cadouri.',
  },
  {
    heading: '7. Limitarea răspunderii',
    body: 'Aplicația este oferită "ca atare". Recomandările GiftBot sunt generate automat și au caracter orientativ — decizia finală de cumpărare îți aparține. Nu garantăm disponibilitatea neîntreruptă a serviciului și nu răspundem pentru prejudicii indirecte rezultate din utilizarea aplicației, în limita maximă permisă de lege.',
  },
  {
    heading: '8. Suspendarea și încetarea contului',
    body: 'Poți închide oricând contul din Setări. Ne rezervăm dreptul de a suspenda sau închide conturi care încalcă acești termeni sau care pun în pericol securitatea aplicației.',
  },
  {
    heading: '9. Legea aplicabilă',
    body: 'Acești termeni sunt guvernați de legea română. Orice litigiu se supune instanțelor competente din România, fără a aduce atingere drepturilor tale de consumator prevăzute de lege.',
  },
  {
    heading: '10. Contact',
    body: `Pentru întrebări legate de acești termeni, ne poți scrie la ${LEGAL_CONTACT_EMAIL}. Ultima actualizare: ${LEGAL_LAST_UPDATED}.`,
  },
];

export const AFFILIATE_MARKETING_SECTIONS: LegalSection[] = [
  {
    heading: 'Pe scurt',
    body: `${LEGAL_APP_NAME} este gratuită pentru tine. Ea se susține printr-un sistem numit marketing afiliat: când cumperi un produs printr-un link din aplicație, magazinul ne dă un mic comision, ca mulțumire că i-am trimis un client. Tu plătești exact același preț ca și cum ai fi intrat direct pe site-ul lor.`,
  },
  {
    heading: 'De ce facem asta',
    body: `Serverele, inteligența artificială din spatele GiftBot, notificările și tot ce ține aplicația în funcțiune costă bani în fiecare lună. Nu punem reclame și nu vindem datele tale — comisioanele de la magazinele partenere sunt, practic, singurul mod prin care ne acoperim aceste costuri și putem continua să oferim aplicația gratuit.`,
  },
  {
    heading: 'Ce nu se schimbă pentru tine',
    body: 'Prețul pe care îl vezi în aplicație este prețul real din magazin — comisionul vine din partea magazinului, niciodată din buzunarul tău. Nu alegem ce produse să-ți arătăm în funcție de cât comision aduc; recomandările rămân pe baza a ceea ce se potrivește persoanei pentru care cumperi.',
  },
  {
    heading: 'Cum ne ajuți',
    body: 'Simplu: cumpără prin linkurile din aplicație, nu ocolindu-le. Fiecare achiziție prin PresentPerfect contribuie direct la costurile care ne țin online — practic, folosind aplicația așa cum a fost gândită, ne ajuți să existăm în continuare și să o îmbunătățim.',
  },
];
