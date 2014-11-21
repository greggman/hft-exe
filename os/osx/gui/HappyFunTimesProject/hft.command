#!/bin/sh
pushd `dirname $0` > /dev/null
SCRIPTPATH=`pwd`
popd > /dev/null
"${SCRIPTPATH}/../MacOS/bin/node" "${SCRIPTPATH}/../hft/start.js" --app-mode --show=how
