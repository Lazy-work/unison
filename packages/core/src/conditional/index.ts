import IfEvaluation from "./IfEvaluation";
import MatchingEvaluation from "./MatchEvaluation";

export function $if(bool: boolean) {
    return new IfEvaluation(bool);
}

export function $match<T>(input: T) {
    return new MatchingEvaluation(input);
}

export function v<T>(value: T) {
    return { value };
}

export type { IfEvaluation, MatchingEvaluation };