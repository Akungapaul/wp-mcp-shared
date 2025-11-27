import { zodToJsonSchema } from 'zod-to-json-schema';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import logger from './logger.js';

/**
 * Convert Zod schema to clean JSON Schema (without $schema field)
 * This reduces token usage in AI context windows
 */
export function convertSchema(zodSchema) {
  const { $schema, ...schema } = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7'
  });
  return schema;
}

/**
 * Create a standard MCP server with tool handling
 */
export function createMcpServer(name, version, tools) {
  const server = new Server(
    { name, version },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools with clean JSON Schema
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: convertSchema(tool.inputSchema)
      }))
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`);

    try {
      const tool = tools.find(t => t.name === name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Validate and parse arguments using Zod schema
      const validatedArgs = tool.inputSchema.parse(args || {});

      // Execute tool handler
      const result = await tool.handler(validatedArgs);

      return result;
    } catch (error) {
      logger.error(`Tool execution failed for ${name}:`, error);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: name
          }, null, 2)
        }],
        isError: true
      };
    }
  });

  return server;
}

/**
 * Start MCP server with stdio transport
 */
export async function startServer(server) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP Server started');
}
