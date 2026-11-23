import { formatMoney, Locale } from '../common/locale';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const T = {
  en: {
    verifySubject: 'Confirm your BusTravel account',
    verifyBody: 'Welcome to BusTravel! Please confirm your email address:',
    verifyCta: 'Confirm email',
    bookingSubject: 'Your ticket',
    hello: 'Hello',
    paid: 'Your booking is confirmed and paid.',
    route: 'Route',
    departure: 'Departure',
    arrival: 'Arrival',
    seats: 'Seats',
    total: 'Total',
    code: 'Booking code',
    qr: 'Show this QR code to the driver when boarding.',
    cancelledSubject: 'Your trip was cancelled',
    cancelled: 'Unfortunately this trip was cancelled. Your booking has been cancelled.',
    viewTicket: 'Open my ticket',
    ticketTitle: 'Your ticket is ready',
    ticketNote: 'Times are shown in UTC. Keep this email: the QR code works offline.',
    footer: 'BusTravel · comfortable bus trips across Europe',
    inviteSubject: 'You are invited to administer BusTravel',
    inviteBody: '{who} invited you to be an administrator of BusTravel. Create your account with this email address to accept:',
    inviteCta: 'Accept invitation',
    inviteExpires: 'The invitation is valid for 7 days.',
    grantedSubject: 'You are now a BusTravel administrator',
    granted: '{who} gave you administrator access. Log in to open the dashboard:',
    grantedCta: 'Open dashboard',
    demoNote: 'Test mode: no real money was charged and this ticket is not valid for travel.',
  },
  uk: {
    verifySubject: 'Підтвердіть акаунт BusTravel',
    verifyBody: 'Вітаємо в BusTravel! Підтвердіть, будь ласка, адресу електронної пошти:',
    verifyCta: 'Підтвердити пошту',
    bookingSubject: 'Ваш квиток',
    hello: 'Доброго дня',
    paid: 'Ваше бронювання підтверджено та оплачено.',
    route: 'Маршрут',
    departure: 'Відправлення',
    arrival: 'Прибуття',
    seats: 'Місця',
    total: 'Разом',
    code: 'Код бронювання',
    qr: 'Покажіть цей QR-код водієві під час посадки.',
    cancelledSubject: 'Рейс скасовано',
    cancelled: 'На жаль, цей рейс скасовано. Ваше бронювання скасовано.',
    viewTicket: 'Відкрити квиток',
    ticketTitle: 'Ваш квиток готовий',
    ticketNote: 'Час вказано за UTC. Збережіть цей лист: QR-код працює й без інтернету.',
    footer: 'BusTravel · комфортні автобусні поїздки Європою',
    inviteSubject: 'Вас запрошують стати адміністратором BusTravel',
    inviteBody: '{who} запрошує вас стати адміністратором BusTravel. Створіть акаунт із цією адресою пошти, щоб прийняти запрошення:',
    inviteCta: 'Прийняти запрошення',
    inviteExpires: 'Запрошення дійсне 7 днів.',
    grantedSubject: 'Тепер ви адміністратор BusTravel',
    granted: '{who} надав(-ла) вам доступ адміністратора. Увійдіть, щоб відкрити панель:',
    grantedCta: 'Відкрити панель',
    demoNote: 'Тестовий режим: гроші не списано, а квиток не дійсний для поїздки.',
  },
  de: {
    verifySubject: 'Bestätige dein BusTravel-Konto',
    verifyBody: 'Willkommen bei BusTravel! Bitte bestätige deine E-Mail-Adresse:',
    verifyCta: 'E-Mail bestätigen',
    bookingSubject: 'Dein Ticket',
    hello: 'Hallo',
    paid: 'Deine Buchung ist bestätigt und bezahlt.',
    route: 'Strecke',
    departure: 'Abfahrt',
    arrival: 'Ankunft',
    seats: 'Sitzplätze',
    total: 'Gesamt',
    code: 'Buchungscode',
    qr: 'Zeige diesen QR-Code beim Einsteigen dem Fahrer.',
    cancelledSubject: 'Fahrt abgesagt',
    cancelled: 'Diese Fahrt wurde leider abgesagt. Deine Buchung wurde storniert.',
    viewTicket: 'Ticket öffnen',
    ticketTitle: 'Dein Ticket ist da',
    ticketNote: 'Zeiten in UTC. Bewahre diese E-Mail auf: Der QR-Code funktioniert auch offline.',
    footer: 'BusTravel · bequeme Busreisen quer durch Europa',
    inviteSubject: 'Einladung als Administrator bei BusTravel',
    inviteBody: '{who} lädt dich ein, BusTravel zu verwalten. Erstelle mit dieser E-Mail-Adresse ein Konto, um die Einladung anzunehmen:',
    inviteCta: 'Einladung annehmen',
    inviteExpires: 'Die Einladung ist 7 Tage gültig.',
    grantedSubject: 'Du bist jetzt Administrator bei BusTravel',
    granted: '{who} hat dir Administratorrechte gegeben. Melde dich an, um das Dashboard zu öffnen:',
    grantedCta: 'Dashboard öffnen',
    demoNote: 'Testmodus: Es wurde kein echtes Geld abgebucht, das Ticket ist für keine Fahrt gültig.',
  },
  pl: {
    verifySubject: 'Potwierdź konto BusTravel',
    verifyBody: 'Witamy w BusTravel! Potwierdź swój adres e-mail:',
    verifyCta: 'Potwierdź e-mail',
    bookingSubject: 'Twój bilet',
    hello: 'Cześć',
    paid: 'Twoja rezerwacja jest potwierdzona i opłacona.',
    route: 'Trasa',
    departure: 'Odjazd',
    arrival: 'Przyjazd',
    seats: 'Miejsca',
    total: 'Razem',
    code: 'Kod rezerwacji',
    qr: 'Pokaż ten kod QR kierowcy przy wsiadaniu.',
    cancelledSubject: 'Kurs odwołany',
    cancelled: 'Niestety ten kurs został odwołany. Twoja rezerwacja została anulowana.',
    viewTicket: 'Otwórz bilet',
    ticketTitle: 'Twój bilet jest gotowy',
    ticketNote: 'Godziny podano w UTC. Zachowaj tę wiadomość: kod QR działa także offline.',
    footer: 'BusTravel · wygodne podróże autobusem po Europie',
    inviteSubject: 'Zaproszenie na administratora BusTravel',
    inviteBody: '{who} zaprasza Cię do administrowania BusTravel. Załóż konto z tym adresem e-mail, aby przyjąć zaproszenie:',
    inviteCta: 'Przyjmij zaproszenie',
    inviteExpires: 'Zaproszenie jest ważne 7 dni.',
    grantedSubject: 'Jesteś teraz administratorem BusTravel',
    granted: '{who} nadał(a) Ci uprawnienia administratora. Zaloguj się, aby otworzyć panel:',
    grantedCta: 'Otwórz panel',
    demoNote: 'Tryb testowy: nie pobrano prawdziwych pieniędzy, a bilet nie jest ważny w podróży.',
  },
} satisfies Record<Locale, Record<string, string>>;

const ACCENT = '#ffd23f';
const INK = '#0d1220';

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${ACCENT};color:${INK};font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:15px">${esc(label)}</a>`;

const layout = (locale: Locale, title: string, body: string) =>
  `<!doctype html><html lang="${locale}"><body style="margin:0;padding:0;background:#eef1f8">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f8;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:'Segoe UI',system-ui,Arial,sans-serif;color:${INK}">
     <tr><td style="background:${INK};border-radius:20px 20px 0 0;padding:26px 32px">
        <span style="font-size:22px;font-weight:800;color:#fff">Bus</span><span style="font-size:22px;font-weight:800;color:${ACCENT}">Travel</span>
        <div style="margin-top:14px;font-size:26px;line-height:1.2;font-weight:800;color:#fff">${esc(title)}</div>
     </td></tr>
     <tr><td style="background:#ffffff;padding:28px 32px;font-size:15px;line-height:1.6">${body}</td></tr>
     <tr><td style="background:#f7f8fc;border-radius:0 0 20px 20px;padding:16px 32px;font-size:12px;color:#64748b;text-align:center">${esc(T[locale].footer)}<br><span style="color:#b45309">${esc(T[locale].demoNote)}</span></td></tr>
    </table>
   </td></tr></table></body></html>`;

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');

export function verifyEmail(locale: Locale, link: string) {
  const t = T[locale];
  return {
    subject: t.verifySubject,
    html: layout(locale, t.verifySubject, `<p style="margin-top:0">${esc(t.verifyBody)}</p><p style="margin:24px 0 8px">${button(link, t.verifyCta)}</p>`),
  };
}

export interface TicketMailData {
  name: string;
  code: string;
  from: string;
  to: string;
  departureAt: Date;
  arrivalAt: Date;
  seats: number[];
  totalCents: number;
  currency: string;
  url?: string;
}

export function ticketEmail(locale: Locale, d: TicketMailData) {
  const t = T[locale];
  const tag = { en: 'en-GB', uk: 'uk-UA', de: 'de-DE', pl: 'pl-PL' }[locale];
  const time = (x: Date) => new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(x);
  const day = (x: Date) => new Intl.DateTimeFormat(tag, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(x);
  const label = (k: string) => `<div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${esc(k)}</div>`;
  const leg = (k: string, at: Date, city: string) =>
    `<td valign="top" width="50%" style="padding:0 8px 0 0">${label(k)}
       <div style="font-size:30px;font-weight:800;line-height:1.1;margin-top:4px">${esc(time(at))}</div>
       <div style="font-weight:700;margin-top:2px">${esc(city)}</div><div style="font-size:12px;color:#64748b">${esc(day(at))}</div></td>`;
  const cell = (k: string, v: string) => `<td valign="top" style="padding:12px 20px 12px 0">${label(k)}<div style="font-weight:700;margin-top:2px">${esc(v)}</div></td>`;
  return {
    subject: `${t.bookingSubject} ${d.code}: ${d.from} → ${d.to}`,
    html: layout(
      locale,
      t.ticketTitle,
      `<p style="margin-top:0">${esc(t.hello)}, ${esc(d.name)}! ${esc(t.paid)}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;margin:20px 0"><tr><td style="padding:20px">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${leg(t.departure, d.departureAt, d.from)}${leg(t.arrival, d.arrivalAt, d.to)}</tr></table>
         <div style="border-top:2px dashed #e2e8f0;margin:18px 0 6px"></div>
         <table role="presentation" cellpadding="0" cellspacing="0"><tr>${cell(t.code, d.code)}${cell(t.seats, d.seats.join(', '))}${cell(t.total, formatMoney(d.totalCents, d.currency, locale))}</tr></table>
       </td></tr></table>
       <div style="text-align:center;margin:8px 0 4px"><img src="cid:ticket-qr" alt="QR ${esc(d.code)}" width="200" height="200" style="border-radius:12px;border:1px solid #e2e8f0"><div style="font-size:13px;color:#475569;margin-top:8px">${esc(t.qr)}</div></div>
       ${d.url ? `<p style="text-align:center;margin:24px 0 8px">${button(d.url, t.viewTicket)}</p>` : ''}
       <p style="font-size:12px;color:#94a3b8;text-align:center;margin-bottom:0">${esc(t.ticketNote)}</p>`,
    ),
  };
}

export function cancelledEmail(locale: Locale, d: { name: string; code: string; from: string; to: string }) {
  const t = T[locale];
  return {
    subject: `${t.cancelledSubject} ${d.code}`,
    html: layout(
      locale,
      t.cancelledSubject,
      `<p style="margin-top:0">${esc(t.hello)}, ${esc(d.name)}.</p><p style="font-size:18px;font-weight:700">${esc(d.from)} → ${esc(d.to)}</p><p style="margin-bottom:0">${esc(t.cancelled)}</p>`,
    ),
  };
}

export function adminInviteEmail(locale: Locale, d: { who: string; link: string }) {
  const t = T[locale];
  return {
    subject: t.inviteSubject,
    html: layout(
      locale,
      t.inviteSubject,
      `<p style="margin-top:0">${esc(fill(t.inviteBody, { who: d.who }))}</p><p style="margin:24px 0 8px">${button(d.link, t.inviteCta)}</p><p style="font-size:12px;color:#94a3b8;margin-bottom:0">${esc(t.inviteExpires)}</p>`,
    ),
  };
}

export function adminGrantedEmail(locale: Locale, d: { who: string; link: string }) {
  const t = T[locale];
  return {
    subject: t.grantedSubject,
    html: layout(locale, t.grantedSubject, `<p style="margin-top:0">${esc(fill(t.granted, { who: d.who }))}</p><p style="margin:24px 0 8px">${button(d.link, t.grantedCta)}</p>`),
  };
}
