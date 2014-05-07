<?xml version="1.0" encoding="UTF-8"?>
<!--
	post-delete dialog content

	@author akahuku@gmail.com
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="5" encoding="UTF-8"/>

<xsl:template match="/">
<div>
	<style>
		.dialog-content .delete-key {
			width:8em;
		}
		.dialog-content table {
			margin:0 auto 0 auto;
			border-collapse:collapse;
			border:none;
		}
		.dialog-content td {
			text-align:right;
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
	<xsl:when test="count(dialog/checks/check)=0">
	<div class="delete-warn">記事が指定されていません。あらかじめ削除したい記事をチェックしてください。</div>
	</xsl:when>
	<xsl:otherwise>
	<form action="futaba.php" method="POST">
		<input type="hidden" name="mode" value="usrdel"/>
		<table><tr><td>
		<div><label>削除キー <input type="text" name="pwd" class="delete-key" value="{dialog/delete-key}" maxlength="8"/></label></div>
		<div><label>[<input type="checkbox" name="onlyimgdel" class="delete-only-image" value="on"/> 画像だけ消す]</label></div>
		</td></tr></table>
		<div class="delete-status-wrap">- <span class="delete-status"><xsl:value-of select="count(dialog/delete-key)"/> 件の削除をリクエストします</span> -</div>
		<xsl:for-each select="dialog/checks/check"><input type="hidden" name="{.}" value="delete"/></xsl:for-each>
	</form>
	</xsl:otherwise>
	</xsl:choose>
</div>
</xsl:template>

</xsl:stylesheet>
