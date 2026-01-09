import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export interface NotionPost {
  pageId: string;
  title: string;
  slug: string;
  markdown: string;
  status: 'draft' | 'published';
}

export interface NotionConfig {
  notionToken: string;
  databaseId: string;
}

const STATUS_PROPERTY_NAME = 'Status';
const TITLE_PROPERTY_NAME = 'Name';
const SLUG_PROPERTY_NAME = 'Slug';

export async function fetchNotionPostsToPublish(config: NotionConfig): Promise<NotionPost[]> {
  const notion = new Client({ auth: config.notionToken });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  // NOTE: Newer Notion SDKs expose database querying differently; for simplicity,
  // we use the search API scoped to the workspace and filter by database/page id
  // client-side. You may want to replace this with a direct database query helper
  // if available in your SDK version.
  const search = await notion.search({
    filter: {
      value: 'page',
      property: 'object',
    },
    page_size: 100,
  } as any);

  const results: NotionPost[] = [];

  for (const page of search.results) {
    if (!('id' in page)) continue;

    const pageId = page.id;

    // Only consider pages that belong to the configured database, if present
    const parent: any = (page as any).parent;
    if (parent && parent.type === 'database_id' && parent.database_id !== config.databaseId) {
      continue;
    }

    const properties: any = (page as any).properties ?? {};

    const titleProp = properties[TITLE_PROPERTY_NAME];
    const title =
      titleProp && titleProp.title && titleProp.title.length > 0
        ? titleProp.title.map((t: any) => t.plain_text).join('')
        : 'Untitled';

    const slugProp = properties[SLUG_PROPERTY_NAME];
    const slugText =
      slugProp && slugProp.rich_text && slugProp.rich_text.length > 0
        ? slugProp.rich_text.map((t: any) => t.plain_text).join('')
        : undefined;
    const slug = slugText && slugText.trim().length > 0 ? slugText.trim() : slugify(title);

    const status: 'draft' | 'published' = 'draft';

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks);
    const markdown = Array.isArray(mdString) ? mdString.map((b) => b.parent).join('\n') : mdString.parent;

    results.push({ pageId, title, slug, markdown, status });
  }

  return results;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'post';
}
