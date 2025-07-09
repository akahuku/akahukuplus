# application macros
# ========================================

AWK := gawk
SED := sed -E
ZIP := zip -qr9
RSYNC := rsync
JQ := jq

CHROME := google-chrome
FIREFOX := firefox



# basic macros
# ========================================

VERSION := $(shell echo -n `git describe --tags --abbrev=0|sed -e 's/[^0-9.]//g'`.`git rev-list --count HEAD`)

PRODUCT = akahukuplus
DIST_DIR = dist
SRC_DIR = src
EMBRYO_DIR = .embryo

RSYNC_OPT := -rptLv --delete --exclude-from=embryo-excludes.txt

CHROMEZIP_SUFFIX = zip
CHROMEZIP_SRC_DIR = chromezip

CHROME_SUFFIX = crx
CHROME_SRC_DIR = chrome
CHROME_EXT_ID = ebdgiiahmbloeogknjeekjpkkfnamlkb
CHROME_EXT_LOCATION = https://github.com/akahuku/$(PRODUCT)/raw/master/dist/$(PRODUCT).crx
CHROME_UPDATE_LOCATION = https://github.com/akahuku/$(PRODUCT)/raw/master/dist/chrome.xml

FIREFOX_SUFFIX = xpi
FIREFOX_SRC_DIR = firefox
FIREFOX_EXT_ID = jid1-ytdk6oePtVeu1A@jetpack
FIREFOX_EXT_LOCATION = https://github.com/akahuku/$(PRODUCT)/raw/master/dist/$(PRODUCT).xpi
FIREFOX_UPDATE_LOCATION = https://github.com/akahuku/$(PRODUCT)/raw/master/dist/firefox.json

# derived macros
# ========================================

CHROMEZIP_TARGET_PATH = $(DIST_DIR)/$(PRODUCT)_chrome_web_store.$(CHROMEZIP_SUFFIX)
CHROMEZIP_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(CHROMEZIP_SRC_DIR)

CHROME_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(CHROME_SUFFIX)
CHROME_SRC_PATH = $(SRC_DIR)/$(CHROME_SRC_DIR)
CHROME_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(CHROME_SRC_DIR)
CHROME_LATEST_SRC_PATH := $(shell \
	find -L $(CHROME_SRC_PATH) -type f,l \
	-printf '%TY-%Tm-%Td %.8TT %p\n' | sort -nr | head -1 | cut -f3 -d" ")

FIREFOX_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(FIREFOX_SUFFIX)
FIREFOX_SRC_PATH = $(SRC_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_DEBUG_SRC_PATH = $(EMBRYO_DIR)/$(FIREFOX_SRC_DIR)_debug
FIREFOX_TEST_PROFILE_PATH := browser/profile/firefox
FIREFOX_LATEST_SRC_PATH := $(shell \
	find -L $(FIREFOX_SRC_PATH) -type f,l \
	-printf '%TY-%Tm-%Td %.8TT %p\n' | sort -nr | head -1 | cut -f3 -d" ")



# basic rules
# ========================================

.PHONY: all zip crx xpi \
	asset sjistable momocan \
	debug-firefox \
	clean version \

all: zip crx xpi

zip: $(CHROMEZIP_TARGET_PATH)

crx: $(CHROME_TARGET_PATH)

xpi: $(FIREFOX_TARGET_PATH)

clean:
	rm -rf ./$(EMBRYO_DIR)



#
# rules to make akahukuplus_chrome_web_store.zip
# ==============================================
#

# akahukuplus_chrome_web_store.zip
$(CHROMEZIP_TARGET_PATH): $(CHROME_LATEST_SRC_PATH)
#
#	source sync'ing
#

#	copy all of sources to embryo dir
	@echo synchoronizing source...
	@mkdir -p $(CHROMEZIP_EMBRYO_SRC_PATH)
	@$(RSYNC) $(RSYNC_OPT) \
		$(CHROME_SRC_PATH)/ $(CHROMEZIP_EMBRYO_SRC_PATH)

#	minify and strip debug codes from javascript source codes
	@echo updating source code...
	find $(CHROMEZIP_EMBRYO_SRC_PATH) -name '*.js' -print0 | xargs -0 bin/minify.js -c terser.config.json

#	reset some const of akahukuplus.js
	@echo updating akahukuplus.js...
	@bin/disable-debug-const.sed \
		$(CHROMEZIP_EMBRYO_SRC_PATH)/frontend/akahukuplus.js

#	update manifest
	@echo updating manifest.json for zip...
	@bin/update-chrome-manifest.js \
		--indir $(CHROME_SRC_PATH) \
		--outdir $(CHROMEZIP_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--update-version-name

#	build zip archive
	@echo building zip...
	@rm -f $@
	@cd $(CHROMEZIP_EMBRYO_SRC_PATH) \
		&& find . -type f -print0 | sort -z | xargs -0 $(ZIP) \
		$(abspath $@)

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///



#
# rules to make akahukuplus.crx
# ========================================
#

# akahukuplus.crx
$(CHROME_TARGET_PATH): $(CHROME_LATEST_SRC_PATH)
#
#	source sync'ing
#

#	copy all of sources to embryo dir
	@echo synchoronizing source...
	@mkdir -p $(CHROME_EMBRYO_SRC_PATH)
	@$(RSYNC) $(RSYNC_OPT) \
		$(CHROME_SRC_PATH)/ $(CHROME_EMBRYO_SRC_PATH)

#	minify and strip debug codes from javascript source codes
	@echo updating source code...
	find $(CHROME_EMBRYO_SRC_PATH) -name '*.js' -print0 | xargs -0 bin/minify.js -c terser.config.json

#	reset some const of akahukuplus.js
	@echo updating akahukuplus.js...
	@bin/disable-debug-const.sed \
		$(CHROME_EMBRYO_SRC_PATH)/frontend/akahukuplus.js

#	update manifest
	@echo updating manifest.json for github...
	@bin/update-chrome-manifest.js \
		--indir $(CHROME_SRC_PATH) \
		--outdir $(CHROME_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--update-url $(CHROME_UPDATE_LOCATION) \
		--update-version-name

#	tweak coin.js
	@echo updating coin.js for github...
	@bin/strip-exports.js -i $(CHROME_EMBRYO_SRC_PATH)/lib/coin.js

#	build crx
	@echo building crx...
	@npx crx pack \
		$(CHROME_EMBRYO_SRC_PATH) \
		--crx-version 3 \
		-o $@ \
		-p $(PRODUCT).pem

#
#	create update description file
#

	@echo generating update xml...
	@$(SED) \
		-e 's!@appid@!$(CHROME_EXT_ID)!g' \
		-e 's!@location@!$(CHROME_EXT_LOCATION)!g' \
		-e 's!@version@!$(VERSION)!g' \
		$(SRC_DIR)/update-manifest-chrome.xml > $(DIST_DIR)/$(notdir $(CHROME_UPDATE_LOCATION))

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///



#
# rules to make akahukuplus.xpi
# ========================================
#

# akahukuplus.xpi
$(FIREFOX_TARGET_PATH): $(FIREFOX_LATEST_SRC_PATH)
#
#	source sync'ing
#

#	copy all of sources to embryo dir
	@mkdir -p $(FIREFOX_EMBRYO_SRC_PATH)
	@$(RSYNC) $(RSYNC_OPT) \
		$(FIREFOX_SRC_PATH)/ $(FIREFOX_EMBRYO_SRC_PATH)

#	minify and strip debug codes from javascript source codes
	@echo updating source code...
	find $(FIREFOX_EMBRYO_SRC_PATH) -name '*.js' -print0 | xargs -0 bin/minify.js -c terser.config.json

#	reset some const of akahukuplus.js
	@echo updating akahukuplus.js...
	@bin/disable-debug-const.sed \
		$(FIREFOX_EMBRYO_SRC_PATH)/frontend/akahukuplus.js

#	update configNames.json
	@echo updating configNames.json...
	@bin/deex-json.js -i $(FIREFOX_EMBRYO_SRC_PATH)/_locales/en/configNames.json
	@bin/deex-json.js -i $(FIREFOX_EMBRYO_SRC_PATH)/_locales/ja/configNames.json

#
#	build xpi for github
#

#	update manifest.json
	@echo updating manifest.json...
	@bin/deex-json.js \
		$(FIREFOX_SRC_PATH)/manifest.json \
	| bin/update-chrome-manifest.js \
		--indir - \
		--outdir $(FIREFOX_EMBRYO_SRC_PATH) \
		--ver $(VERSION) \
		--update-url $(FIREFOX_UPDATE_LOCATION) \
		--update-version-name

#	tweak coin.js
	@echo updating coin.js for github...
	@bin/strip-exports.js -i $(FIREFOX_EMBRYO_SRC_PATH)/lib/coin.js

#	build and sign xpi
	@echo calling xpi signer script...
	@bin/signxpi \
		-s $(FIREFOX_EMBRYO_SRC_PATH) \
		-d $(DIST_DIR)

#
#	create update description file
#

	@$(SED) \
		-e 's!@appid@!$(FIREFOX_EXT_ID)!g' \
		-e 's!@location@!$(FIREFOX_EXT_LOCATION)!g' \
		-e 's!@version@!$(VERSION)!g' \
		$(SRC_DIR)/update-manifest-firefox.json > $(DIST_DIR)/$(notdir $(FIREFOX_UPDATE_LOCATION))

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///



#
# rules to make assets
# ========================================
#

asset: sjistable momocan

sjistable: $(CHROME_SRC_PATH)/lib/sjis.js

$(CHROME_SRC_PATH)/lib/sjis.js: bin/make-sjis-table.js
	bin/make-sjis-table.js > $(CHROME_SRC_PATH)/lib/sjis.js

momocan:
	wget http://dev.appsweets.net/momo/can.php?extension=js -O src/chrome/frontend/momocan.js
	wget http://dev.appsweets.net/momo/can.php?extension=css -O src/chrome/styles/momocan.css



#
# rules to run on firefox
# ========================================
#

debug-firefox:
	@mkdir -p $(FIREFOX_DEBUG_SRC_PATH)
	@$(RSYNC) -a --delete --copy-links \
		$(FIREFOX_SRC_PATH)/ $(FIREFOX_DEBUG_SRC_PATH)
	@npx web-ext run \
		--firefox $(FIREFOX) \
		--firefox-profile $(FIREFOX_TEST_PROFILE_PATH) \
		--source-dir $(FIREFOX_DEBUG_SRC_PATH) \
		--keep-profile-changes \
		--start-url https://img.2chan.net/b/futaba.htm



#
# echo latest version
# ========================================
#
version:
	@echo "version:" $(VERSION)
	@echo "latest source pathes:"
	@echo "   chrome:" $(CHROME_LATEST_SRC_PATH)
	@echo "  firefox:" $(FIREFOX_LATEST_SRC_PATH)



# end
