class LogicalEvaluation {
    #state = false;
    #onTrue;
    #alternative;
    #default;

    /**
     * 
     * @param {boolean} bool 
     */
    constructor(bool) {
        this.#state = bool;
    }

    /**
     * 
     * @template T
     * @param {T} exp 
     * @returns 
     */
    then(exp) {
        this.#onTrue = exp;
        return this;
    }
    
    /**
     * 
     * @template T
     * @param {boolean} bool 
     * @param {T} exp 
     * @returns 
     */
    elseif(bool, exp) {
        if (bool && !this.#alternative) this.#alternative = exp;
        return this;
    }

    /**
     * 
     * @template T
     * @param {T} exp 
     * @returns 
     */
    else(exp) {
        this.#default = exp;
        return this;
    }

    end() {
        let result;
        if (this.#state) {
            result = this.#onTrue;
        } else {
            result = this.#alternative === undefined ? this.#default : this.#alternative;
        }
        if (typeof result === "function") return result();
        return result;
    }
}

export default LogicalEvaluation;