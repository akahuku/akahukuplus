#!/bin/sh
ln -s ../chrome/backend backend
ln -s ../chrome/consumer_keys.json consumer_keys.json
ln -s ../chrome/images images
mkdir includes
cd includes
	ln -s ../../chrome/frontend/akahukuplus.js
cd ..
ln -s ../chrome/LICENSE LICENSE
mkdir locales
cd locales
	ln -s ../../chrome/_locales/en_US en-us
	ln -s ../../chrome/_locales/ja ja
	ln -s ../../chrome/_locales/locales.json locales.json
cd ..
ln -s ../chrome/README.md README.md
ln -s ../chrome/sounds sounds
ln -s ../chrome/xsl xsl
