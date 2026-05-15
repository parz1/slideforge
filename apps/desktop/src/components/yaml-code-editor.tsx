import { markdown } from "@codemirror/lang-markdown";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { useEffect, useMemo, useRef } from "react";

interface YamlCodeEditorProps {
  diagnostics?: string[];
  onChange: (value: string) => void;
  readOnly?: boolean;
  value: string;
}

export function YamlCodeEditor({
  diagnostics = [],
  onChange,
  readOnly = false,
  value,
}: YamlCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const diagnosticsRef = useRef(diagnostics);
  const readOnlyRef = useRef(readOnly);

  onChangeRef.current = onChange;
  diagnosticsRef.current = diagnostics;
  readOnlyRef.current = readOnly;

  const extensions = useMemo(
    () => [
      basicSetup,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      lintGutter(),
      linter((): Diagnostic[] =>
        diagnosticsRef.current.map((message) => ({
          from: 0,
          message,
          severity: "error",
          to: 0,
        })),
      ),
      EditorState.readOnly.of(readOnly),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || readOnlyRef.current) {
          return;
        }
        onChangeRef.current(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": {
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontSize: "12px",
          height: "100%",
        },
        ".cm-scroller": {
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          lineHeight: "1.55",
        },
        ".cm-content": {
          minHeight: "100%",
          padding: "12px 14px",
        },
        ".cm-gutters": {
          backgroundColor: "#f8fafc",
          borderRight: "1px solid #e2e8f0",
          color: "#94a3b8",
        },
        ".cm-activeLine": {
          backgroundColor: "#f0fdfa",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#ccfbf1",
          color: "#0f766e",
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: "#99f6e4",
        },
        "&.cm-focused": {
          outline: "2px solid rgba(13, 148, 136, 0.28)",
          outlineOffset: "-2px",
        },
        ".cm-diagnostic": {
          fontSize: "12px",
        },
      }),
    ],
    [readOnly],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const state = EditorState.create({
      doc: value,
      extensions,
    });
    const view = new EditorView({
      parent: containerRef.current,
      state,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const currentValue = view.state.doc.toString();
    if (currentValue === value) {
      return;
    }
    view.dispatch({
      changes: {
        from: 0,
        insert: value,
        to: currentValue.length,
      },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({ effects: [] });
  }, [diagnostics]);

  return <div className="min-h-0 flex-1 overflow-hidden" ref={containerRef} />;
}
