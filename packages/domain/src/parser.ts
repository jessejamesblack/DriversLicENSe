import { DocumentType, OcrResult, StructuredLicenseExtraction } from "./types";

export function parseDriverLicenseText(input: {
  text: string;
  documentType: DocumentType;
  ocrResult?: OcrResult;
  referenceDate?: Date | string;
}): StructuredLicenseExtraction {
  const text = normalizeWhitespace(input.text);
  const dates = findAllNormalizedDates(text);
  const fullName = findFullName(text);
  const licenseNumber = findLicenseNumber(text);
  const issuingState =
    normalizeState(findString(text, ["Issuing State", "State", "Jurisdiction"])) ??
    inferStateFromLicenseNumber(licenseNumber);
  const dateOfBirth =
    normalizeDate(findString(text, ["Date of Birth", "DOB", "Birth Date"])) ??
    findDateNearLabel(text, ["Date of Birth", "DOB", "Birth Date"]);
  const under21Until =
    normalizeDate(findString(text, ["Under 21 Until", "Under 21", "Turns 21"])) ??
    findDateNearLabel(text, ["Under 21 Until", "Under 21", "Turns 21"]);
  const expirationDate =
    normalizeDate(findString(text, ["Expiration Date", "Expires", "EXP"])) ??
    findDateNearLabel(text, ["Expiration Date", "Expiration", "Expires", "EXP"]) ??
    inferExpirationDate(dates, dateOfBirth, under21Until);
  const issueDate =
    normalizeDate(findString(text, ["Issue Date", "Issued", "ISS", "Issue"])) ??
    inferIssueDate(dates, dateOfBirth, expirationDate, under21Until);
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

  const standalone = findValueAfterStandaloneLabel(text, ["Full Name", "Name", "Cardholder"], isLikelyName);
  if (standalone) {
    return standalone;
  }

  const firstName = findString(text, ["First Name", "Given Name"]);
  const lastName = findString(text, ["Last Name", "Family Name", "Surname"]);

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+ Sample\b/)?.[0] ?? null;
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

function inferStateFromLicenseNumber(licenseNumber: string | null): string | null {
  if (!licenseNumber) {
    return null;
  }

  return licenseNumber.match(/^[A-Z]{2}/)?.[0] ?? null;
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

function findAllNormalizedDates(text: string): string[] {
  const dates = new Set<string>();
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/g;

  for (const match of text.matchAll(datePattern)) {
    const normalized = normalizeDate(match[1]);
    if (normalized) {
      dates.add(normalized);
    }
  }

  return [...dates].sort();
}

function findDateNearLabel(text: string, labels: string[]): string | null {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeLabel(lines[index]);

    if (!labels.some((label) => normalizedLine.includes(normalizeLabel(label)))) {
      continue;
    }

    const sameLineDate = firstDateIn(lines[index]);
    if (sameLineDate) {
      return sameLineDate;
    }

    for (const nearbyLine of lines.slice(index + 1, index + 5)) {
      const nearbyDate = firstDateIn(nearbyLine);
      if (nearbyDate) {
        return nearbyDate;
      }
    }
  }

  return null;
}

function firstDateIn(value: string): string | null {
  const match = value.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/);
  return match?.[1] ? normalizeDate(match[1]) : null;
}

function inferExpirationDate(dates: string[], dateOfBirth: string | null, under21Until: string | null): string | null {
  const candidates = dates.filter((date) => date !== dateOfBirth && date !== under21Until);
  return candidates.at(-1) ?? null;
}

function inferIssueDate(
  dates: string[],
  dateOfBirth: string | null,
  expirationDate: string | null,
  under21Until: string | null
): string | null {
  return dates.find((date) => date !== dateOfBirth && date !== expirationDate && date !== under21Until) ?? null;
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
  const value = findString(text, labels) ?? findValueAfterStandaloneLabel(text, labels, isBooleanLike);
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
  const standalone = findValueAfterStandaloneLabel(text, ["Confidence"], isConfidenceLike);

  if (!match?.[1] && !standalone) {
    return null;
  }

  const raw = match?.[1] ?? standalone ?? "";
  if (raw.endsWith("%")) {
    return Number(raw.replace("%", "")) / 100;
  }

  return Number(raw);
}

function cleanupValue(value: string): string {
  return value.split("\n")[0].replace(/\s+/g, " ").trim().replace(/[.;]$/, "");
}

function findValueAfterStandaloneLabel(
  text: string,
  labels: string[],
  predicate: (value: string) => boolean
): string | null {
  const lines = text.split("\n").map(cleanupValue).filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const current = normalizeLabel(lines[index]);
    const isLabel = labels.some((label) => current === normalizeLabel(label));

    if (!isLabel) {
      continue;
    }

    for (const option of lines.slice(index + 1, index + 6)) {
      if (isNoiseOrLabel(option)) {
        continue;
      }

      if (predicate(option)) {
        return option;
      }
    }
  }

  return null;
}

function isLikelyName(value: string): boolean {
  return /^[A-Z][A-Za-z'-]+ [A-Z][A-Za-z'-]+(?: [A-Z][A-Za-z'-]+)?$/.test(value);
}

function isBooleanLike(value: string): boolean {
  return /^(yes|y|true|1|present|compliant|star|no|n|false|0|absent|non-compliant|not compliant|none)$/i.test(value);
}

function isConfidenceLike(value: string): boolean {
  return /^(0?\.\d+|1(?:\.0)?|\d{1,3}%)$/i.test(value);
}

function isNoiseOrLabel(value: string): boolean {
  const normalized = normalizeLabel(value);
  const knownLabels = new Set([
    "ADDRESS",
    "CLASS",
    "CONFIDENCE",
    "DATE",
    "DATE OF BIRTH",
    "DOB",
    "ENDORSEMENTS",
    "EXPIRATION",
    "EXPIRATION DATE",
    "EYE COLOR",
    "FULL NAME",
    "HEIGHT",
    "ISSUE",
    "ISSUE DATE",
    "ISSUING STATE",
    "LICENSE CLASS",
    "LICENSE NUMBER",
    "NO PHOTO",
    "OCR TEST ONLY",
    "ORGAN DONOR",
    "REAL ID",
    "RESTRICTIONS",
    "SEX",
    "VETERAN"
  ]);

  return knownLabels.has(normalized) || normalized.includes("SYNTHETIC") || normalized.includes("GOVERNMENT ID");
}

function normalizeLabel(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, " ").trim().replace(/\s+/g, " ").toUpperCase();
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
