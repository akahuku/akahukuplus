<?xml version="1.0" encoding="UTF-8"?>
<!--
	thread archive contents
-->
<!--
 * Copyright 2021-2024 akahuku, akahuku@gmail.com
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
<!DOCTYPE stylesheet [
	<!ENTITY nbsp "&#160;" >
]>
<xsl:stylesheet
	version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xhtml="http://www.w3.org/1999/xhtml">
	<xsl:output method="html" version="5" encoding="UTF-8"/>
	<xsl:strip-space elements="xhtml:*"/>

	<xsl:template match="/xhtml:html">
		<html lang="ja">
			<xsl:apply-templates select="xhtml:body"/>
		</html>
	</xsl:template>

	<xsl:template match="xhtml:body">
		<body>
			<div class="topic">
				<xsl:for-each select="(*[@class='topic-wrap'])[1]">
<span id="delcheck{@data-number}"></span>
<xsl:if test="descendant::*[contains(@class,'sub')]"><span class="csb"><xsl:value-of select="descendant::*[contains(@class,'sub')]/text()"/></span></xsl:if>
<xsl:if test="descendant::*[contains(@class,'name')]">Name<span class="cnm"><xsl:value-of select="descendant::*[contains(@class,'name')]/text()"/></span></xsl:if>
<xsl:choose><xsl:when test="descendant::*[contains(@class,'email')]"><span class="cnw"><a href="mailto:{descendant::*[contains(@class,'email')]/text()}"><xsl:value-of select="descendant::*[@class='postdate']/@data-orig"/></a><xsl:if test="descendant::*[@class='user-id']"><xsl:text> </xsl:text><xsl:value-of select="descendant::xhtml:span[@class='user-id']/text()"/></xsl:if></span></xsl:when><xsl:otherwise><span class="cnw"><xsl:value-of select="descendant::*[@class='postdate']/@data-orig"/><xsl:if test="descendant::*[@class='user-id']"><xsl:text> </xsl:text><xsl:value-of select="descendant::xhtml:span[@class='user-id']/text()"/></xsl:if></span></xsl:otherwise></xsl:choose>
<span class="cno"><xsl:value-of select="string(descendant::*[@class='postno'])"/></span>
<xsl:choose><xsl:when test="descendant::*[contains(@class,'sodane-null')]"><a href="javascript:void(0)" class="sod" id="sd{@data-number}">+</a></xsl:when><xsl:when test="descendant::*[contains(@class,'sodane')]"><a href="javascript:void(0)" class="sod" id="sd{*[@class='topic-wrap']/@data-number}">そうだねx<xsl:value-of select="descendant::*[contains(@class,'sodane')]/text()"/></a></xsl:when></xsl:choose>
<span class="cntd"><xsl:value-of select="descendant::*[contains(@class,'expire-warn')]/xhtml:span/text()"/></span>
<blockquote><xsl:apply-templates select="descendant::*[@class='email']"/><xsl:apply-templates select="descendant::*[@class='comment']"/></blockquote>
				</xsl:for-each>
			</div>
			<div class="replies">
				<xsl:for-each select="*[@class='reply-wrap']">
<table border="0"><tr><td class="rts">…</td><td class="rtd"><span id="delcheck{descendant::*[@data-number]/@data-number}" class="rsc"><xsl:value-of select="descendant::*[@class='no']/text()"/></span>
<xsl:if test="descendant::*[contains(@class,'sub')]"><span class="csb"><xsl:value-of select="descendant::*[contains(@class,'sub')]/text()"/></span></xsl:if>
<xsl:if test="descendant::*[contains(@class,'name')]">Name<span class="cnm"><xsl:value-of select="descendant::*[contains(@class,'name')]/text()"/></span></xsl:if>
<xsl:choose><xsl:when test="descendant::*[contains(@class,'email')]"><span class="cnw"><a href="mailto:{descendant::*[contains(@class,'email')]/text()}"><xsl:value-of select="descendant::*[@class='postdate']/@data-orig"/></a><xsl:if test="descendant::*[@class='user-id']"><xsl:text> </xsl:text><xsl:value-of select="descendant::xhtml:span[@class='user-id']/text()"/></xsl:if></span></xsl:when><xsl:otherwise><span class="cnw"><xsl:value-of select="descendant::*[@class='postdate']/@data-orig"/><xsl:if test="descendant::*[@class='user-id']"><xsl:text> </xsl:text><xsl:value-of select="descendant::xhtml:span[@class='user-id']/text()"/></xsl:if></span></xsl:otherwise></xsl:choose>
<span class="cno"><xsl:value-of select="string(descendant::*[@class='postno'])"/></span>
<xsl:choose><xsl:when test="descendant::*[contains(@class,'sodane-null')]"><a href="javascript:void(0)" class="sod" id="sd{descendant::*[@data-number]/@data-number}">+</a></xsl:when><xsl:when test="descendant::*[contains(@class,'sodane')]"><a href="javascript:void(0)" class="sod" id="sd{descendant::*[@data-number]/@data-number}">そうだねx<xsl:value-of select="descendant::*[contains(@class,'sodane')]/text()"/></a></xsl:when></xsl:choose>
<xsl:apply-templates select="descendant::*[contains(@class,'reply-image')]"/>
<xsl:element name="blockquote"><xsl:if test="descendant::*[contains(@class,'reply-image')]"><xsl:attribute name="style">margin-left:<xsl:value-of select="descendant::*[contains(@class,'reply-image')]/xhtml:a/xhtml:img/@width + 40"/>px;</xsl:attribute></xsl:if><xsl:apply-templates select="descendant::*[@class='email']"/><xsl:apply-templates select="descendant::*[@class='comment']"/></xsl:element>
</td></tr></table>
				</xsl:for-each>
			</div>
		</body>
	</xsl:template>

	<xsl:template match="xhtml:a"><a href="{@href}" target="_blank"><xsl:apply-templates/></a></xsl:template>

	<xsl:template match="xhtml:q"><font color="#789922"><xsl:apply-templates/></font></xsl:template>

	<xsl:template match="xhtml:br"><br/></xsl:template>

	<xsl:template match="xhtml:img">
		<xsl:choose>
			<xsl:when test="@class='emoji'">
				<xsl:value-of select="@alt"/>
			</xsl:when>
			<xsl:otherwise>
				<xsl:element name="img">
					<xsl:attribute name="src"><xsl:value-of select="@src"/></xsl:attribute>
					<xsl:if test="@width"><xsl:attribute name="width"><xsl:value-of select="@width"/></xsl:attribute></xsl:if>
					<xsl:if test="@height"><xsl:attribute name="height"><xsl:value-of select="@height"/></xsl:attribute></xsl:if>
				</xsl:element>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="xhtml:template[contains(@class,'twitter-inner-frame')]">
		<xsl:copy-of select="."/>
	</xsl:template>

	<xsl:template match="*[contains(@class,'inline-save-image-wrap')]"></xsl:template>

	<xsl:template match="*[contains(@class,'email')]"><font color="#0000ff">[<xsl:apply-templates/>]</font><br/></xsl:template>

	<xsl:template match="*[contains(@class,'mark')]"><font color="#ff0000"><xsl:apply-templates/></font></xsl:template>

	<xsl:template match="*[contains(@class,'link-siokara')]"><a href="{xhtml:a/@href}" target="_blank"><xsl:value-of select="xhtml:a/@data-basename"/></a><br/></xsl:template>

	<xsl:template match="*[contains(@class,'reply-image')]"><br/> &nbsp; &nbsp; <a href="{xhtml:a/@href}" target="_blank"><xsl:value-of select="normalize-space(xhtml:a/text())"/></a>-(<xsl:value-of select="xhtml:a/xhtml:img/@data-bytes"/> B)<br/><a href="{xhtml:a/@href}" target="_blank"><img src="{xhtml:a/xhtml:img/@src}" border="0" align="left" width="{xhtml:a/xhtml:img/@width}" height="{xhtml:a/xhtml:img/@height}" hspace="20" alt="{xhtml:a/xhtml:img/@data-bytes} B"/></a></xsl:template>

	<xsl:template match="*[@class='comment']//xhtml:div[not(@class)]|*[@class='comment']//xhtml:iframe[not(@class='twitter-frame')]"><xsl:copy-of select="."/></xsl:template>
</xsl:stylesheet>
