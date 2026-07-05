import { DocumentType, OcrResult, StructuredLicenseExtraction } from "./types";

export function parseDriverLicenseText(input: {
  text: string;
  documentType: DocumentType;
  ocrResult?: OcrResult;
  referenceDate?: Date | string;
}): StructuredLicenseExtraction {
  const text = normalizeWhitespace(input.text);
  const fullName = findFullName(text);
  const licenseNumber = findLicenseNumber(text);
  const issuingState = normalizeState(findString(text, ["Issuing State", "State", "Jurisdiction"]));
  const dateOfBirth = normalizeDate(findString(text, ["Date of Birth", "DOB", "Birth Date"]));
  const issueDate = normalizeDate(findString(text, ["Issue Date", "Issued", "ISS"]));
  const expirationDate = normalizeDate(findString(text, ["Expiration Date", "Expires", "EXP"]));
  const address = findString(text, ["Address", "Residence Address", "Street Address"]);
  const licenseClass = findString(text, ["License Class", "Class"]);
  const endorsements = findList(text, ["Endorsements", "Endorsement"]);
  const restrictions = findList(text, ["Restrictions", "Restriction"]);
  const sex = findString(text, ["Sex", "Gender"]);
  const height = findString(text, ["Height", "HGT"]);
  const eyeColor = findString(text, ["Eye Color", "Eyes", "EYE"]);
  const organDonor = findBoolean(text, ["Organ Donor", "Donor"]);
  const veteran = findBoolean(text, ["Veteran"]);
  const realId = findBoolean(text, ["REAL ID", "Real ID", "Real ID Compliant"]) ?? inferRealId(text);
  const under21Until = normalizeDate(findString(text, ["Under 21 Until", "Under 21", "Turns 21"]));
  const referenceDate = toDate(input.referenceDate ?? new Date());
  const ageAtScan = dateOfBirth ? calculateAge(dateOfBirth, referenceDate) : null;
  const isExpired = expirationDate ? isBefore(expirationDate, referenceDate) : false;
  const confidenceScore = findConfidence(text) ?? input.ocrResult?.confidenceScore ?? 0.86;

  return {
    fullName,
    licenseNumber,
    issuingState,
    dateOfBirth,
    issueDate,
    expirationDate,
    address,
    licenseClass,
    endorsements,
    restrictions,
    sex,
    height,
    eyeColor,
    organDonor,
    veteran,
    realId,
    under21Until,
    ageAtScan,
    isExpired,
    confidenceScore,
    warnings: []
  };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function findString(text: string, labels: string[]): string | null {
  const lines = text.split("\n");

  for (const label of labels) {
    const pattern = new RegExp(`^\\s*${escapeRegExp(label)}\\s*(?::|-|\\s{2,})\\s*(.+)$`, "i");

    for (const line of lines) {
      const match = line.match(pattern);

      if (match?.[1]) {
        return cleanupValue(match[1]);
      }
    }
  }

  return null;
}

function findFullName(text: string): string | null {
  const direct = findString(text, ["Full Name", "Name", "Cardholder", "Driver"]);
  if (direct) {
    return direct;
  }

  const firstName = findString(text, ["First Name", "Given Name"]);
  const lastName = findString(text, ["Last Name", "Family Name", "Surname"]);

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return null;
}

function findLicenseNumber(text: string): string | null {
  return (
    findString(text, ["License Number", "DL Number", "Driver License Number", "Document Number", "ID Number"]) ??
    text.match(/\b[A-Z]{1,3}[0-9]{5,12}\b/)?.[0] ??
    null
  );
}

function normalizeState(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.toUpperCase().match(/\b[A-Z]{2}\b/);
  return match?.[0] ?? null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function findList(text: string, labels: string[]): string[] {
  const value = findString(text, labels);
  if (!value || /^(none|n\/a|not applicable)$/i.test(value)) {
    return [];
  }

  return value
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findBoolean(text: string, labels: string[]): boolean | null {
  const value = findString(text, labels);
  if (!value) {
    return null;
  }

  if (/^(yes|y|true|1|present|compliant|star)$/i.test(value)) {
    return true;
  }

  if (/^(no|n|false|0|absent|non-compliant|not compliant|none)$/i.test(value)) {
    return false;
  }

  return null;
}

function inferRealId(text: string): boolean | null {
  if (/\bREAL ID\b/i.test(text) && /\b(star|compliant|yes)\b/i.test(text)) {
    return true;
  }

  return null;
}

function findConfidence(text: string): number | null {
  const match = text.match(/Confidence\s*[:\-]\s*(0?\.\d+|1(?:\.0)?|\d{1,3}%)/i);

  if (!match?.[1]) {
    return null;
  }

  const raw = match[1];
  if (raw.endsWith("%")) {
    return Number(raw.replace("%", "")) / 100;
  }

  return Number(raw);
}

function cleanupValue(value: string): string {
  return value.split("\n")[0].replace(/\s+/g, " ").trim().replace(/[.;]$/, "");
}

function calculateAge(dateOfBirth: string, referenceDate: Date): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  let age = referenceDate.getUTCFullYear() - birthYear;
  const currentMonth = referenceDate.getUTCMonth() + 1;
  const currentDay = referenceDate.getUTCDate();

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }

  return age;
}

function isBefore(dateValue: string, referenceDate: Date): boolean {
  return Date.parse(`${dateValue}T00:00:00.000Z`) < Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
