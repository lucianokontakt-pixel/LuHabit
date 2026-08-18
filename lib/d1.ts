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
