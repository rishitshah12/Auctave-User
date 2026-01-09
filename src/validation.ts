type ValidationRule = {
    test: (value: any) => boolean;
    message: string;
};

export class Validator<T> {
    private rules: Map<keyof T, ValidationRule[]> = new Map();

    addRule(key: keyof T, test: (value: any) => boolean, message: string): this {
        if (!this.rules.has(key)) {
            this.rules.set(key, []);
        }
        this.rules.get(key)!.push({ test, message });
        return this;
    }

    validate(data: Partial<T>): string[] {
        const errors: string[] = [];
        for (const key in data) {
            if (this.rules.has(key as keyof T)) {
                const rulesForKey = this.rules.get(key as keyof T)!;
                const value = data[key];
                for (const rule of rulesForKey) {
                    if (!rule.test(value)) {
                        errors.push(rule.message);
                    }
                }
            }
        }
        return errors;
    }
}