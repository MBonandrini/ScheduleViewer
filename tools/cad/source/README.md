# Corresponding decoder source

`libredwg-web-0.7.14-source.tar.gz` is the unmodified upstream source archive for tag v0.7.14, commit `1dd682f46339f37b67c5ff1085d10d04a8c16d7e`:
https://github.com/mlightcad/libredwg-web/tree/1dd682f46339f37b67c5ff1085d10d04a8c16d7e

`jsmn-source.tar.gz` contains its jsmn submodule at commit `85695f3d5903b1cd5b4030efe50db3b4f5f3c928`:
https://github.com/zserge/jsmn/tree/85695f3d5903b1cd5b4030efe50db3b4f5f3c928

To rebuild, extract the first archive, extract the second into its `jsmn` directory, then follow the upstream README's Build WebAssembly and JavaScript build instructions. Build scripts, bindings, C/C++ source and license notices are in the archive. Studio uses the unmodified npm package @mlightcad/libredwg-web 0.7.14, whose integrity is pinned in tools/cad/package-lock.json. SHA-256 values for the source archives are in checksums.json.

The deployment publishes these archives beside the decoder at toolkit/vendor/dwg/source/; they are available for download and are not fetched when opening a drawing. The source contains upstream tests and test assets; it contains no user project information. See ../COPYING for GPL-3.0.
