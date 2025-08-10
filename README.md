# OpenAI GraphQL Worker

这是一个基于 Cloudflare Workers 的 GraphQL 服务，用于代理 OpenAI API 调用。

## 功能特性

- 支持 OpenAI Chat Completions API
- 支持获取可用模型列表
- GraphQL 接口
- CORS 支持
- 错误处理和日志记录

## 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在 Cloudflare Workers 中设置以下环境变量：

- `OPENAI_API_KEY`: 你的 OpenAI API 密钥

### 3. 本地开发

```bash
npm run dev
```

### 4. 部署到 Cloudflare Workers

```bash
npm run deploy
```

## API 使用示例

### 聊天查询

```graphql
query ChatQuery($messages: [MessageInput!]!, $model: String, $maxTokens: Int, $temperature: Float) {
  chat(messages: $messages, model: $model, maxTokens: $maxTokens, temperature: $temperature) {
    id
    model
    choices {
      message {
        role
        content
      }
      finishReason
      index
    }
    usage {
      promptTokens
      completionTokens
      totalTokens
    }
    created
  }
}
```

请求示例：
```json
{
  "query": "query ChatQuery($messages: [MessageInput!]!) { chat(messages: $messages) { id model choices { message { role content } } } }",
  "variables": {
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "model": "gpt-3.5-turbo",
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

### 模型列表查询

```graphql
query ModelsQuery {
  models {
    id
    object
    created
    ownedBy
  }
}
```

## 环境配置

### 开发环境
```bash
wrangler secret put OPENAI_API_KEY --env dev
```

### 生产环境
```bash
wrangler secret put OPENAI_API_KEY --env production
```

## 注意事项

1. 确保你的 OpenAI API 密钥有效且有足够的配额
2. 生产环境建议使用环境变量而不是硬编码密钥
3. 注意 API 调用频率限制
4. 建议在生产环境中添加适当的认证机制

## 故障排除

如果遇到问题，请检查：

1. OpenAI API 密钥是否正确配置
2. 网络连接是否正常
3. API 配额是否充足
4. 请求格式是否正确

## 许可证

MIT
