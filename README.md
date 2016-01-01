# most-replay: memoization for most.js

This is a specialization of most.js' multicast operator. As with multicast, a single source is maintained, and the same data is emitted to multiple observers. Unlike multicast, all events are cached internally and transmitted to new observers before they receive subsequent events from the source. When the source terminates, the termination event is also recorded. New observers that connect after the original source terminates will be transmitted all of the cached events, followed by the same `end` or `error` event that the original source terminated with.

**Note:** this module makes use of ES2015 syntax such as `let`, `const` and arrow functions. Use Babel or an equivalent transpiler if your distribution target does not support these.

## Installation

```
npm install --save most
npm install --save most-replay
```

## Example Usage

```js
var most = require('most');
require('most-replay')(most); // Call only once, at the start of your application.

var memoizedStream = most
  .periodic(100, null)
  .flatMap(x => most.just(Math.random()))
  .take(5)
  .replay();

function observe(tag) {
  return () => {
    memoizedStream
      .reduce((acc, x) => {
        console.log(tag, x);
        return acc.concat(x);
      }, [])
      .then(arr => console.log(tag, arr))
      .catch(err => console.error(err));
  };
}

observe('A')();
setTimeout(observe('B'), 250);
setTimeout(observe('C'), 1000);
```

### Output

```
A 0.26321787014603615
A 0.9947695874143392
A 0.7076342459768057
B 0.26321787014603615
B 0.9947695874143392
B 0.7076342459768057
A 0.776626710081473
B 0.776626710081473
A 0.7720444065053016
B 0.7720444065053016
A [0.26321787014603615, 0.9947695874143392, 0.7076342459768057, 0.776626710081473, 0.7720444065053016]
B [0.26321787014603615, 0.9947695874143392, 0.7076342459768057, 0.776626710081473, 0.7720444065053016]
C 0.26321787014603615
C 0.9947695874143392
C 0.7076342459768057
C 0.776626710081473
C 0.7720444065053016
C [0.26321787014603615, 0.9947695874143392, 0.7076342459768057, 0.776626710081473, 0.7720444065053016]
```
