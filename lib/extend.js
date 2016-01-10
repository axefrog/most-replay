const most = require('most');
const {replay} = require('./ReplaySource');
const Stream = most.Stream;

Stream.prototype.replay = function(maxBufferSize) {
  return replay(this, maxBufferSize);
};
