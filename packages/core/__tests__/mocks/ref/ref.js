import { activeSub, shouldTrack, ReactiveEffect } from '#vue-internals/reactivity/effect'

/** @template T */
export default class Ref {
    /** @type {Set<ReactiveEffect>} */
    #effects = new Set();

    /** @type {T} */
    #value;
    __v_isRef = true;

    /**
     * @param {T} value 
     */
    constructor(value) {
        this.#value = value;
    }

    get value() {
        this.#track();
        return this.#value;
    }

    /**
     * @param {T} newValue 
     */
    set value(newValue) {
        if (!Object.is(this.#value, newValue)) {
            this.#value = newValue;
            this.#trigger();
        }
    }

    #track() {
        if (!(activeSub instanceof ReactiveEffect) || !shouldTrack) {
            return;
        }
        this.#effects.add(activeSub);
    }

    #trigger() {
        for (const sub of this.#effects) {
            sub.trigger();
        }
        this.#effects.clear();
    }
}