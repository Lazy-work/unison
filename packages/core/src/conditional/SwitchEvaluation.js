
/**
 * @template T
 */
class SwitchEvaluation{
    /**
     * @type {T}
     */
    #input;
    #result;

    /**
     * 
     * @param {T} input 
     */
    constructor(input) {
        this.#input = input;
    }
    
    /**
     * 
     * @param  {CaseParams<T>[]} args 
     * @returns 
     */
    case(...args) {
        const patterns = args.slice(0, -1);
        const expression = args.at(-1);
        if (this.#result !== undefined) return this;
        if (patterns.length === 1 && typeof patterns[0] === 'boolean') {
            if (patterns[0]) this.#result = expression;
            return this;
        } else {
            for (const pattern of patterns) {
                if (typeof pattern !== 'object' || pattern === null) {
                    if (this.#input === pattern) {
                        this.#result = expression;
                        break;
                    }
                } else if (
                    typeof this.#input === 'object' &&
                    this.#input !== null &&
                    this.#matchPattern(this.#input, pattern)
                ) {
                    this.#result = expression;
                    break;
                }
            }
        }
        return this;
    }

    #matchPattern(input, pattern) {
        if (typeof input !== 'object' || input === null) return false;
        for (const [key, value] of Object.entries(pattern)) {
            const hasKey = key in input;
            if (!hasKey) return false;
            if (typeof value === 'object' && value !== null) {
                if (typeof input[key] !== 'object' || input[key] === null) return false;
                if (!this.#matchPattern(input[key], value)) return false;
            } else if (input[key] !== value) {
                return false;
            }
        }

        return true;
    }

    /**
     * 
     * @param {any} [expression] 
     * @returns 
     */
    default(expression) {
        let result = this.#result === undefined ? expression : this.#result;
        if (typeof result === "function") return result(this.#input);
        return result;
    }
}

export default SwitchEvaluation;