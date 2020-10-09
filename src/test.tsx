import _ from "lodash";
import * as React from "react";
import { of } from "rxjs";
import { delay, switchMap, tap } from "rxjs/operators";
import {
  emitMap,
  select,
  StateConfig,
  useShareStateFlow,
  useStateFlow,
} from ".";

const initState = { count: 0 };
const initDerivation = { count2: 0, count3: 0 as number | string };

const stateConfig: StateConfig<typeof initState, typeof initDerivation> = {
  state: initState,
  derivation: initDerivation,
  // clearOnZeroRef: true,
  flows: [
    ({ state$, setState }) =>
      state$.pipe(
        select((s) => s.count),
        emitMap((cnt) => ({ count2: cnt * 2, count3: "loading" }), setState),
        switchMap((cnt) => of(cnt).pipe(delay(3000))),
        emitMap((cnt) => ({ count3: cnt * 3 }), setState)
      ),
  ],
};

const Standalone = () => {
  const state1 = useStateFlow(stateConfig);

  return (
    <div>
      <div>
        {state1.state.count}
        <button
          onClick={() => state1.setState({ count: state1.state.count + 1 })}
        >
          inc
        </button>
      </div>
      <div>{state1.state.count2}</div>
      <div>{state1.state.count3}</div>
    </div>
  );
};

const Shared: React.FC<{ name: string }> = ({ name }) => {
  const state1 = useShareStateFlow(stateConfig, name);

  return (
    <div>
      <div>
        {state1.state.count}
        <button
          onClick={() => state1.setState({ count: state1.state.count + 1 })}
        >
          inc
        </button>
      </div>
      <div>{state1.state.count2}</div>
      <div>{state1.state.count3}</div>
    </div>
  );
};

export default () => {
  const [show, setShow] = React.useState(true);
  return (
    <div>
      <Standalone />
      <Shared name="a" />
      <Shared name="a" />
      <div>
        <button onClick={setShow.bind(null, !show)}>toggle</button>
      </div>
      {show && (
        <>
          <Shared name="b" />
          <Shared name="b" />
        </>
      )}
    </div>
  );
};
