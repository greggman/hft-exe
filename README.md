hft-exe
=======

Make Exe/App/package for HappyFunTimes

This program makes a native Windows and OSX installer and native like app for [happyFunTimes](http://greggman.github.io/HappyFunTimes).

It does this by packaging up node and building an installer.

For Windows it uses the [Nullsoft Installer](http://nsis.sourceforge.net/) to create
the installer. The app is just node which when launched will open a command prompt.

For OSX it uses tools included with XCode to create the installer. It launches node
through [a small app](http://github.com/greggman/hft-osx-launcher) that provides
a simple GUI wrapper for a command line app.


