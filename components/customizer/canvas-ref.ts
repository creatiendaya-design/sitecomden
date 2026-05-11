// components/customizer/canvas-ref.ts
import type Konva from "konva";

let stageRef: Konva.Stage | null = null;

export function setStageRef(stage: Konva.Stage | null) {
  stageRef = stage;
}

export function getStageRef(): Konva.Stage | null {
  return stageRef;
}
