declare module "vitest" {
    interface Assertion<T = any> {
        toBeString(): T;
        toStartWith(expected: string): T;
        toBeArray(): T;
    }
    interface AsymmetricMatchersContaining {
        toBeString(): void;
        toStartWith(expected: string): void;
        toBeArray(): void;
    }
}
export {};
//# sourceMappingURL=vitest.setup.d.ts.map