<?xml version="1.0" encoding="UTF-8"?>
<!--
	post-delete dialog content
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
		.dialog-content fieldset {
			border:1px solid #ea8;
			border-radius:4px;
			margin:8px 0 16px 0;
			padding:10px;
		}
		.dialog-content .delete-key {
			width:8em;
		}
		.dialog-content .delete-status-wrap {
			margin:8px 0 0 0;
			padding:8px 0 0 0;
			border-top:1px solid silver;
			text-align:center;
		}
		.dialog-content .delete-warn {
			color:#d00;
			font-weight:bold;
		}
	</style>
	<xsl:choose>
	<xsl:when test="dialog/count='0'">
	<div class="delete-warn">Posts not specified. Please check the posts you wish to moderate first.</div>
	</xsl:when>
	<xsl:otherwise>
	<div>
		<fieldset>
			<legend><label><input type="radio" name="evalmode" value="delete" checked="checked"/> Request for post deletion</label></legend>
			<div><label>Delete key<input type="text" name="pwd" class="delete-key" value="" maxlength="8"/></label></div>
			<div><label>[<input type="checkbox" name="onlyimgdel" class="delete-only-image" value="on"/> Delte only image]</label></div>
		</fieldset>
		<fieldset>
			<legend><label><input type="radio" name="evalmode" value="moderate"/> Downvote</label></legend>
			<select class="reason"></select>
		</fieldset>
		<div class="delete-status-wrap">- <span class="delete-status"><xsl:value-of select="dialog/count"/> requests</span> -</div>
	</div>
	</xsl:otherwise>
	</xsl:choose>
</div>
</xsl:template>

</xsl:stylesheet>
