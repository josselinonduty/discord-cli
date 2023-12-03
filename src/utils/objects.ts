export function merge<T>(...objects: T[]): T {
    return objects.reduce((acc, object) => {
        return Object.assign(acc, getDefinedProperties(object));
    }, {} as T);
}

export function getDefinedProperties<T>(object: T): T {
    return Object.fromEntries(
        Object.entries(object).filter(([_key, value]) => value !== undefined)
    ) as T;
}
