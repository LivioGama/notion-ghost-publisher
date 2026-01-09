import 'dotenv/config';
import { fetchNotionPostsToPublish } from './notion';
import { publishPostsToGhost } from './ghost';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  try {
    const notionToken = requireEnv('NOTION_TOKEN');
    const notionDatabaseId = requireEnv('NOTION_DATABASE_ID');
    const ghostUrl = requireEnv('GHOST_URL');
    const ghostAdminKey = requireEnv('GHOST_ADMIN_KEY');
    const ghostApiVersion = process.env.GHOST_API_VERSION || 'v5.0';

    console.log('Fetching posts from Notion...');
    const posts = await fetchNotionPostsToPublish({
      notionToken,
      databaseId: notionDatabaseId,
    });

    if (posts.length === 0) {
      console.log('No posts with Status = "Ready to Publish" found in Notion.');
      return;
    }

    console.log(`Found ${posts.length} post(s) to publish. Publishing to Ghost...`);

    await publishPostsToGhost(
      {
        url: ghostUrl,
        adminKey: ghostAdminKey,
        version: ghostApiVersion,
      },
      posts
    );

    console.log('Publishing complete.');
  } catch (err) {
    console.error('Error while running Notion → Ghost publisher:');
    console.error(err);
    process.exitCode = 1;
  }
}

void main();
