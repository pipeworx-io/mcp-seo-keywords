interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * SEO Keywords MCP — search volume & difficulty via DataForSEO Labs (dataforseo.com)
 *
 * Tools:
 * - seo_keyword_overview: monthly search volume, keyword difficulty, CPC, competition.
 *
 * Uses DataForSEO Labs keyword_overview (the cheap volume source that also bundles
 * keyword_difficulty) — NOT the 7x-pricier Google Ads search_volume endpoint, which
 * lives in its own pack so pack-level metering stays homogeneous.
 *
 * Auth: DataForSEO HTTP Basic. Pass _apiKey = base64("login:password").
 * Wave 1 = BYO-key only. Wave 2 adds a measured `cost` CostModel + realCogs flag.
 */


const BASE_URL = 'https://api.dataforseo.com';

const tools: McpToolExport['tools'] = [
  {
    name: 'seo_keyword_overview',
    description:
      'Monthly search volume & difficulty for `<keyword>` — returns Google search volume, keyword difficulty (0-100), CPC, and competition for up to 10 keywords at once. Keyword research for SEO. Example: seo_keyword_overview({ keywords: ["running shoes", "trail shoes"], location_code: 2840, _apiKey: "your-base64-key" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to look up (max 10), e.g. ["running shoes", "trail shoes"]',
        },
        location_code: {
          type: 'integer',
          description: 'DataForSEO location code (default 2840 = United States)',
        },
        language_code: {
          type: 'string',
          description: 'Two-letter language code (default "en")',
        },
        _apiKey: {
          type: 'string',
          description: 'DataForSEO API key = base64("login:password") from your dataforseo.com account',
        },
      },
      required: ['keywords', '_apiKey'],
    },
  },
];

async function dfsPost(path: string, body: unknown, apiKey: string, tool: string) {
  if (!apiKey) {
    throw new Error(
      `${tool} requires a DataForSEO API key. Pass _apiKey = base64("login:password") from your DataForSEO account (sign up at dataforseo.com). This is a paid data source — bring your own key, or add credits at https://pipeworx.io/account.`,
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `DataForSEO auth failed (HTTP ${res.status}). Check _apiKey is base64("login:password") and your account is funded/verified (data endpoints return 40104 until the account is funded). Re-encode credentials and retry.`,
    );
  }
  if (!res.ok) throw new Error(`DataForSEO ${tool} error: HTTP ${res.status}`);
  const data = (await res.json()) as DfsResponse;
  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO ${tool}: ${data.status_code} ${data.status_message}`);
  }
  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO ${tool}: ${task?.status_code ?? 'no task'} ${task?.status_message ?? ''}`.trim());
  }
  return task;
}

interface DfsResponse {
  status_code: number;
  status_message: string;
  tasks?: Array<{
    status_code: number;
    status_message: string;
    cost: number;
    result?: Array<Record<string, unknown>> | null;
  }>;
}

async function keywordOverview(args: Record<string, unknown>, apiKey: string) {
  const keywords = args.keywords as string[];
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('seo_keyword_overview requires a non-empty `keywords` array, e.g. ["running shoes", "trail shoes"].');
  }
  if (keywords.length > 10) {
    throw new Error(`seo_keyword_overview accepts at most 10 keywords per call (got ${keywords.length}). Split into batches.`);
  }
  const location_code = (args.location_code as number) ?? 2840;
  const language_code = (args.language_code as string) ?? 'en';

  const task = await dfsPost(
    '/v3/dataforseo_labs/google/keyword_overview/live',
    [{ keywords, location_code, language_code }],
    apiKey,
    'seo_keyword_overview',
  );

  const result = (task.result?.[0] ?? {}) as { items?: Array<Record<string, unknown>> };
  const items = (result.items ?? []).map((it) => {
    const ki = (it.keyword_info ?? {}) as Record<string, unknown>;
    const kp = (it.keyword_properties ?? {}) as Record<string, unknown>;
    return {
      keyword: it.keyword as string,
      search_volume: (ki.search_volume as number) ?? null,
      keyword_difficulty: (kp.keyword_difficulty as number) ?? null,
      cpc: (ki.cpc as number) ?? null,
      competition: (ki.competition as number) ?? null,
    };
  });

  return { location_code, language_code, keywords: items };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  switch (name) {
    case 'seo_keyword_overview':
      return keywordOverview(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Wave 1 (BYO-only): nominal access meter; user's own key bears DataForSEO COGS.
// Wave 2: replace with measured `cost` CostModel (10 keywords) + realCogs gate.
export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
