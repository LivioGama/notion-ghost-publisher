import { fetchNotionPostsToPublish } from '../src/notion';
import { publishPostsToGhost } from '../src/ghost';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const secret = process.env.PUBLISH_SECRET;
    if (secret) {
      const headerSecret =
        (req.headers['x-publish-secret'] as string | undefined) ||
        (req.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '');

      if (!headerSecret || headerSecret !== secret) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    const notionToken = requireEnv('NOTION_TOKEN');
    const notionDatabaseId = requireEnv('NOTION_DATABASE_ID');
    const ghostUrl = requireEnv('GHOST_URL');
    const ghostAdminKey = requireEnv('GHOST_ADMIN_KEY');
    const ghostApiVersion = process.env.GHOST_API_VERSION || 'v5.0';

    const posts = await fetchNotionPostsToPublish({
      notionToken,
      databaseId: notionDatabaseId,
    });

    if (posts.length === 0) {
      res.status(200).json({ message: 'No posts with Status = "Ready to Publish" found in Notion.' });
      return;
    }

    await publishPostsToGhost(
      {
        url: ghostUrl,
        adminKey: ghostAdminKey,
        version: ghostApiVersion,
      },
      posts
    );

    res.status(200).json({ message: 'Publishing complete', count: posts.length });
  } catch (err: any) {
    console.error('Error in Notion → Ghost Vercel handler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err?.message ?? String(err) });
  }
}
