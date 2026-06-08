export type PaginationInput = {
  page?: unknown;
  limit?: unknown;
};

export type PaginationResult = {
  page: number;
  limit: number;
  offset: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return parsePositiveInteger(value[0]);
  }

  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return NaN;
  }

  return num;
}

export function parsePagination(input: PaginationInput): PaginationResult {
  const pageParsed = parsePositiveInteger(input.page);
  const limitParsed = parsePositiveInteger(input.limit);

  if (Number.isNaN(pageParsed)) {
    throw new Error("Invalid page. page must be a positive integer.");
  }

  if (Number.isNaN(limitParsed)) {
    throw new Error("Invalid limit. limit must be a positive integer.");
  }

  const page = pageParsed ?? DEFAULT_PAGE;
  const limit = Math.min(limitParsed ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
