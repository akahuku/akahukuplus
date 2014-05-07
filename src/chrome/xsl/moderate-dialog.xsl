<?xml version="1.0" encoding="UTF-8"?>
<!--
	moderate dialog content

	@author akahuku@gmail.com
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
