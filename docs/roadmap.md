# Roadmap

## Phase 0: 项目骨架

- Electron + React 桌面壳
- pnpm workspace
- Deck Spec schema
- 示例 deck
- Slidev renderer 最小实现
- 中文文档

## Phase 1: 可跑 MVP

- 支持 source copy / brief 输入
- 生成或编辑 Storyboard
- 从 Storyboard 生成 Deck Spec
- 实现模板约束校验
- 在桌面端编辑大纲和当页结构化内容
- 构建后启动 Slidev 预览
- 显示校验错误和构建日志

## Phase 2: LLM Planner

- OpenAI provider
- 从原始文案生成 Storyboard
- 从 Storyboard 生成 Deck Spec
- 根据 validator 错误修复结构化输出
- prompt 版本管理
- 生成理由和审查状态

## Phase 3: 模板系统

- 增加品牌主题 token
- 增加更多 slide 类型
- 引入布局溢出检测
- 支持 speaker notes
- 支持素材引用和图片占位

## Phase 4: 输出扩展

- Slidev PDF/PPTX 导出封装
- 独立 PPTX renderer 调研
- 可编辑 PPTX 输出
- 批量构建

## Phase 5: 团队化

- 模板包发布
- 品牌主题管理
- 审查流程
- 内容版本对比
- 构建缓存和远程渲染
