import { NotionPost } from './notion';
import * as crypto from 'crypto';

export interface GhostConfig {
  url: string;
  adminKey: string;
  version: string;
}

function generateGhostJWT(apiKey: string): string {
  const [id, secret] = apiKey.split(':');
  const now = Math.floor(Date.now() / 1000);
  
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: now,
    exp: now + 300,
    aud: '/admin/'
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');
  
  return `${header}.${payload}.${signature}`;
}

export async function publishPostsToGhost(config: GhostConfig, posts: NotionPost[]): Promise<void> {
  const token = generateGhostJWT(config.adminKey);
  const apiUrl = `${config.url}/ghost/api/admin/posts/`;

  for (const post of posts) {
    const status = post.status === 'published' ? 'published' : 'draft';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Ghost ${token}`,
      },
      body: JSON.stringify({
        posts: [
          {
            title: post.title,
            slug: post.slug,
            html: post.markdown,
            status,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ghost API error: ${response.status} ${errorText}`);
    }
  }
}
