// Cloudflare Worker - OpenAI API with GraphQL
export default {
    async fetch(request, env, ctx) {
      // 通用 CORS 头部
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24小时缓存预检请求
      };

      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: corsHeaders,
        });
      }
  
      // 只允许 POST 请求
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders,
        });
      }
  
      try {
        // 解析请求体
        const requestBody = await request.json();
        const { query, variables, operationName } = requestBody;
  
        // 如果没有GraphQL查询，可能是简单的聊天请求
        if (!query) {
          // 检查是否是简单的聊天请求格式
          if (requestBody.prompt || requestBody.message || requestBody.input) {
            const userMessage = requestBody.prompt || requestBody.message || requestBody.input;
            
            // 临时测试响应（不调用OpenAI API）
            if (userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('测试')) {
              return new Response(JSON.stringify({
                message: `✅ 测试成功！收到您的消息: "${userMessage}". Worker和前端连接正常，CORS配置有效。现在需要配置OpenAI API密钥。`
              }), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                }
              });
            }
            
            // 转换为GraphQL格式处理
            const simpleVariables = {
              messages: [{ role: "user", content: userMessage }],
              model: "gpt-4o-mini",
              maxTokens: 1024,
              temperature: 0.7
            };
            const result = await handleChatQuery('', simpleVariables, env);
            
            // 如果是简单请求，返回简化格式
            if (result.data?.chat?.choices?.[0]?.message?.content) {
              return new Response(JSON.stringify({
                message: result.data.chat.choices[0].message.content
              }), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                  ...corsHeaders,
                }
              });
            } else if (result.errors) {
              return new Response(JSON.stringify({
                error: result.errors.map(e => e.message).join(', ')
              }), {
                status: 500,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                  ...corsHeaders,
                }
              });
            }
          }
          
          return new Response(
            JSON.stringify({ 
              errors: [{ message: 'GraphQL query or simple message is required' }] 
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
                ...corsHeaders,
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
            ...corsHeaders,
            ...corsHeaders,
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
              ...corsHeaders,
              ...corsHeaders,
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
        console.error('OPENAI_API_KEY environment variable is not set');
        console.error('OPENAI_API_KEY environment variable is not set');
        return {
          errors: [{ message: 'OpenAI API key not configured' }]
        };
      }

      // 检查API密钥格式
      if (!env.OPENAI_API_KEY.startsWith('sk-')) {
        console.error('Invalid OpenAI API key format:', env.OPENAI_API_KEY.substring(0, 10) + '...');
        return {
          errors: [{ message: 'Invalid OpenAI API key format' }]
        };
      }

      console.log('API Key configured, length:', env.OPENAI_API_KEY.length);

      // 检查API密钥格式
      if (!env.OPENAI_API_KEY.startsWith('sk-')) {
        console.error('Invalid OpenAI API key format:', env.OPENAI_API_KEY.substring(0, 10) + '...');
        return {
          errors: [{ message: 'Invalid OpenAI API key format' }]
        };
      }

      console.log('API Key configured, length:', env.OPENAI_API_KEY.length);

      // 从 variables 或查询中提取参数
      const messages = variables?.messages || [];
      const model = variables?.model || 'gpt-4o-mini';
      const maxTokens = variables?.maxTokens || 1024;
      const temperature = variables?.temperature || 0.7;
  
      if (!messages || messages.length === 0) {
        return {
          errors: [{ message: 'Messages are required for chat query' }]
        };
      }
  
      // 构建请求体
      const requestBody = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false,
      };

      console.log('Calling OpenAI API with:', JSON.stringify(requestBody, null, 2));


      // 调用 OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });
  
      console.log('OpenAI API response status:', response.status);
      console.log('OpenAI API response headers:', Object.fromEntries(response.headers.entries()));


      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error response:', errorData);
        console.error('OpenAI API error response:', errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }
  
      const data = await response.json();
      
      console.log('OpenAI API 完整响应:', JSON.stringify(data, null, 2));
      
      console.log('OpenAI API 完整响应:', JSON.stringify(data, null, 2));
  
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
              promptTokens: data.usage?.prompt_tokens || 0,
              completionTokens: data.usage?.completion_tokens || 0,
              totalTokens: data.usage?.total_tokens || 0,
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