# basic macros
# ========================================

SHELL = /bin/sh

PRODUCT = akahukuplus
DIST_DIR = dist
SRC_DIR = src
EMBRYO_DIR = .embryo

CRYPT_KEY_FILE = LICENSE
CRYPT_SRC_FILE = consumer_keys.json
CRYPT_DST_FILE = consumer_keys.bin

ZIP = zip
ZIP_OPT = -qr9

CHROME_SUFFIX = crx
CHROME_SRC_DIR = chrome
CHROME_EXT_ID =
CHROME_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.crx
CHROME_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/chrome.xml

OPERA_SUFFIX = oex
OPERA_SRC_DIR = opera
OPERA_EXT_ID =
OPERA_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.oex
OPERA_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/opera.xml

BLINKOPERA_SUFFIX = nex
BLINKOPERA_SRC_DIR = blink-opera
BLINKOPERA_EXT_ID =
BLINKOPERA_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.nex
BLINKOPERA_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/blink-opera.xml

FIREFOX_SUFFIX = xpi
FIREFOX_SRC_DIR = firefox
FIREFOX_EXT_ID =
FIREFOX_EXT_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/akahukuplus.xpi
FIREFOX_UPDATE_LOCATION = https://github.com/akahuku/akahukuplus/raw/master/dist/firefox.rdf

# derived macros
# ========================================

VERSION = $(shell echo -n `git describe --tags --abbrev=0|sed -e 's/[^0-9.]//g'`.`git rev-list --count HEAD`)
BINKEYS_PATH = $(EMBRYO_DIR)/$(CRYPT_DST_FILE)

CHROME_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(CHROME_SUFFIX)
CHROME_MTIME_PATH = $(EMBRYO_DIR)/.$(CHROME_SUFFIX)
CHROME_SRC_PATH = $(SRC_DIR)/$(CHROME_SRC_DIR)
CHROME_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(CHROME_SRC_DIR)
CHROME_BINKEYS_PATH = $(CHROME_SRC_PATH)/$(CRYPT_DST_FILE)

OPERA_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(OPERA_SUFFIX)
OPERA_MTIME_PATH = $(EMBRYO_DIR)/.$(OPERA_SUFFIX)
OPERA_SRC_PATH = $(SRC_DIR)/$(OPERA_SRC_DIR)
OPERA_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(OPERA_SRC_DIR)
OPERA_BINKEYS_PATH = $(OPERA_SRC_PATH)/$(CRYPT_DST_FILE)

BLINKOPERA_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(BLINKOPERA_SUFFIX)
BLINKOPERA_MTIME_PATH = $(EMBRYO_DIR)/.$(BLINKOPERA_SUFFIX)
BLINKOPERA_SRC_PATH = $(SRC_DIR)/$(BLINKOPERA_SRC_DIR)
BLINKOPERA_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(BLINKOPERA_SRC_DIR)
BLINKOPERA_BINKEYS_PATH = $(BLINKOPERA_SRC_PATH)/$(CRYPT_DST_FILE)

FIREFOX_TARGET_PATH = $(DIST_DIR)/$(PRODUCT).$(FIREFOX_SUFFIX)
FIREFOX_MTIME_PATH = $(EMBRYO_DIR)/.$(FIREFOX_SUFFIX)
FIREFOX_SRC_PATH = $(SRC_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_EMBRYO_SRC_PATH = $(EMBRYO_DIR)/$(FIREFOX_SRC_DIR)
FIREFOX_BINKEYS_PATH = $(FIREFOX_SRC_PATH)/$(CRYPT_DST_FILE)

# basic rules
# ========================================

all: $(OPERA_TARGET_PATH)

clean:
	rm -rf ./$(EMBRYO_DIR)

$(BINKEYS_PATH): $(CHROME_SRC_PATH)/$(CRYPT_KEY_FILE) $(CHROME_SRC_PATH)/$(CRYPT_SRC_FILE)
	tool/make-binkeys \
		--key=$(CHROME_SRC_PATH)/$(CRYPT_KEY_FILE) \
		--src=$(CHROME_SRC_PATH)/$(CRYPT_SRC_FILE) \
		--dst=$@ \
		--verbose --verbose

FORCE:

.PHONY: clean all FORCE

#
# rules to make akahukuplus.oex
# ========================================
#

# akahukuplus.oex
$(OPERA_TARGET_PATH): $(OPERA_MTIME_PATH) $(BINKEYS_PATH)
#	copy all of sources to embryo dir
	rsync -rptL --delete \
		--exclude '*.sw?' --exclude '*.bak' --exclude '*~' --exclude '*.sh' \
		--exclude 'config.xml' --exclude '$(CRYPT_SRC_FILE)' --exclude 'consumer_keys.json.template' \
		$(OPERA_SRC_PATH)/ $(OPERA_EMBRYO_SRC_PATH)

#	update the manifest file
	sed -e 's#<!--@\(update-description\)@-->#<\1 href="$(OPERA_UPDATE_LOCATION)"/>#g' \
		-e 's/0\.0\.1/$(VERSION)/g' \
		$(OPERA_SRC_PATH)/config.xml \
		> $(OPERA_EMBRYO_SRC_PATH)/config.xml

#	update akahukuplus.js
	sed -e 's/\(const\s\+DEBUG_ALWAYS_LOAD_XSL\s*=\s*\)true/\1false/' \
		-e 's/\(const\s\+DEBUG_DUMP_INTERNAL_XML\s*=\s*\)true/\1false/' \
		-e 's/\(const\s\+DEBUG_HIDE_BANNERS\s*=\s*\)true/\1false/' \
		-e 's/\(const\s\+DEBUG_IGNORE_LAST_MODIFIED\s*=\s*\)true/\1false/' \
		-e "s/\(var\s\+version\s*=\s*\)'[^']\+'/\1'$(VERSION)'/" \
		$(OPERA_SRC_PATH)/includes/akahuku-extreme.js \
		> $(OPERA_EMBRYO_SRC_PATH)/includes/akahuku-extreme.js

#	create binary consumer keys, and remove its json source
	cp $(BINKEYS_PATH) $(OPERA_EMBRYO_SRC_PATH)
	rm -f $(OPERA_EMBRYO_SRC_PATH)/$(CRYPT_SRC_FILE)
	rm -f $(OPERA_EMBRYO_SRC_PATH)/consumer_keys.json.template

#	create update description file
	sed -e 's/@appid@/$(OPERA_EXT_ID)/g' \
		-e 's!@location@!$(OPERA_EXT_LOCATION)!g' \
		-e 's/@version@/$(VERSION)/g' \
		$(SRC_DIR)/opera.xml > $(DIST_DIR)/$(notdir $(OPERA_UPDATE_LOCATION))

#	zip it
	rm -f $@
	cd $(OPERA_EMBRYO_SRC_PATH) && $(ZIP) $(ZIP_OPT) ../../$@ .

	@echo ///
	@echo /// created: $@, version $(VERSION)
	@echo ///

# last mtime holder
$(OPERA_MTIME_PATH): FORCE
	@mkdir -p $(OPERA_EMBRYO_SRC_PATH)
	@mkdir -p $(DIST_DIR)
	tool/mtime --dir=$(OPERA_SRC_PATH) --base=$(OPERA_TARGET_PATH) --out=$@

# end
