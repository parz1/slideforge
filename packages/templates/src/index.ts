export interface SlideTemplateDefinition {
  type: string;
  purpose: string;
  slots: Array<"title" | "content" | "visual" | "speakerNotes">;
  constraints: {
    titleMaxChars?: number;
    maxItems?: number;
    visualAllowed?: boolean;
    supportedAnimations: string[];
  };
}

export const teachingTemplate: SlideTemplateDefinition[] = [
  {
    type: "cover",
    purpose: "封面页，展示标题和副标题。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 32,
      visualAllowed: true,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "section",
    purpose: "章节页，提示课程进入新的教学模块。",
    slots: ["title", "speakerNotes"],
    constraints: {
      titleMaxChars: 24,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "bullet_summary",
    purpose: "要点总结页，适合 3-5 条短句。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      maxItems: 5,
      visualAllowed: true,
      supportedAnimations: ["none", "step_reveal"],
    },
  },
  {
    type: "process",
    purpose: "流程页，展示线性步骤。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      maxItems: 6,
      visualAllowed: true,
      supportedAnimations: ["none", "step_reveal"],
    },
  },
  {
    type: "code_explain",
    purpose: "代码讲解页，展示代码和关键解释。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      maxItems: 5,
      visualAllowed: false,
      supportedAnimations: ["none", "highlight_key_points"],
    },
  },
  {
    type: "trace_table",
    purpose: "追踪表页，展示算法或过程的逐步状态。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      maxItems: 8,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "checklist",
    purpose: "练习页或课堂任务页。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      maxItems: 6,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "closing",
    purpose: "结束页，收束本节课的核心结论。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 28,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
];

export const cleanTemplate: SlideTemplateDefinition[] = [
  {
    type: "cover",
    purpose: "通用封面页，展示标题和副标题。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 44,
      visualAllowed: true,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "section",
    purpose: "章节页或分隔页。",
    slots: ["title", "speakerNotes"],
    constraints: {
      titleMaxChars: 32,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "bullet_summary",
    purpose: "通用要点页，适合 3-6 条短句。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 36,
      maxItems: 6,
      visualAllowed: true,
      supportedAnimations: ["none", "step_reveal"],
    },
  },
  {
    type: "two_column",
    purpose: "双栏信息页，用于对比、拆解或并列说明。",
    slots: ["title", "content", "visual", "speakerNotes"],
    constraints: {
      titleMaxChars: 36,
      maxItems: 8,
      visualAllowed: true,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "note_callout",
    purpose: "强调一句关键结论或注意事项。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 36,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
  {
    type: "closing",
    purpose: "结束页，收束核心信息。",
    slots: ["title", "content", "speakerNotes"],
    constraints: {
      titleMaxChars: 36,
      visualAllowed: false,
      supportedAnimations: ["none"],
    },
  },
];

export const builtinTemplates = {
  teaching: teachingTemplate,
  clean: cleanTemplate,
};
