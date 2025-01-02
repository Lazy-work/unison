class LogicalEvaluation {
    #state = false;
    #onTrue: any;
    #alternative: any;
    #default: any;
    constructor(bool: boolean) {
        this.#state = bool;
    }

    then<T>(exp: T) {
        this.#onTrue = exp;
        return this;
    }
    elseif<T>(bool: boolean, exp: T) {
        if (bool && !this.#alternative) this.#alternative = exp;
        return this;
    }

    else<T>(exp: T) {
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