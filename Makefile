# application macros
# ========================================

SHELL = /bin/sh

CHROME := chromium-browser
OPERA := opera
FIREFOX := firefox
CYGPATH := echo

ZIP = zip -qr9
UNZIP := unzip

RSYNC := rsync
RSYNC_OPT = -rptLv --delete \
		--exclude '*.sw?' --exclude '*.bak' --exclude '*~' --exclude '*.sh' \
		--exclude '.*' --exclude 'oldlib/' \
		--exclude '$(CRYPT_SRC_FILE)*'

-include app.mk

# basic macros
# ========================================

PRODUCT = akahukuplus
DIST_DIR = dist
SRC_DIR = src
EMBRYO_DIR = .embryo

CRYPT_KEY_FILE = LICENSE
CRYPT_SRC_FILE = consumer_keys.json
CRYPT_DST_FILE = consumer_keys.bin

CHROME_SUFFIX = crx
CHROME_SRC_DIR = chrome
CHROME_EXT_ID = ebdgiiahmbloeogknjeekjpkkfnamlkb
CHROME_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.crx
CHROME_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/chrome.xml

OPERA_SUFFIX = oex
OPERA_SRC_DIR = opera
OPERA_EXT_ID =
OPERA_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.oex
OPERA_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/opera.xml

BLINKOPERA_SUFFIX = nex
BLINKOPERA_SRC_DIR = chrome
BLINKOPERA_EXT_ID = ebdgiiahmbloeogknjeekjpkkfnamlkb
BLINKOPERA_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.nex
BLINKOPERA_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/blink-opera.xml

FIREFOX_SUFFIX = xpi
FIREFOX_SRC_DIR = firefox
FIREFOX_EXT_ID =
FIREFOX_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.xpi
FIREFOX_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/update.rdf

# derived macros
# ========================================

VERSION = $(shell echo -n `git describe --tags --abbrev=0|sed -e 's/[^0-9.]//g'`.`git rev-list --count HEAD`)
BINKEYS_PATH = $(CHROME_SRC_PATH)/$(CRYPT_DST_FILE)

CHROME_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(CHROME_SUFFIX)
CHROME_MTIME_PATH = $(EMBRYO_DIR)/.$(CHROME_SUFFIX)
CHROME_SRC_PATH = $(SRC_DIR)/$(CHROME_SRC_DIR)
CHROME_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(CHROME_SRC_DIR)
CHROME_TEST_PROFILE_PATH := $(shell $(CYGPATH) profile/chrome)

OPERA_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(OPERA_SUFFIX)
OPERA_MTIME_PATH = $(EMBRYO_DIR)/.$(OPERA_SUFFIX)
OPERA_SRC_PATH = $(SRC_DIR)/$(OPERA_SRC_DIR)
OPERA_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(OPERA_SRC_DIR)
OPERA_TEST_PROFILE_PATH := $(shell $(CYGPATH) profile/opera)

BLINKOPERA_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(BLINKOPERA_SUFFIX)
BLINKOPERA_MTIME_PATH = $(EMBRYO_DIR)/.$(BLINKOPERA_SUFFIX)
BLINKOPERA_SRC_PATH = $(SRC_DIR)/$(BLINKOPERA_SRC_DIR)
BLINKOPERA_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/operablink

FIREFOX_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(FIREFOX_SUFFIX)
FIREFOX_MTIME_PATH = $(EMBRYO_DIR)/.$(FIREFOX_SUFFIX)
FIREFOX_SRC_PATH = $(SRC_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_TEST_PROFILE_PATH := $(shell $(CYGPATH) profile/firefox)

SED_SCRIPT_DEBUG_OFF = -e 's/\(const\s\+DEBUG_ALWAYS_LOAD_XSL\s*=\s*\)true/\1false/' \
	-e 's/\(const\s\+DEBUG_DUMP_INTERNAL_XML\s*=\s*\)true/\1false/' \
	-e 's/\(const\s\+DEBUG_HIDE_BANNERS\s*=\s*\)true/\1false/' \
	-e 's/\(const\s\+DEBUG_IGNORE_LAST_MODIFIED\s*=\s*\)true/\1false/'

# basic rules
# ========================================

all: $(CHROME_TARGET_PATH) \
	$(OPERA_TARGET_PATH) $(BLINKOPERA_TARGET_PATH) \
	$(FIREFOX_TARGET_PATH)

clean:
	rm -rf ./$(EMBRYO_DIR)

$(BINKEYS_PATH): $(CHROME_SRC_PATH)/$(CRYPT_KEY_FILE) $(CHROME_SRC_PATH)/$(CRYPT_SRC_FILE)
	tool/make-binkey.rb \
		--key $(CHROME_SRC_PATH)/$(CRYPT_KEY_FILE) \
		--src $(CHROME_SRC_PATH)/$(CRYPT_SRC_FILE) \
		--dst $@ \
		--verbose --verbose

FORCE:

.PHONY: all clean \
	runfx \
	FORCE

#
# rules to make akahukuplus.crx
# ========================================
#

# akahukuplus.crx
$(CHROME_TARGET_PATH): $(CHROME_MTIME_PATH) $(BINKEY_PATH)
#	copy all of sources to embryo dir
	$(RSYNC) $(RSYNC_OPT) \
		$(CHROME_SRC_PATH)/ $(CHROME_EMBRYO_SRC_PATH)

#	update akahukuplus.js
	sed $(SED_SCRIPT_DEBUG_OFF) \
		$(CHROME_SRC_PATH)/frontend/akahuku-extreme.js \
		> $(CHROME_EMBRYO_SRC_PATH)/frontend/akahuku-extreme.js

#	update manifest
	tool/update-chrome-manifest.rb \
		--indir $(CHROME_SRC_PATH) \
		--outdir $(CHROME_EMBRYO_SRC_PATH) \
		--ver $(VERSION)

#	build general crx
	$(CHROME) \
		--lang=en \
		--pack-extension=$(CHROME_EMBRYO_SRC_PATH) \
		--pack-extension-key=akahukuplus.pem

	mv $(EMBRYO_DIR)/$(CHROME_SRC_DIR).$(CHROME_SUFFIX) $@

#	update manifest for google web store
	tool/update-chrome-manifest.rb \
		--indir $(CHROME_SRC_PATH) \
		--outdir $(CHROME_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--strip-update-url

#	build zip archive for google web store
	rm -f $(DIST_DIR)/akahukuplus_chrome_web_store.zip
	cd $(CHROME_EMBRYO_SRC_PATH) \
		&& $(ZIP) ../../$(DIST_DIR)/akahukuplus_chrome_web_store.zip .

#	create update description file
	sed -e 's/@appid@/$(CHROME_EXT_ID)/g' \
		-e 's!@location@!$(CHROME_EXT_LOCATION)!g' \
		-e 's/@version@/$(VERSION)/g' \
		$(SRC_DIR)/chrome.xml > $(DIST_DIR)/$(notdir $(CHROME_UPDATE_LOCATION))

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///

# last mtime holder
$(CHROME_MTIME_PATH): FORCE
	@mkdir -p $(CHROME_EMBRYO_SRC_PATH) $(DIST_DIR)
	tool/mtime.rb --dir $(CHROME_SRC_PATH) --base $(CHROME_TARGET_PATH) --out $@



#
# rules to make akahukuplus.oex
# ========================================
#

# akahukuplus.oex
$(OPERA_TARGET_PATH): $(OPERA_MTIME_PATH) $(BINKEYS_PATH)
#	copy all of sources to embryo dir
	$(RSYNC) $(RSYNC_OPT) $(OPERA_SRC_PATH)/ $(OPERA_EMBRYO_SRC_PATH)

#	update akahukuplus.js
	sed $(SED_SCRIPT_DEBUG_OFF) \
		$(OPERA_SRC_PATH)/includes/akahuku-extreme.js \
		> $(OPERA_EMBRYO_SRC_PATH)/includes/akahuku-extreme.js

#	update the manifest file
	tool/update-opera-config.rb \
		--product $(PRODUCT) \
		--indir $(OPERA_SRC_PATH) \
		--outdir $(OPERA_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--update-url $(OPERA_UPDATE_LOCATION)

#	create update description file
	sed -e 's/@appid@/$(OPERA_EXT_ID)/g' \
		-e 's!@location@!$(OPERA_EXT_LOCATION)!g' \
		-e 's/@version@/$(VERSION)/g' \
		$(SRC_DIR)/opera.xml > $(DIST_DIR)/$(notdir $(OPERA_UPDATE_LOCATION))

#	zip it
	rm -f $@
	cd $(OPERA_EMBRYO_SRC_PATH) && $(ZIP) ../../$@ .

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///

# last mtime holder
$(OPERA_MTIME_PATH): FORCE
	@mkdir -p $(OPERA_EMBRYO_SRC_PATH) $(DIST_DIR)
	tool/mtime.rb --dir $(OPERA_SRC_PATH) --base $(OPERA_TARGET_PATH) --out $@



#
# rules to make akahukuplus.nex
# ========================================
#

# akahukuplus.nex
$(BLINKOPERA_TARGET_PATH): $(BLINKOPERA_MTIME_PATH) $(BINKEY_PATH)
#	copy all of sources to embryo dir
	$(RSYNC) $(RSYNC_OPT) \
		$(BLINKOPERA_SRC_PATH)/ $(BLINKOPERA_EMBRYO_SRC_PATH)

#	update akahukuplus.js
	sed $(SED_SCRIPT_DEBUG_OFF) \
		$(BLINKOPERA_SRC_PATH)/frontend/akahuku-extreme.js \
		> $(BLINKOPERA_EMBRYO_SRC_PATH)/frontend/akahuku-extreme.js

#	update manifest
	tool/update-chrome-manifest.rb \
		--indir $(BLINKOPERA_SRC_PATH) \
		--outdir $(BLINKOPERA_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--update-url $(BLINKOPERA_UPDATE_LOCATION)

#	build nex
	$(CHROME) \
		--lang=en \
		--pack-extension=$(BLINKOPERA_EMBRYO_SRC_PATH) \
		--pack-extension-key=akahukuplus.pem

	mv $(EMBRYO_DIR)/operablink.crx $@

#	create update description file
	sed -e 's/@appid@/$(BLINKOPERA_EXT_ID)/g' \
		-e 's!@location@!$(BLINKOPERA_EXT_LOCATION)!g' \
		-e 's/@version@/$(VERSION)/g' \
		$(SRC_DIR)/opera-blink.xml > $(DIST_DIR)/$(notdir $(BLINKOPERA_UPDATE_LOCATION))

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///

# last mtime holder
$(BLINKOPERA_MTIME_PATH): FORCE
	@mkdir -p $(BLINKOPERA_EMBRYO_SRC_PATH) $(DIST_DIR)
	tool/mtime.rb --dir $(BLINKOPERA_SRC_PATH) --base $(BLINKOPERA_TARGET_PATH) --out $@



#
# rules to make wasavi.xpi
# ========================================
#

# wasavi.xpi
$(FIREFOX_TARGET_PATH): $(FIREFOX_MTIME_PATH) $(BINKEY_PATH)
#	copy all of sources to embryo dir
	$(RSYNC) $(RSYNC_OPT) \
		$(FIREFOX_SRC_PATH)/ $(FIREFOX_EMBRYO_SRC_PATH)

#	update akahukuplus.js
	sed $(SED_SCRIPT_DEBUG_OFF) \
		$(FIREFOX_SRC_PATH)/data/frontend/akahuku-extreme.js \
		> $(FIREFOX_EMBRYO_SRC_PATH)/data/frontend/akahuku-extreme.js

#	strip script tag from options.html
#	sed -e 's/<script[^>]*><\/script>//g' \
#		$(FIREFOX_SRC_PATH)/data/options.html \
#		> $(FIREFOX_EMBRYO_SRC_PATH)/data/options.html

#	update package
	tool/update-firefox-package.rb \
		--indir $(FIREFOX_SRC_PATH) \
		--outdir $(FIREFOX_EMBRYO_SRC_PATH) \
		--ver $(VERSION)

#	build xpi
	cfx xpi \
		--pkgdir=$(FIREFOX_EMBRYO_SRC_PATH) \
		--update-link=$(FIREFOX_EXT_LOCATION) \
		--update-url=$(FIREFOX_UPDATE_LOCATION)

	mv $(PRODUCT).$(FIREFOX_SUFFIX) $@
	mv $(PRODUCT).update.rdf $(DIST_DIR)/update.rdf
	cp $@ $(DIST_DIR)/$(PRODUCT)_amo.$(FIREFOX_SUFFIX)
	cp $@ $(DIST_DIR)/$(PRODUCT)_amo_beta.$(FIREFOX_SUFFIX)

#	amo version
	$(UNZIP) -p $@ install.rdf > $(FIREFOX_EMBRYO_SRC_PATH)/install.rdf
	tool/update-firefox-manifest.rb \
		--indir $(FIREFOX_EMBRYO_SRC_PATH) \
		--outdir $(FIREFOX_EMBRYO_SRC_PATH) \
		--localedir $(SRC_DIR)/chrome/_locales \
		--ver $(VERSION) \
		--strip-update-url
	$(ZIP) -d $(DIST_DIR)/$(PRODUCT)_amo.$(FIREFOX_SUFFIX) install.rdf
	cd $(FIREFOX_EMBRYO_SRC_PATH) && $(ZIP) -u ../../$(DIST_DIR)/$(PRODUCT)_amo.$(FIREFOX_SUFFIX) install.rdf

#	amo(beta) version
	$(UNZIP) -p $@ install.rdf > $(FIREFOX_EMBRYO_SRC_PATH)/install.rdf
	tool/update-firefox-manifest.rb \
		--indir $(FIREFOX_EMBRYO_SRC_PATH) \
		--outdir $(FIREFOX_EMBRYO_SRC_PATH) \
		--localedir $(SRC_DIR)/chrome/_locales \
		--ver $(VERSION)beta \
		--strip-update-url
	$(ZIP) -d $(DIST_DIR)/$(PRODUCT)_amo_beta.$(FIREFOX_SUFFIX) install.rdf
	cd $(FIREFOX_EMBRYO_SRC_PATH) && $(ZIP) -u ../../$(DIST_DIR)/$(PRODUCT)_amo_beta.$(FIREFOX_SUFFIX) install.rdf

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///

# last mtime holder
$(FIREFOX_MTIME_PATH): FORCE
	@mkdir -p $(FIREFOX_EMBRYO_SRC_PATH) $(DIST_DIR)
	tool/mtime.rb --dir $(FIREFOX_SRC_PATH) --base $(FIREFOX_TARGET_PATH) --out $@



#
# rules to test
# ========================================
#

runfx: FORCE
	cd $(FIREFOX_SRC_PATH) && cfx run -p $(abspath $(FIREFOX_TEST_PROFILE_PATH))

# end
