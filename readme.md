# stacks-to-json-stack-tree 

Convert dtrace/perf stack samples into a JSON tree

## Installation

```sh
npm install stacks-to-json-stack-tree --save
```

## Usage

```js 
var fs = require('fs')
var stacksToJsonStackTree = require('stacks-to-json-stack-tree')
var mapFrames = (frames, instance) => frames // mapFrames is optional
var convertAndCollectFromStream = stacksToJsonStackTree(mapFrames, function (err, json) {
  if (err) throw err
  console.log(json)
})

fs.createReadStream('path/to/stacks').pipe(convertAndCollectFromStream)
```

## Dependencies

- [debug](https://github.com/visionmedia/debug): small debugging utility
- [end-of-stream](https://github.com/mafintosh/end-of-stream): Call a callback when a readable/writable/duplex stream has completed or failed.
- [through2](https://github.com/rvagg/through2): A tiny wrapper around Node streams2 Transform to avoid explicit subclassing noise

## Dev Dependencies


None

## License

Apache 2.0
