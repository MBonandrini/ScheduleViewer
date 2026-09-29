# Third-party components

Studio and Toolkit source supplied by the user retain their existing ownership. This integration does not grant rights beyond those already held by the user.

PDF.js 4.10.38: Mozilla / contributors, Apache-2.0. License: toolkit/vendor/pdfjs/LICENSE. Source: https://github.com/mozilla/pdf.js/tree/v4.10.38 . Distributed npm package: pdfjs-dist@4.10.38.

DWG decoder: @mlightcad/libredwg-web 0.7.14, GPL-3.0. The build installs the pinned, unmodified npm decoder. Copyright and license notices are preserved. [GPL license](toolkit/vendor/dwg/COPYING). [Corresponding source and rebuild instructions](toolkit/vendor/dwg/source/README.md), [LibreDWG source archive](toolkit/vendor/dwg/source/libredwg-web-0.7.14-source.tar.gz), [jsmn submodule source archive](toolkit/vendor/dwg/source/jsmn-source.tar.gz). These same source archives and license are supplied in tools/cad in the full source release. Distribution of this dependency remains subject to its GPL terms. Running it in a worker does not waive those terms.

Optional browser-AI and spreadsheet adapters retain their upstream dependency URLs and licenses. These download only when used and are not represented as bundled/offline features. Native MPP conversion is removed.

No user schedules, contract PDFs, credentials or model weights are included. Decoder source archives include upstream test assets. A separate browser smoke test used upstream test/test-data/2000/entities-2d.dwg; it did not use a user's drawing.
