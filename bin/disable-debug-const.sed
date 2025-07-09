#!/usr/bin/env -S sed -i -f
/const\s\+DEBUG_ALWAYS_LOAD_XSL/s/true/false/
/const\s\+DEBUG_DUMP_INTERNAL_XML/s/true/false/
/const\s\+DEBUG_HIDE_BANNERS/s/true/false/
/const\s\+DEBUG_IGNORE_LAST_MODIFIED/s/true/false/
/const\s\+IDEOGRAPH_CONVERSION/s/true/false/
