# 模板系统

模板是 Slideforge 的控制层。它决定页面结构、内容密度、动画策略和品牌一致性。

## 模板负责什么

- 布局：封面、两列、流程、对比、结尾
- 内容约束：标题长度、项目数量、每条字数
- 动画 preset：逐条出现、关键词强调、无动画
- 品牌样式：字体、颜色、间距、logo、页脚
- 输出策略：Slidev renderer 和未来 PPTX renderer

## 模板不负责什么

- 不生成业务文案
- 不决定用户意图
- 不绕过 schema 校验

## 动画抽象

普通用户不应该写 `v-click` 或 `v-motion`。第一版只暴露：

- `none`
- `step_reveal`
- `highlight_key_points`

Renderer 再把这些 preset 转换成 Slidev 语法。

## 内容约束

模板应该定义明确约束，例如：

```yaml
type: bullet_summary
titleMaxChars: 28
maxItems: 5
supportedAnimations:
  - none
  - step_reveal
```

后续 validator 应根据模板约束自动报告过长、过密或不支持的组合。
