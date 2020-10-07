/// <reference types="lodash" />
import { Observable } from "rxjs";
export interface FlowType<S extends object = {}, D extends object = {}> {
    (api: {
        state$: Observable<S & D>;
        setState: (partialState: Partial<S & D>) => void;
    }): Observable<any>;
}
export declare const configIdSymbol: unique symbol;
export interface StateConfig<S extends object = {}, D extends object = {}> {
    state?: S;
    derivation?: D;
    flows?: FlowType<S, D>[];
    clearOnZeroRef?: boolean;
    [configIdSymbol]?: string;
}
export declare const select: <T, R>(mapper?: ((a: T) => R) | undefined, deep?: boolean) => (source: Observable<T>) => Observable<R>;
export declare const emitMap: <T, R>(mapper?: (a: T) => R, receiver?: (b: R) => any) => (source: Observable<T>) => Observable<T>;
export declare const useStateFlow: <S extends object = {}, D extends object = {}>(config: Partial<StateConfig<S, D>>) => {
    name: string;
    initState: S & D;
    setState: (partialState: Partial<S & D> | ((state: S & D) => Partial<S & D>)) => void;
    getRefCount: () => number;
    state: S & D;
};
export declare const getStateFlow: (<S extends object = {}, D extends object = {}>(config?: Partial<StateConfig<S, D>>, name?: string) => {
    name: string;
    initState: S & D;
    state$: Observable<S & D>;
    setState: (partialState: Partial<S & D> | ((state: S & D) => Partial<S & D>)) => void;
    getRefCount: () => number;
    connect: () => () => void;
}) & import("lodash").MemoizedFunction;
export declare const useShareStateFlow: <S extends object = {}, D extends object = {}>(config?: Partial<StateConfig<S, D>>, name?: string) => {
    name: string;
    initState: S & D;
    setState: (partialState: Partial<S & D> | ((state: S & D) => Partial<S & D>)) => void;
    getRefCount: () => number;
    state: S & D;
};
