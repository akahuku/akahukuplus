<?xml version="1.0" encoding="UTF-8"?>
<!--
	config dialog content
-->
<!--
 * Copyright 2014-2024 akahuku, akahuku@gmail.com
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
.dialog-content table {
	border-collapse:separate;
	border-spacing:0;
	border:1px solid #ccc;
}
.dialog-content th, .dialog-content td {
	padding:4px;
	border-style:solid none none none;
	border-width:1px;
	border-color:#ccc;
	background-color:#fff;
	color:#444;
	text-align:left;
	vertical-align:middle;
	font-size:medium;
}
.dialog-content tr:nth-child(odd) th,
.dialog-content tr:nth-child(odd) td {
	background-color:#f4f4f4;
}
.dialog-content th {
	font-weight:bold;
}
.dialog-content th .item-name {
	margin:0 0 4px 0;
}
.dialog-content th .item-desc {
	font-size:small;
	font-weight:normal;
	color:#555;
}
.dialog-content th .item-desc .comma:first-child {
	display:none;
}
.dialog-content tr.head th {
	padding:4px;
	border-width:1px;
	border-style:solid;
	border-color:#fff #ccc #ccc #fff;
	background-color:#f0e0d6;
	color:#800;
	text-align:center;
}
.dialog-content td {
	width:33%;
}
.dialog-content td textarea {
	box-sizing:border-box;
	width:100%;
	height:5em;
	word-break:break-all;
}
	</style>
	<table>
	<tr class="head">
		<th>名前</th>
		<th>値</th>
	</tr>
	<xsl:for-each select="dialog/items/item">
	<tr>
		<th>
			<div class="item-name"><xsl:value-of select="@name"/></div>
			<div class="item-desc">
				<xsl:if test="@desc"><span class="comma">, </span><span data-doe="{@desc}"></span></xsl:if>
				<xsl:if test="@min"><span class="comma">, </span>最小値: <xsl:value-of select="@min"/></xsl:if>
				<xsl:if test="@max"><span class="comma">, </span>最大値: <xsl:value-of select="@max"/></xsl:if>
			</div>
		</th>
		<td>
			<xsl:choose>
			<xsl:when test="@type='int' or @type='float'">
			<xsl:element name="input">
				<xsl:attribute name="type">number</xsl:attribute>
				<xsl:attribute name="class">config-item</xsl:attribute>
				<xsl:attribute name="name"><xsl:value-of select="../@prefix"/><xsl:value-of select="@internal"/></xsl:attribute>
				<xsl:if test="@min"><xsl:attribute name="min"><xsl:value-of select="@min"/></xsl:attribute></xsl:if>
				<xsl:if test="@max"><xsl:attribute name="max"><xsl:value-of select="@max"/></xsl:attribute></xsl:if>
				<xsl:attribute name="value"><xsl:value-of select="@value"/></xsl:attribute>
			</xsl:element>
			</xsl:when>
			<xsl:when test="@type='bool'">
			<label><xsl:element name="input">
				<xsl:attribute name="type">checkbox</xsl:attribute>
				<xsl:attribute name="class">config-item</xsl:attribute>
				<xsl:attribute name="name"><xsl:value-of select="../@prefix"/><xsl:value-of select="@internal"/></xsl:attribute>
				<xsl:attribute name="value">1</xsl:attribute>
				<xsl:if test="@value='true'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
			</xsl:element>する</label>
			</xsl:when>
			<xsl:when test="@type='string'">
			<textarea name="{../@prefix}{@internal}" class="config-item"><xsl:value-of select="@value"/></textarea>
			</xsl:when>
			<xsl:when test="@type='list'">
			<select name="{../@prefix}{@internal}" class="config-item">
				<xsl:for-each select="li">
				<xsl:choose>
				<xsl:when test="@selected='true'"><option value="{@value}" selected="selected"><xsl:value-of select="."/></option></xsl:when>
				<xsl:otherwise><option value="{@value}"><xsl:value-of select="."/></option></xsl:otherwise>
				</xsl:choose>
				</xsl:for-each>
			</select>
			</xsl:when>
			<xsl:otherwise>
			<xsl:value-of select="@value"/>
			</xsl:otherwise>
			</xsl:choose>
		</td>
	</tr>
	</xsl:for-each>
	</table>
</div>
</xsl:template>

</xsl:stylesheet>
