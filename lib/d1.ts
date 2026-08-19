const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

type D1QueryResult<T> = {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
};

type D1ApiResponse<T> = {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: { code: number; message: string }[];
};

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Cloudflare D1 ist nicht konfiguriert. Setze CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID und CLOUDFLARE_API_TOKEN in .env.local"
    );
  }

  return { accountId, databaseId, apiToken };
}

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const { accountId, databaseId, apiToken } = getConfig();

  const res = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    }
  );

  const data = (await res.json()) as D1ApiResponse<T>;

  if (!res.ok || !data.success) {
    const message = data.errors?.map((e) => e.message).join(", ") || res.statusText;
    throw new Error(`D1 query failed: ${message}`);
  }

  return data.result[0]?.results ?? [];
}

/**
 * D1 erlaubt rund 100 gebundene Parameter pro Statement. Größere Einfügungen
 * werden deshalb in Blöcke zerlegt statt Werte in den SQL-String zu schreiben.
 */
const MAX_BOUND_PARAMS = 90;

export async function d1InsertMany(
  table: string,
  columns: string[],
  rows: (string | number | null)[][]
): Promise<void> {
  if (rows.length === 0) return;

  const perRow = columns.length;
  const rowsPerChunk = Math.max(1, Math.floor(MAX_BOUND_PARAMS / perRow));
  const placeholder = `(${columns.map(() => "?").join(", ")})`;

  for (let i = 0; i < rows.length; i += rowsPerChunk) {
    const chunk = rows.slice(i, i + rowsPerChunk);
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${chunk
      .map(() => placeholder)
      .join(", ")}`;
    await d1Query(sql, chunk.flat());
  }
}
