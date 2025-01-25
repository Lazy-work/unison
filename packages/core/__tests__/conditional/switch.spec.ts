import { $match } from "../../src";

describe('$match test suite', () => {
    it('should match primitive cases', () => {
        let input;
        let result;
        input = 0;
        result = $match(input)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 'two')
            .default(null);


        expect(result).toBe('zero');

        input = 1;
        result = $match(input)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 'two')
            .default(null);


        expect(result).toBe('one');

        input = 2;
        result = $match(input)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 'two')
            .default(null);

        expect(result).toBe('two');

        input = -1;
        result = $match(input)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 'two')
            .default(null);


        expect(result).toBe(null);
    })

    it('should match grouped primitive cases', () => {
        let result;
        result = $match(0)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('zero');

        result = $match(1)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('one');

        result = $match(2)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);

        expect(result).toBe('2-5');

        result = $match(3)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $match(4)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $match(5)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $match(6)
            .with(0, 'zero')
            .with(1, 'one')
            .with(2, 3, 4, 5, '2-5')
            .default(null);

        expect(result).toBe(null);
    })
    it('should match pattern object deep equality', () => {
        interface ResponsePending {
            status: { value: 'pending' }
        }
        interface ResponseSuccess<T> {
            status: { value: 'success' },
            data: T,
        }

        interface ResponseError {
            status: { value: 'error' },
            error: Error,
        }
        type Response<T> = ResponsePending | ResponseSuccess<T> | ResponseError
        const error = {
            status: { value: "error" },
            error: new Error()
        } as Response<any>;

        const pending = {
            status: { value: 'pending' }
        }

        const success = {
            status: { value: 'success' },
            data: { foo: 'bar' }
        }

        const nope = { status: { value: 'nope' } };
        enum Result {
            SUCCESS,
            LOADING,
            ERROR
        }
        let result = $match(pending)
            .with({ status: { value: 'success' } }, Result.SUCCESS)
            .with({ status: { value: "error" } }, Result.ERROR)
            .with({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);
        expect(result).toBe(Result.LOADING);


        result = $match(error)
            .with({ status: { value: 'success' } }, Result.SUCCESS)
            .with({ status: { value: "error" } }, Result.ERROR)
            .with({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);


        expect(result).toBe(Result.ERROR);

        result = $match(success)
            .with({ status: { value: 'success' } }, Result.SUCCESS)
            .with({ status: { value: "error" } }, Result.ERROR)
            .with({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);

        expect(result).toBe(Result.SUCCESS);


        result = $match(nope)
            .with({ status: { value: 'success' } }, Result.SUCCESS)
            .with({ status: { value: "error" } }, Result.ERROR)
            .with({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);


        expect(result).toBe(null);
    })
    it('should match pattern object', () => {
        interface ResponsePending {
            status: 'pending'
        }
        interface ResponseSuccess<T> {
            status: 'success',
            data: T,
        }

        interface ResponseError {
            status: 'error',
            error: Error,
        }
        type Response<T> = ResponsePending | ResponseSuccess<T> | ResponseError
        const error = {
            status: "error",
            error: new Error()
        } as Response<any>;

        const pending = {
            status: 'pending'
        }

        const success = {
            status: 'success',
            data: { foo: 'bar' }
        }

        const nope = { status: 'nope' };
        enum Result {
            SUCCESS,
            LOADING,
            ERROR
        }
        let result = $match(pending)
            .with({ status: 'success' }, Result.SUCCESS)
            .with({ status: 'error' }, Result.ERROR)
            .with({ status: 'pending' }, Result.LOADING)
            .default(null);
        expect(result).toBe(Result.LOADING);


        result = $match(error)
            .with({ status: 'success' }, Result.SUCCESS)
            .with({ status: 'error' }, Result.ERROR)
            .with({ status: 'pending' }, Result.LOADING)
            .default(null);


        expect(result).toBe(Result.ERROR);

        result = $match(success)
            .with({ status: 'success' }, Result.SUCCESS)
            .with({ status: 'error' }, Result.ERROR)
            .with({ status: 'pending' }, Result.LOADING)
            .default(null);

        expect(result).toBe(Result.SUCCESS);


        result = $match(nope)
            .with({ status: 'success' }, Result.SUCCESS)
            .with({ status: 'error' }, Result.ERROR)
            .with({ status: 'pending' }, Result.LOADING)
            .default(null);


        expect(result).toBe(null);
    })

})