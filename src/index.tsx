import { Observable, BehaviorSubject, of, Subscription } from "rxjs";
import {
  mergeMap,
  map,
  distinctUntilChanged,
  catchError,
  tap,
  share,
  auditTime,
} from "rxjs/operators";
import { useEffect, useState } from "react";
import {
  assign,
  defaults,
  eq,
  identity,
  isEqual,
  isFunction,
  memoize,
  noop,
  once,
} from "lodash-es";

export interface FlowType<S extends object = {}, D extends object = {}> {
  (api: {
    state$: Observable<S & D>;
    setState: (partialState: Partial<S & D>) => void;
  }): Observable<any>;
}

export const configIdSymbol = Symbol.for("stateflow@tag");

export interface StateConfig<S extends object = {}, D extends object = {}> {
  state?: S;
  derivation?: D;
  flows?: FlowType<S, D>[];
  clearOnZeroRef?: boolean;
  [configIdSymbol]?: string;
}

const defaultConfig: StateConfig = {
  state: {},
  derivation: {},
  clearOnZeroRef: false,
  flows: [],
};

const createStateFlow = <S extends object = {}, D extends object = {}>(
  config: Partial<StateConfig<S, D>> = {},
  name = ""
) => {
  type UnionType = S & D;

  config = defaults({}, config, defaultConfig);

  const initState: UnionType = assign({}, config.state, config.derivation);
  type PartialType = Partial<UnionType>;

  const state$ = new BehaviorSubject(initState);

  const stateAudit20$ = state$.pipe(auditTime(20), share());

  const setState = (
    partialState: PartialType | ((state: UnionType) => PartialType)
  ) => {
    const newState = assign(
      {},
      state$.value,
      isFunction(partialState) ? partialState(state$.value) : partialState
    );
    if (!isEqual(newState, state$.value)) state$.next(newState);
  };

  const effect = {
    sub: null as null | Subscription,
    begin() {
      if (!this.sub) {
        this.sub = of(...(config.flows || []))
          .pipe(
            mergeMap((r) => r({ state$: stateAudit20$, setState })),
            catchError((e) => {
              console.error(e);
              return of(null);
            })
          )
          .subscribe(noop);
      }
    },
    stop() {
      if (this.sub) {
        this.sub.unsubscribe();
        this.sub = null;
      }
    },
  };

  let refCount = 0;
  const getRefCount = () => refCount;
  const connect = () => {
    if (refCount === 0) {
      effect.begin();
    }
    refCount++;
    return once(() => {
      refCount--;
      if (refCount) {
        effect.stop();
      }
    });
  };

  return {
    name,
    initState,
    state$: stateAudit20$,
    setState,
    getRefCount,
    connect,
  };
};

// 操作符：用于选择一个观察值
export const select = <T, R>(mapper?: (a: T) => R, deep = true) => (
  source: Observable<T>
): Observable<R> =>
  source.pipe(
    map(mapper || identity),
    distinctUntilChanged(deep ? isEqual : eq)
  );

// 操作符：用于简化设置属性用的
export const emitMap = <T, R>(
  mapper: (a: T) => R = identity,
  receiver: (b: R) => any = noop
) => (source: Observable<T>): Observable<T> =>
  source.pipe(tap((a) => receiver(mapper(a))));

export const useStateFlow = <S extends object = {}, D extends object = {}>(
  config: Partial<StateConfig<S, D>>
) => {
  const [{ state$, connect, ...api }] = useState(() => createStateFlow(config));
  const [state, setState] = useState(api.initState);

  useEffect(() => {
    const sub = state$.subscribe(setState);
    const disconnect = connect();
    return () => {
      sub.unsubscribe();
      disconnect();
    };
  }, []);

  return {
    state,
    ...api,
  };
};

export const getStateFlow = memoize(
  createStateFlow,
  (config: StateConfig, name: string) => {
    if (!config[configIdSymbol]) {
      config[configIdSymbol] = `${Math.random()}`.slice(2);
    }
    return config[configIdSymbol] + `#${name}`;
  }
);

export const useShareStateFlow = <S extends object = {}, D extends object = {}>(
  config: Partial<StateConfig<S, D>> = {},
  name = ""
) => {
  const [{ state$, connect, ...api }] = useState(() =>
    getStateFlow(config, name)
  );

  const [state, setState] = useState(api.initState);

  useEffect(() => {
    const sub = state$.subscribe(setState);
    const disconnect = connect();
    return () => {
      sub.unsubscribe();
      disconnect();
      if (config.clearOnZeroRef && api.getRefCount() === 0) {
        getStateFlow.cache.delete(config[configIdSymbol] + `#${name}`);
      }
    };
  }, []);

  return {
    state,
    ...api,
  };
};
