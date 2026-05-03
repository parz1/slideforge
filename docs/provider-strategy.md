# Provider 策略

Slideforge 的 LLM provider 只负责生成或修改 Deck Spec，不直接生成最终 Slidev。

## Provider 抽象

```ts
interface DeckPlanningProvider {
  name: "openai" | "anthropic" | "ollama";
  planDeck(input: PlanDeckInput): Promise<unknown>;
}
```

第一版只提供接口和占位实现，不读取 API key，不调用真实模型。

## 为什么要抽象

- 允许本地 Ollama 和云模型并存
- 让模型输出统一进入 Deck Spec 校验
- 防止 provider 直接影响 renderer 和模板系统
- 方便后续做成本控制、审计和可复现记录

## 后续计划

- 为每个 provider 增加配置文件
- 支持 structured output
- 保存 prompt、模型名和生成时间
- 将生成结果标记为 `review_status: pending`
