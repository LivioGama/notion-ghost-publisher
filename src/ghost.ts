import GhostAdminAPI from '@tryghost/admin-api';
import { NotionPost } from './notion';

export interface GhostConfig {
  url: string;
  adminKey: string;
  version: string;
}

export async function publishPostsToGhost(config: GhostConfig, posts: NotionPost[]): Promise<void> {
  const ghost = new GhostAdminAPI({
    url: config.url,
    key: config.adminKey,
    version: config.version,
  });

  for (const post of posts) {
    const status = post.status === 'published' ? 'published' : 'draft';

    await ghost.posts.add(
      {
        title: post.title,
        slug: post.slug,
        html: post.markdown, // currently sending markdown as html; can be improved with full markdown→HTML conversion
        status,
      },
      { source: 'html' }
    );

    // In a more advanced version, we could update Notion with the Ghost URL here.
  }
}
