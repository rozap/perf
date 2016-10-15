#!/bin/bash
while inotifywait -r -e modify ./test/js ./web; do
 ./node_modules/.bin/mocha test/js --compilers js:babel-core/register
done