import type { RegularResult } from "$lib/tests/types";

export type Result = {
    x: number;
    y: number;
    stage: number;
    isCorrect: boolean;
    raw: RegularResult;
};
