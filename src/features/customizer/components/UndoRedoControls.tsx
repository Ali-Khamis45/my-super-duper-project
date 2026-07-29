"use client";

import { Redo2, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomizerStore } from "@/stores/customizer-store";

export function UndoRedoControls() {
  const historyIndex = useCustomizerStore((state) => state.historyIndex);
  const historyLength = useCustomizerStore((state) => state.history.length);
  const undo = useCustomizerStore((state) => state.undo);
  const redo = useCustomizerStore((state) => state.redo);
  const reset = useCustomizerStore((state) => state.reset);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!canUndo} onClick={undo} />}
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={!canRedo} onClick={redo} />}
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Reset to default" onClick={reset} />}>
          <RotateCcw className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Reset</TooltipContent>
      </Tooltip>
    </div>
  );
}
