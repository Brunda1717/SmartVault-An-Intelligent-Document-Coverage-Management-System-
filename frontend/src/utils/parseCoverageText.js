// frontend/src/utils/parseCoverageText.js
//
// Turns raw OCR text from a warranty card / insurance policy / invoice into the
// fields of the "Add coverage" form. Pure functions: no network, no React.
//
// Every field comes back with a status so the UI can show the user what to check:
//   "read"  -> found next to a clear label on the document
//   "check" -> a guess or a calculation, the user should double-check it

const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

const pad = (n) => String(n).padStart(2, "0");
const toIso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const fullYear = (y) => (y < 100 ? 2000 + y : y);

function validDate(y, m, d) {
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function monthFromWord(word) {
    const w = word.toLowerCase().replace(/\.$/, "");
    if (w.length < 3) return 0;
    if (w === "sept") return 9;
    const i = MONTHS.findIndex((full) => full.startsWith(w));
    return i === -1 ? 0 : i + 1;
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// start + N years/months, minus one day (a 1-year plan from 07 Nov ends 06 Nov)
function addDuration(isoStart, n, unit) {
    const [y, m, d] = isoStart.split("-").map(Number);
    let ty = y;
    let tm = m;
    if (unit === "year") ty += n;
    else {
        tm += n;
        ty += Math.floor((tm - 1) / 12);
        tm = ((tm - 1) % 12) + 1;
    }
    const day = Math.min(d, daysInMonth(ty, tm));
    const end = new Date(Date.UTC(ty, tm - 1, day) - 86400000);
    return end.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Text clean-up                                                       */
/* ------------------------------------------------------------------ */

function normalize(text) {
    return String(text || "")
        .replace(/\u00A0/g, " ")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        // fix letters OCR mistakes for digits, only inside date-like tokens (e.g. 0l/O7/2O25)
        .replace(/\b[\dOolI|]{1,4}(?:[\/\-.][\dOolI|]{1,4}){2}\b/g, (tok) =>
            tok.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1")
        )
        .replace(/\|/g, " ")
        .replace(/[ \t]+/g, " ");
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function findDates(line) {
    const found = [];
    const add = (m, y, mo, d) => {
        if (validDate(y, mo, d)) {
            found.push({ index: m.index, end: m.index + m[0].length, iso: toIso(y, mo, d) });
        }
    };
    let m;

    // 07/11/2025, 7-11-25, 07.11.2025   (day first, as used in India)
    const numeric = /\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4}|\d{2})\b/g;
    while ((m = numeric.exec(line))) {
        let d = +m[1];
        let mo = +m[2];
        if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // clearly month-first
        add(m, fullYear(+m[3]), mo, d);
    }

    // 2025-11-07
    const isoLike = /\b(\d{4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\b/g;
    while ((m = isoLike.exec(line))) add(m, +m[1], +m[2], +m[3]);

    // 07 Nov 2025, 7-Nov-25, 07th November, 2025
    const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.,]*([A-Za-z]{3,9})\.?[\s\-\/.,]*(\d{4}|\d{2})\b/g;
    while ((m = dayMonth.exec(line))) {
        const mo = monthFromWord(m[2]);
        if (mo) add(m, fullYear(+m[3]), mo, +m[1]);
    }

    // Nov 07, 2025
    const monthDay = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g;
    while ((m = monthDay.exec(line))) {
        const mo = monthFromWord(m[1]);
        if (mo) add(m, +m[3], mo, +m[2]);
    }

    // drop overlapping matches, keep the earliest/longest
    found.sort((a, b) => a.index - b.index || b.end - a.end);
    const clean = [];
    for (const f of found) {
        if (!clean.length || f.index >= clean[clean.length - 1].end) clean.push(f);
    }
    return clean;
}

const LABELS = [
    { type: "purchase", re: /\b(?:date\s+of\s+purchase|purchase\s+date|purchased\s+on|invoice\s+date|date\s+of\s+invoice|bill\s+date|date\s+of\s+sale|sold\s+on|dop)\b/gi },
    { type: "issue", re: /\b(?:issue\s+date|date\s+of\s+issue|issued\s+on)\b/gi },
    { type: "end", re: /\b(?:expiry|expires?|expiration|end(?:s|ing)?(?:\s+date)?|valid\s+(?:till|until|upto|up\s+to|through|thru|to)|till|until|upto|up\s+to|through|thru|lapses?|to)\b/gi },
    { type: "start", re: /\b(?:start(?:s|ing)?(?:\s+date)?|commenc\w+|effective(?:\s+(?:from|date))?|inception|valid\s+from|from|begin\w*|activation(?:\s+date)?)\b/gi },
];

function findLabels(line) {
    const hits = [];
    for (const { type, re } of LABELS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) hits.push({ type, index: m.index, end: m.index + m[0].length });
    }
    return hits.sort((a, b) => a.index - b.index);
}

function extractDates(lines) {
    const info = lines.map((line) => ({ dates: findDates(line), hits: findLabels(line) }));
    const assigned = [];

    info.forEach((row, li) => {
        row.dates.forEach((dt, k) => {
            // 1) nearest label just before the date on the same line
            const before = row.hits.filter((h) => h.end <= dt.index && dt.index - h.end <= 45);
            let type = before.length ? before[before.length - 1].type : null;
            let weak = false;

            // 2) a header row above ("Start date   End date") with the dates underneath
            if (!type && li > 0) {
                let p = li - 1;
                while (p > 0 && !lines[p].trim()) p--; // OCR often leaves blank lines between rows
                const prev = info[p];
                if (prev.hits.length && prev.dates.length === 0) {
                    const hit = prev.hits[k] || prev.hits[prev.hits.length - 1];
                    type = hit.type;
                }
            }

            // 3) two unlabeled dates on one line: assume "start ... end"
            if (!type && row.dates.length >= 2) {
                type = k === 0 ? "start" : k === 1 ? "end" : null;
                weak = true;
            }

            if (type) assigned.push({ type, iso: dt.iso, weak });
        });
    });
    return assigned;
}

/* ------------------------------------------------------------------ */
/* Warranty period ("12 months", "1 year warranty")                    */
/* ------------------------------------------------------------------ */

const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5 };

function findDuration(text) {
    const flat = text.replace(/\s+/g, " ");
    const num = "(\\d{1,2}|one|two|three|four|five)";
    const unit = "(year|yr|month|mth)s?";
    const patterns = [
        new RegExp(`(?:warranty|coverage|cover|protection|validity|period|term|duration)[^.\\n]{0,40}?\\b${num}\\s*(?:\\(\\s*\\d+\\s*\\)\\s*)?${unit}\\b`, "i"),
        new RegExp(`\\b${num}[\\s-]*${unit}[\\s-]*(?:extended\\s+)?(?:warranty|coverage|protection|plan)`, "i"),
    ];
    for (const re of patterns) {
        const m = flat.match(re);
        if (!m) continue;
        const n = WORD_NUM[m[1].toLowerCase()] || Number(m[1]);
        const u = m[2].toLowerCase().startsWith("y") ? "year" : "month";
        if (n > 0 && ((u === "year" && n <= 10) || (u === "month" && n <= 120))) return { n, unit: u };
    }
    return null;
}

/* ------------------------------------------------------------------ */
/* Policy number                                                       */
/* ------------------------------------------------------------------ */

function findPolicyNumber(text) {
    const label = /\b(?:policy|certificate|warranty|plan|contract|registration|reference|ref|agreement|membership)\s*(?:no\.?|number|num\.?|id|#|code)\s*[:\-#.]*[ \t]*\r?\n?[ \t]*/gi;
    let m;
    while ((m = label.exec(text))) {
        const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 50);
        const tok = rest.match(/^([A-Z0-9][A-Z0-9\-\/_.]{3,34})/i);
        if (!tok) continue;
        const value = tok[1].replace(/[.\-\/_]+$/, "");
        if (!/\d/.test(value)) continue;                 // must contain a digit
        if (findDates(value).length) continue;           // not a date
        if (value.length < 4) continue;
        return value.toUpperCase();
    }
    return "";
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

const INSURERS = [
    "Bajaj Allianz", "Bajaj Finserv", "HDFC ERGO", "ICICI Lombard", "Tata AIG", "New India Assurance",
    "United India Insurance", "Oriental Insurance", "National Insurance", "SBI General", "Reliance General",
    "Digit Insurance", "Acko", "Zopper", "OneAssist", "Onsitego", "Servify", "Cholamandalam", "Chola MS",
    "Royal Sundaram", "Future Generali", "IFFCO Tokio", "Liberty General", "Navi General", "Zurich Kotak",
    "Kotak General", "Magma HDI", "Care Health", "Star Health", "Croma", "Reliance Digital", "Vijay Sales",
];

const BRANDS = [
    "Samsung", "Apple", "Oppo", "OnePlus", "Vivo", "Xiaomi", "Redmi", "Realme", "Poco", "Motorola", "Nokia",
    "Google", "Sony", "LG", "Panasonic", "Whirlpool", "Godrej", "Haier", "IFB", "Voltas", "Bosch", "Philips",
    "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "boAt", "JBL", "Bose", "Daikin", "Hitachi", "Carrier",
    "Blue Star", "Havells", "Prestige", "TCL", "Hisense", "Nothing", "iQOO", "Honor", "Infinix", "Tecno",
];

const countOf = (text, name) => {
    const re = new RegExp(`\\b${name.replace(/\s+/g, "\\s+")}\\b`, "gi");
    return (text.match(re) || []).length;
};

const bestOf = (text, names) => {
    let best = null;
    for (const name of names) {
        const c = countOf(text, name);
        if (c && (!best || c > best.count)) best = { name, count: c };
    }
    return best;
};

function cleanName(s) {
    return s.replace(/\s{2,}.*$/, "").replace(/[,;:]+$/, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function findProvider(text, lines, coverageType, asset) {
    // 1) explicit label: "Insurer: Bajaj Allianz General Insurance"
    const labelled = text.match(
        /\b(?:insurer|insurance\s+company|underwritten\s+by|issued\s+by|provided\s+by|warranty\s+provider|service\s+provider|plan\s+provider|administered\s+by|provider)\s*[:\-]\s*([^\n]{3,60})/i
    );
    if (labelled) {
        const name = cleanName(labelled[1]);
        if (name.length >= 3 && /[a-z]/i.test(name)) return { value: name, status: "read" };
    }

    const insurer = bestOf(text, INSURERS);
    const brand = bestOf(text, BRANDS);
    const assetBrand = asset?.brand && countOf(text, asset.brand) ? asset.brand : null;

    // 2) insurance / extended plans are sold by an insurer, warranties by the brand
    if (coverageType === "Warranty") {
        if (assetBrand) return { value: assetBrand, status: "read" };
        if (brand) return { value: brand.name, status: "read" };
        if (insurer) return { value: insurer.name, status: "read" };
    } else {
        if (insurer) return { value: insurer.name, status: "read" };
        if (brand) return { value: brand.name, status: "check", note: "Brand name found - confirm who actually issued this plan" };
    }

    // 3) first line that looks like a company name
    const line = lines.find((l) =>
        /\b(?:ltd|limited|pvt|private|llp|inc|insurance|assurance|care|services|solutions)\b/i.test(l) && /[a-z]{3}/i.test(l)
    );
    if (line) return { value: cleanName(line), status: "check", note: "Taken from the document heading - confirm the name" };

    return { value: "", status: null };
}

/* ------------------------------------------------------------------ */
/* Coverage type + document type                                       */
/* ------------------------------------------------------------------ */

function detectTypes(text) {
    const t = text.toLowerCase();
    const count = (re) => (t.match(re) || []).length;

    const extended = count(/extended\s+(?:warranty|protection|plan|care)|additional\s+warranty|warranty\s+extension/g) * 5;
    const insurance =
        count(/insurance|insured|insurer|irdai/g) * 3 +
        count(/premium|sum\s+insured|policy\s+schedule|policy\s+period/g) * 3 +
        count(/accidental\s+damage|liquid\s+damage|theft/g);
    const warranty = count(/warranty|guarantee|manufacturer/g);
    const invoice = count(/tax\s+invoice|invoice\s+(?:no|number|date)|gstin|bill\s+of\s+supply|cash\s+memo/g) * 3;

    let coverageType = "Warranty";
    let top = warranty;
    if (extended > top) { coverageType = "Extended Warranty"; top = extended; }
    if (insurance > top) { coverageType = "Insurance"; top = insurance; }

    let documentType = "Other";
    if (invoice >= 3 && invoice >= top) documentType = "Purchase Invoice";
    else if (coverageType === "Insurance") documentType = "Insurance Policy";
    else if (coverageType === "Extended Warranty") documentType = "Protection Plan";
    else if (warranty) documentType = "Warranty Document";

    const confident = top >= 2;
    return { coverageType, documentType, confident, isInvoice: documentType === "Purchase Invoice" };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function parseCoverageText(rawText, asset = null) {
    const text = normalize(rawText);
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const nonEmpty = lines.filter(Boolean);

    const meta = {};
    const fields = { coverage_type: "", provider: "", policy_number: "", start_date: "", end_date: "" };
    const set = (key, value, status, note = "") => {
        if (!value) return;
        fields[key] = value;
        meta[key] = { status, note, value };
    };

    // type
    const types = detectTypes(text);
    set(
        "coverage_type",
        types.coverageType,
        types.confident ? "read" : "check",
        types.confident ? "" : "Not clearly stated on the document - confirm the type"
    );

    // provider + policy number
    const provider = findProvider(text, nonEmpty, types.coverageType, asset);
    set("provider", provider.value, provider.status, provider.note || "");
    set("policy_number", findPolicyNumber(text), "read");

    // dates
    const assigned = extractDates(lines);
    const pick = (type) =>
        assigned.find((a) => a.type === type && !a.weak) || assigned.find((a) => a.type === type);

    const start = pick("start");
    const end = pick("end");
    const purchase = pick("purchase");
    const issue = pick("issue");
    const duration = findDuration(text);

    let startVal = "", startStatus = "read", startNote = "";
    let endVal = "", endStatus = "read", endNote = "";

    if (start) {
        startVal = start.iso;
        if (start.weak) { startStatus = "check"; startNote = "Taken from two dates on the document - confirm which is the start"; }
    } else if (purchase) {
        startVal = purchase.iso; startStatus = "check"; startNote = "Using the purchase date as the start date";
    } else if (issue) {
        startVal = issue.iso; startStatus = "check"; startNote = "Using the issue date as the start date";
    } else if (duration && asset?.purchase_date) {
        startVal = String(asset.purchase_date).slice(0, 10); startStatus = "check";
        startNote = "Using this asset's purchase date as the start date";
    }

    if (end) {
        endVal = end.iso;
        if (end.weak) { endStatus = "check"; endNote = "Taken from two dates on the document - confirm which is the end"; }
    } else if (startVal && duration) {
        endVal = addDuration(startVal, duration.n, duration.unit);
        endStatus = "check";
        endNote = `Calculated from the ${duration.n} ${duration.unit}${duration.n > 1 ? "s" : ""} period on the document`;
    }

    const notes = [];
    if (startVal && endVal && endVal < startVal) {
        [startVal, endVal] = [endVal, startVal];
        startStatus = endStatus = "check";
        startNote = endNote = "The two dates looked reversed, so they were swapped - confirm them";
        notes.push("Start and end dates looked reversed and were swapped.");
    }

    set("start_date", startVal, startStatus, startNote);
    set("end_date", endVal, endStatus, endNote);

    const wanted = ["coverage_type", "provider", "policy_number", "start_date", "end_date"];
    const missing = wanted.filter((k) => !fields[k]);
    if (types.isInvoice) notes.push("This looks like a purchase invoice. Invoices rarely state coverage dates, so please check them carefully.");

    return {
        fields,
        meta,
        documentType: types.documentType,
        missing,
        foundCount: wanted.length - missing.length,
        notes,
    };
}