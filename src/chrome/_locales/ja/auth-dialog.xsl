<?xml version="1.0" encoding="UTF-8"?>
<!--
	file access authentication dialog content
-->
<!--
 * Copyright 2024 akahuku, akahuku@gmail.com
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
.dialog-content {
	text-align:center;
}

.dialog-content button {
	margin:0.2em;
	font-size:xx-large;
}

.dialog-content .click1, .dialog-content .click2 {
	color:red;
}

.dialog-content .click2 {
	margin-bottom:1em;
}

.dialog-content .banner {
	margin:auto;
	width:300px;
	height:300px;
	background-image:url(chrome-extension://__MSG_@@extension_id__/images/file-system.png);
	background-position:center;
	background-size:contain;
}
	</style>
	<div class="banner"></div>
	<div class="click1">↓↓↓ここをクリック↓↓↓</div>
	<div><button class="start-auth"><span></span>の承認プロセスを開始する</button></div>
	<div class="click2">↑↑↑ここをクリック↑↑↑</div>
	<div><a class="cancel-auth" href="#start-auth">やめる</a></div>
</div>
</xsl:template>

</xsl:stylesheet>
