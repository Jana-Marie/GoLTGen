cell state consists of 4 bytes (RGBA)
1 byte is used for flags, the other three for numbers
e.g. byte A = 8 bits for flags, and RGB is a 1-byte number each, or can be combined into 2- or 3- byte numbers

content of the state is configured outside the code
e.g. flag names and number size

```ts
interface StateNumberValueConfiguration {
    bits: number;
}
interface StateFlagValueConfiguration {
    num: number;
}
type StateValueConfiguration = StateNumberValueConfiguration | StateFlagValueConfiguration;
type StateConfiguration = Record<string,StateValueConfiguration>;
```

neighbour-counting configurations:
```ts
interface NeighbourCountConfiguration {
    matrix: number[][]; // a matrix with odd-numbered rows and columns, the current cell is in the center
    valueFn: (cell: CellState) => number; // this should just be a simple expression
}

type NeighbourCountConfigurationMap = Record<string,NeighbourCountConfiguration>;

```

there is a step function that mutates the state for the next generation
e.g.
```js
state.alive = !state.alive;
state.age = state.age + 1;
```

