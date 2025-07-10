<?xml version="1.0" encoding="UTF-8"?>
<!--
	coin charging control dialog
-->
<!--
 * Copyright 2024-2025 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="5" encoding="UTF-8"/>

<xsl:template match="/">
<div>
	<style>
.dialog-content button {
	margin:0.2em;
	font-size:xx-large;
}

.dialog-content div.click1,
.dialog-content div.click2 {
	color:red;
}

.dialog-content div.click2 {
	margin-bottom:1em;
}

.dialog-content div.banner {
	margin:0;
	width:512px;
	height:457px;
	background-image:url(chrome-extension://__MSG_@@extension_id__/images/azuki-coin.png);
	background-position:center;
	background-size:contain;
}

.dialog-content div.buttons {
	display:flex;
	margin:0;
	width:100%;
	height:430px;
	background:url(chrome-extension://__MSG_@@extension_id__/images/futaba-coin.png) left top no-repeat;
	align-items:center;
}
.dialog-content div.enable-charge > div {
	padding: 0 0 0 calc(512px - 192px);
	text-align:center;
}

.dialog-content div.disable-charge {
	width:512px;
	padding: 0 0 0 calc(512px - 384px);
	font-size:small;
	text-align:right;
}
	</style>
	<!--<div class="banner"></div>-->
	<div class="buttons">
		<div class="enable-charge">
			<div class="click1">↓↓↓CLICK HERE↓↓↓</div>
			<div><button class="enable-charge">Start the coin auto-charging</button></div>
			<div class="click2">↑↑↑CLICK HERE↑↑↑</div>
		</div>
		<div class="disable-charge">
			<div><a class="disable-charge" href="#start-charge">Disable auto-charging</a></div>
		</div>
	</div>
</div>
</xsl:template>

</xsl:stylesheet>
