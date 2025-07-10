<?xml version="1.0" encoding="UTF-8"?>
<!--
	moderate dialog content
-->
<!--
 * Copyright 2014-2025 akahuku, akahuku@gmail.com
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
		.dialog-content > table {
			border-collapse:collapse;
			border:none;
		}
		.dialog-content .moderate-target-wrap {
			vertical-align:top;
		}
		.dialog-content .moderate-target-header {
			margin:0 0 12px 0;
			padding:0 0 8px 0;
			border-bottom:1px solid silver;
			font-size:large;
			font-weight:bold;
			line-height:1;
		}
		.dialog-content .moderate-form-wrap {
			padding:0 16px 0 0;
			vertical-align:top;
		}
		.dialog-content .moderate-form table {
			border-collapse:separate;
			border:none;
		}
		.dialog-content .moderate-form table td {
			padding:4px;
			border:1px solid #ea8;
		}
		.dialog-content .moderate-status {
			margin:4px 0 0 0;
			padding:4px 0 0 0;
			border-top:1px solid silver;
			text-align:center;
		}
	</style>
	<table>
		<tr>
			<td class="moderate-form-wrap">
				<div class="moderate-form"></div>
			</td>
			<td class="moderate-target-wrap">
				<div class="moderate-target-header">対象:</div>
				<div class="moderate-target"></div>
			</td>
		</tr>
	</table>
	<div class="moderate-status">&#160;</div>
</div>
</xsl:template>

</xsl:stylesheet>
