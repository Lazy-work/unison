import LogicalEvaluation from "./LogicalEvaluation";
import MatchingEvaluation from "./SwitchEvaluation";

export function $if(bool: boolean) {
    return new LogicalEvaluation(bool);
}

export function $switch<T>(input: T) {
    return new MatchingEvaluation(input);
}

export function v<T>(value: T) {
    return { value };
}

export type { LogicalEvaluation, MatchingEvaluation };