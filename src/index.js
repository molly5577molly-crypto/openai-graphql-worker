// Cloudflare Worker - OpenAI API with GraphQL
export default {
    async fetch(request, env, ctx) {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
  
      // 处理 GET 请求 - 返回 API 信息页面
      if (request.method === 'GET') {
        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenAI GraphQL Worker</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .endpoint {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #2196f3;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .method {
            color: #d32f2f;
            font-weight: bold;
        }
        .url {
            color: #1976d2;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 OpenAI GraphQL Worker</h1>
        <p>基于 Cloudflare Workers 的 OpenAI API GraphQL 代理服务</p>
    </div>

    <div class="section">
        <h2>📡 API 端点</h2>
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/</span>
            <p>GraphQL 查询端点 - 发送 GraphQL 查询和变量</p>
        </div>
    </div>

    <div class="section">
        <h2>🔧 使用方法</h2>
        <h3>聊天查询示例：</h3>
        <pre><code>curl -X POST ${request.url} \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "query ChatQuery($messages: [MessageInput!]!) { chat(messages: $messages) { id model choices { message { role content } } } }",
    "variables": {
      "messages": [{"role": "user", "content": "Hello, how are you?"}],
      "model": "gpt-3.5-turbo",
      "maxTokens": 1024,
      "temperature": 0.7
    }
  }'</code></pre>

        <h3>模型列表查询示例：</h3>
        <pre><code>curl -X POST ${request.url} \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "query ModelsQuery { models { id object created ownedBy } }"
  }'</code></pre>
    </div>

    <div class="section">
        <h2>⚙️ 环境变量</h2>
        <p>确保在 Cloudflare Workers 中设置以下环境变量：</p>
        <ul>
            <li><code>OPENAI_API_KEY</code> - 你的 OpenAI API 密钥</li>
        </ul>
    </div>

    <div class="section">
        <h2>🔒 安全说明</h2>
        <ul>
            <li>此服务仅支持 POST 请求进行 GraphQL 查询</li>
            <li>已启用 CORS 支持跨域请求</li>
            <li>建议在生产环境中添加适当的认证机制</li>
        </ul>
    </div>

    <div class="section">
        <h2>📊 状态</h2>
        <p>✅ 服务运行正常</p>
        <p>🌐 端点: <code>${request.url}</code></p>
        <p>🕒 时间: <code>${new Date().toISOString()}</code></p>
    </div>
</body>
</html>`;
        
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
  
      // 只允许 POST 请求进行 GraphQL 查询
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ 
            error: 'Method not allowed', 
            message: 'Only POST requests are allowed for GraphQL queries',
            allowedMethods: ['POST', 'GET', 'OPTIONS']
          }), 
          { 
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
  
      try {
        // 解析请求体
        const { query, variables, operationName } = await request.json();
  
        if (!query) {
          return new Response(
            JSON.stringify({ 
              errors: [{ message: 'GraphQL query is required' }] 
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }
  
        // 解析 GraphQL 查询，提取 OpenAI API 调用信息
        const result = await handleGraphQLQuery(query, variables, env);
  
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
  
      } catch (error) {
        console.error('Error processing request:', error);
        return new Response(
          JSON.stringify({ 
            errors: [{ message: 'Internal server error', details: error.message }] 
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
    }
  };
  
  // GraphQL Schema 解析和处理
  async function handleGraphQLQuery(query, variables, env) {
    // 简单的 GraphQL 查询解析（实际项目中可以使用 graphql-js 库）
    const queryType = extractQueryType(query);
    
    switch (queryType) {
      case 'chat':
        return await handleChatQuery(query, variables, env);
      case 'models':
        return await handleModelsQuery(env);
      default:
        return {
          errors: [{ message: `Unknown query type: ${queryType}` }]
        };
    }
  }
  
  // 处理聊天查询
  async function handleChatQuery(query, variables, env) {
    try {
      // 检查API密钥
      if (!env.OPENAI_API_KEY) {
        return {
          errors: [{ message: 'OpenAI API key not configured' }]
        };
      }

      // 从 variables 或查询中提取参数
      const messages = variables?.messages || [];
      const model = variables?.model || 'gpt-3.5-turbo';
      const maxTokens = variables?.maxTokens || 1024;
      const temperature = variables?.temperature || 0.7;
  
      if (!messages || messages.length === 0) {
        return {
          errors: [{ message: 'Messages are required for chat query' }]
        };
      }
  
      // 调用 OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }
  
      const data = await response.json();
  
      // 返回 GraphQL 格式的响应
      return {
        data: {
          chat: {
            id: data.id,
            model: data.model,
            choices: data.choices.map(choice => ({
              message: {
                role: choice.message.role,
                content: choice.message.content,
              },
              finishReason: choice.finish_reason,
              index: choice.index,
            })),
            usage: {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            },
            created: data.created,
          }
        }
      };
  
    } catch (error) {
      console.error('Chat query error:', error);
      return {
        errors: [{ 
          message: 'Failed to call OpenAI API', 
          details: error.message 
        }]
      };
    }
  }
  
  // 处理模型列表查询
  async function handleModelsQuery(env) {
    try {
      // 检查API密钥
      if (!env.OPENAI_API_KEY) {
        return {
          errors: [{ message: 'OpenAI API key not configured' }]
        };
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }
  
      const data = await response.json();
  
      return {
        data: {
          models: data.data.map(model => ({
            id: model.id,
            object: model.object,
            created: model.created,
            ownedBy: model.owned_by,
          }))
        }
      };
  
    } catch (error) {
      console.error('Models query error:', error);
      return {
        errors: [{ 
          message: 'Failed to fetch models', 
          details: error.message 
        }]
      };
    }
  }
  
  // 简单的查询类型提取函数
  function extractQueryType(query) {
    const cleanQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
    
    if (cleanQuery.includes('chat') || cleanQuery.includes('completion')) {
      return 'chat';
    } else if (cleanQuery.includes('models')) {
      return 'models';
    }
    
    return 'unknown';
  }