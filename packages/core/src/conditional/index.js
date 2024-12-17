import LogicalEvaluation from "./LogicalEvaluation";
import MatchingEvaluation from "./SwitchEvaluation";

/**
 * 
 * @param {boolean} bool 
 * @returns 
 */
export function $if(bool) {
    return new LogicalEvaluation(bool);
}

/**
 * 
 * @template T
 * @param {T} input 
 * @returns 
 */
export function $switch(input) {
    return new MatchingEvaluation(input);
}

/**
 * 
 * @template T
 * @param {T} value 
 * @returns 
 */
export function v(value) {
    return { value };
}