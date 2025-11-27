# @akungapaul/wp-mcp-shared

Shared utilities for WordPress MCP (Model Context Protocol) servers.

## Installation

```bash
npm install @akungapaul/wp-mcp-shared
```

For GitHub Packages, add to your `.npmrc`:
```
@akungapaul:registry=https://npm.pkg.github.com
```

## Modules

### Clients

#### WordPressRestClient
HTTP client for WordPress REST API with built-in caching and authentication.

```javascript
import { WordPressRestClient } from '@akungapaul/wp-mcp-shared';

const client = new WordPressRestClient({
  url: 'https://your-site.com',
  username: 'your-username',
  appPassword: 'your-app-password'
});

// Posts
const posts = await client.getPosts({ per_page: 10 });
const post = await client.createPost({ title: 'New Post', content: 'Content' });

// Media
const media = await client.getMedia();

// Categories & Tags
const categories = await client.getCategories();
```

#### WPCLIClient
Execute WP-CLI commands locally or via SSH.

```javascript
import { WPCLIClient } from '@akungapaul/wp-mcp-shared';

const cli = new WPCLIClient({
  enabled: true,
  wpCliPath: '/usr/local/bin/wp',
  wordPressPath: '/var/www/html',
  // SSH options (optional)
  sshHost: 'server.com',
  sshUser: 'user',
  sshKeyPath: '~/.ssh/id_rsa'
});

await cli.cacheFlush();
await cli.installPlugin('akismet', true);
await cli.dbOptimize();
```

### Utilities

#### Schema Utilities
Convert Zod schemas to clean JSON Schema for MCP tools.

```javascript
import { convertSchema, createMcpServer, startServer } from '@akungapaul/wp-mcp-shared';
import { z } from 'zod';

// Convert individual schema
const jsonSchema = convertSchema(z.object({
  title: z.string(),
  content: z.string().optional()
}));

// Create full MCP server
const tools = [
  {
    name: 'create_post',
    description: 'Create a WordPress post',
    inputSchema: z.object({ title: z.string() }),
    handler: async (args) => { /* ... */ }
  }
];

const server = createMcpServer('my-mcp', '1.0.0', tools);
await startServer(server);
```

#### Logger
Winston-based structured logging.

```javascript
import { logger } from '@akungapaul/wp-mcp-shared';

logger.info('Message');
logger.error('Error', { details: 'context' });
logger.debug('Debug info');
```

#### Cache
In-memory caching with TTL support.

```javascript
import { cache } from '@akungapaul/wp-mcp-shared';

cache.set('key', value, 300); // 5 minute TTL
const data = cache.get('key');
cache.invalidatePattern('posts');
cache.flush();
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORDPRESS_URL` | WordPress site URL | - |
| `WORDPRESS_USERNAME` | WordPress username | - |
| `WORDPRESS_APP_PASSWORD` | Application password | - |
| `ENABLE_WP_CLI` | Enable WP-CLI client | `false` |
| `WP_CLI_PATH` | Path to wp-cli | `wp` |
| `WORDPRESS_PATH` | WordPress installation path | `.` |
| `SSH_HOST` | SSH host for remote WP-CLI | - |
| `SSH_PORT` | SSH port | `22` |
| `SSH_USER` | SSH username | - |
| `SSH_KEY_PATH` | SSH private key path | - |
| `CACHE_ENABLED` | Enable response caching | `true` |
| `CACHE_TTL` | Cache TTL in seconds | `300` |
| `LOG_LEVEL` | Logging level | `info` |

## Related Packages

This package is used by:
- `wp-content-mcp` - Posts and pages management
- `wp-media-mcp` - Media library management
- `wp-taxonomy-mcp` - Categories and tags
- `wp-themes-mcp` - Theme management
- `wp-menus-mcp` - Navigation menus
- `wp-design-mcp` - Custom CSS and colors
- `wp-plugins-mcp` - Plugin management
- `wp-settings-mcp` - Site settings
- `wp-blocks-mcp` - Block patterns and reusable blocks
- `wp-seo-mcp` - SEO and meta tags
- `wp-advanced-mcp` - Database and advanced operations

## License

MIT
