export const BONGGING_CERTIFICATION_PATH = '/bongging/certifications';

export type BonggingLocationSource = 'exif' | 'device' | 'none';

export type BonggingCertificationFields = {
  imageUri: string;
  fileName: string;
  mimeType: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: BonggingLocationSource;
  capturedAt: string;
};

export type BonggingSubmission = {
  form: FormData;
  fields: BonggingCertificationFields;
};

type CreateBonggingSubmissionInput = {
  imageUri: string;
  fileName?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: BonggingLocationSource;
  capturedAt?: string;
};

type ImageFilePart = {
  uri: string;
  name: string;
  type: string;
};

export function readGpsFromExif(exif: unknown): { latitude: number; longitude: number } | null {
  const record = asRecord(exif);
  if (!record) {
    return null;
  }

  const nested = asRecord(record['{GPS}']) ?? asRecord(record.GPS);
  return coordinatesFrom(nested) ?? coordinatesFrom(record);
}

function coordinatesFrom(source: Record<string, unknown> | null): { latitude: number; longitude: number } | null {
  if (!source) {
    return null;
  }
  const latitude = toCoordinate(source.GPSLatitude ?? source.Latitude, source.GPSLatitudeRef ?? source.LatitudeRef);
  const longitude = toCoordinate(source.GPSLongitude ?? source.Longitude, source.GPSLongitudeRef ?? source.LongitudeRef);
  if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
}

export function createBonggingSubmission(input: CreateBonggingSubmissionInput): BonggingSubmission {
  const file = imageFilePart(input.imageUri, input.fileName);
  const fields: BonggingCertificationFields = {
    imageUri: input.imageUri,
    fileName: file.name,
    mimeType: file.type,
    latitude: input.latitude,
    longitude: input.longitude,
    locationSource: input.locationSource,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
  const form = new FormData();
  form.append('image', file as unknown as Blob);
  form.append('capturedAt', fields.capturedAt);
  form.append('locationSource', fields.locationSource);
  if (fields.latitude != null && fields.longitude != null) {
    form.append('latitude', String(fields.latitude));
    form.append('longitude', String(fields.longitude));
  }

  return { form, fields };
}

export function submitBonggingCertification(submission: BonggingSubmission): Promise<{ ok: true; mode: 'local' }> {
  if (__DEV__) {
    console.log('[bongging] certification', {
      path: BONGGING_CERTIFICATION_PATH,
      latitude: submission.fields.latitude,
      longitude: submission.fields.longitude,
      locationSource: submission.fields.locationSource,
      capturedAt: submission.fields.capturedAt,
      image: submission.fields.fileName,
    });
  }

  return Promise.resolve({ ok: true, mode: 'local' });
}

function imageFilePart(uri: string, fileName?: string | null): ImageFilePart {
  const fallbackName = fileNameFromUri(uri) ?? 'bongging.jpg';
  const name = fileName?.includes('.') ? fileName : fallbackName;
  const extension = name.split('.').pop()?.toLowerCase();
  const type = extension === 'png' ? 'image/png' : extension === 'heic' || extension === 'heif' ? 'image/heic' : 'image/jpeg';
  return { uri, name, type };
}

function fileNameFromUri(uri: string): string | null {
  const name = uri.split('?')[0]?.split('/').pop();
  return name?.includes('.') ? name : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toCoordinate(value: unknown, ref: unknown): number | null {
  const decimal = toDecimal(value);
  if (decimal == null || Number.isNaN(decimal)) {
    return null;
  }
  return applyHemisphere(decimal, ref);
}

function toDecimal(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value.includes(',') ? fromRationalList(value.split(',')) : fromRational(value);
  }
  if (Array.isArray(value)) {
    return fromParts(value);
  }
  return null;
}

function fromRationalList(parts: string[]): number | null {
  return fromParts(parts.map((part) => fromRational(part.trim())));
}

function fromParts(parts: unknown[]): number | null {
  const [degrees, minutes = 0, seconds = 0] = parts;
  if (typeof degrees !== 'number' || typeof minutes !== 'number' || typeof seconds !== 'number') {
    return null;
  }
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
}

function fromRational(value: string): number | null {
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map((part) => Number(part));
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyHemisphere(value: number, ref: unknown): number {
  if (typeof ref !== 'string') {
    return value;
  }
  const direction = ref.toUpperCase();
  const absolute = Math.abs(value);
  if (direction === 'S' || direction === 'W') {
    return -absolute;
  }
  if (direction === 'N' || direction === 'E') {
    return absolute;
  }
  return value;
}
