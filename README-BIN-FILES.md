A description of binary files
=============================

This file describes the role and the source code location of binary files in
the akahukuplus extension package.

* consumer_keys.bin

  Blowfish-encrypted JSON file which contains an application key and a secret
  key of each account of Dropbox, Google Drive and Microsoft OneDrive.

  The content of this file is generated
  by <https://github.com/akahuku/brisket/blob/master/make-binkey.js>
  using <https://github.com/akahuku/wasavi/blob/master/src/chrome/consumer_keys.json.template> as a template.
