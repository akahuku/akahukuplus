<?xml version="1.0" encoding="UTF-8"?>
<!--
	The XSL file, which translates internal xml into content for akahukuplus extreme

	@author akahuku@gmail.com
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="5" encoding="UTF-8"/>
<xsl:variable name="sub_default" select="/futaba/meta/sub_default"/>
<xsl:variable name="name_default" select="/futaba/meta/name_default"/>
<xsl:param name="page_mode"/>
<xsl:param name="render_mode"/>
<xsl:param name="low_bound_number"/>

<!-- transform entry point -->
<xsl:template match="/">
<xsl:choose>
<xsl:when test="$render_mode='full'"><xsl:apply-templates mode="full"/></xsl:when>
<xsl:when test="$render_mode='threads'"><xsl:apply-templates mode="threads"/></xsl:when>
<xsl:when test="$render_mode='replies'"><xsl:apply-templates mode="replies"/></xsl:when>
<xsl:when test="$render_mode='replies_diff'"><xsl:apply-templates mode="replies_diff"/></xsl:when>
<xsl:when test="$render_mode='navigator'"><xsl:apply-templates mode="navigator"/></xsl:when>
<xsl:when test="$render_mode='notices'"><xsl:apply-templates mode="notices"/></xsl:when>
<xsl:when test="$render_mode='amazon'"><xsl:apply-templates mode="amazon"/></xsl:when>
<xsl:when test="$render_mode='storage'"><xsl:apply-templates mode="storage"/></xsl:when>
</xsl:choose>
</xsl:template>

<!-- full content -->
<xsl:template match="futaba" mode="full">
<html lang="ja">
	<head>
		<meta http-equiv="Content-type" content="text/html; charset=UTF-8"/>
		<meta http-equiv="Content-Script-Type" content="text/javascript"/>
		<meta http-equiv="Content-Style-Type" content="text/css"/>
		<title data-binding="xpath:/futaba/meta/title"></title>
		<link rel="prev" href="{meta/link[@rel='prev']}"/>
		<link rel="next" href="{meta/link[@rel='next']}"/>
		<style type="text/css">
/*
 * commons
 */

body {
	margin:0;
	padding:8px;
	background-color:#ffe;
	color:#800;
	overflow-x:hidden;
	overflow-y:scroll;
}

a {
	color:#46a;
}

a.js {
	color:#682;
}

a:hover {
	color:#d44;
	text-decoration:underline;
}

hr {
	margin:16px 0 16px 0;
	padding:0;
	height:1px;
	border-style:solid none none none;
	border-color:#e0d0c6;
	border-width:1px;
	color:silver;
}

.hide {
	display:none !important;
}

.storage-image {
	display:inline-block;
	width:20px;
	height:20px;
	vertical-align:text-bottom;
	text-indent:100%;
	overflow:hidden;
	white-space:nowrap;
}

.storage-image:hover {
	opacity:.3;
}

.dropbox-image {
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAADkElEQVQ4y5WUW2xUVRSGv733OWem0+nQDpA2SrX0pRoSKRVvWDFavMWY8CKahgZDtNFEnvASE1sNUQR8UOFZTUzkRRAN4aYikRoSTOWFxIIUC1InobXtlN5m5px9lg+nnc5UauJ+29n/Xln/v/5/Kbozws2OAAr+75suvRQxgbCsUkMgOCUIrQALqbiOigootUhBo2cffeH9J1P0vryM9pYEwXRI3FG4RhH6wupbXX7pXMqXz1bjOQqxgmdUSVPdGTEabCA0pF2Obq7hjuUOCrACO05NsuPEDTDw9Ko4B59PEzPR5+GpkPYDWX64kMOJK4IQDA9vf1cD2x5IcrwjTXWFQqNQCkKBtkaPigpFXcpw4LkaQhGMjjryDLywJkHtEs2PAwV8C5oQHm2M8clTKUTAUQoU2BAcDX3DAf0jlpwVTl8pFOmFAq6Junrlnkq2rklEmtKdEazQujLGsY40SW9ejz0/T7Hv7BSDQz4oRbJKs7UlwYePV+EZhQ0j7bccyvLFuRlQcwVnrVBXZTjzYhpQbPpqjN5BPxJaRUOdm+ztacPnG6tZV+/R+tkIvYOFokWcObuIguFpy/YTkzSmDb3X/KIPZIGvro5advZM0lrvci5TmO0swjkA4gtuXLFzQ4rX1lUCsKHR4+2TE/z6RwHiCqPBToc01Lm89VCSzrUJAO5d4dHxdZaRrAVPAV0Zado7JN9fzomIiG9FbCgiIjI6E8qungnR72SEN/6SV4+My8BYICIRxrcRrm/Yl/Wf/i10ZcRBogTcVesW06BnNauJK95sTdJc5zKeFzatiheTp9V8spqWOlTODlOjoW8ooHb3dfafnyEIy6P927Dl8MU8xy/lOX21UBbREDhzzWf5nusc68vNT1kp8IwiP27ZuDZB1/oqWm5xOHopz09XCux+rAqAXT1TrEhpNq+uYGDMsvfsFB+fmsBJaESiZKnSbeMZRRAK77Wl6B8JuL/e5aW7EwgQWME1isMX83xzIceDt3l0fpvFaEXBzrNySukFoeBqRUO1Ztt9KSpcVaToGoUAzzTFeGSlx+VRS8JTTPuy+PoKBfJWaN8/xpZDWUamQxaut4m88EHPJM37hpjICbYcUk65lHohF5JMaj56YgkdzXFiRnHk9zyvf3eDvj8LeElTRvU/C87ZJxQgL7TdGac6rjh4PgcIxlX/6uymGi6kD0BMcbI/DyJgFLB4MYB/AKLUj0saIX8DAAAAAElFTkSuQmCC) left top no-repeat;
}

.gdrive-image {
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozMUVFREM3NzBBMjA2ODExOTJCMDk0RkE2RERFODM4NCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpEM0JDOEIzNzYxNkUxMUUxOEE3M0Y2ODM4QUI4MjJCMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpEM0JDOEIzNjYxNkUxMUUxOEE3M0Y2ODM4QUI4MjJCMSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjA0ODAxMTc0MDcyMDY4MTFBN0JBQUQzNzI5Qjg2QkI5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjMxRUVEQzc3MEEyMDY4MTE5MkIwOTRGQTZEREU4Mzg0Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+mS7PCAAAAvhJREFUeNqsVE1rFEEQre6Z2Y8kmwxEQRRkc4sXJRAhgkpC/sB6TQyI6D37C8KePWwi3vyYCDFX96IXEZd4CwjBg3jbPSi6iMkkEc3OTHf7qiezmESDhwxTXT3T3a9fvapuYYyhk3zE337mHs74swPbrQfnvvsCM4SQ3OC1H7wshBvJT6yFh9fKf2y08Gxn0G9u5y2YkA5JmJCu9VJKbCQX/oth7tFMmQy1wIcmaJdejG6S57rYWqTgIltipRrxLr9uH8tQChmAAUlH0PpegVa+9RE50rITjmvZ2j4MTXAsw2IwV4F7bqXiob2EBlVC7y5u0ekiA8nUmJ9RZLSG1ze88VeNIwyLT+d8RFRnZhKMHLacSz+lR/e+lsgIJ2X3h08TRPVofdo/AoixeSFF2QJyyNDMBaDrubQSltoAaBtMN+DHldYrNmPKaOYPhAx2ZYC1GMQaqEojCDxIdjWRpqlPY5s8+Q0JhkSoWqVhQ5K0r0cKV9baGcO66DGFejajlNVdo3P7SdMbazS7sW5EkSKldKofDA2llHWd17uF4OYkviomTYMdI20seaN0KIyuZuHsRUkVPye1Uj6zyzmGci4LYcErP99OTEocvcCCoLGbYVcNQK0MqThZ6twKenU2fPVlW6tkCUZxlNDOj4g2wy6FuxH96ipKlAlE/vFsi5Nho+OSEJwpQf7n6zTcmSLX5cTkycv32czx5hdK7ylONCloB7akksRumJfdtosZNTALOF4Ii4Qg9GiIBr6McyBA91A+/faU8JjGvA87lyiGjknCrGBRjKg0Y9Zk987qstGmmYZrbLhDrWkSSQEnwyPh9dtSsYCOg0Pj9MDthUEiO47Nj/fPLmdZrhqrIUTePk/FrVEQ6yOZK/WOrdmvsoM+LeD9Aq/2Cju6u7oBt8j9U60KCbeIkbzVixkrdBSSFMcIz2qXJs5WS3qfLoLdxuHLoTbUuRZ6+gyS41lN2BQWMkgMrTJLVAq6X4t8J9Z6hE/6xpZ0ws9vAQYAQCF0tPYEaqAAAAAASUVORK5CYII=) left top no-repeat;
}

.onedrive-image {
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAACO0lEQVQ4y8WUzUtUURjGf+85Z+7MnSZHrSnJhmgIkwxDbJNBBfYBLsJFEFRTf4HRLoiypdAqCINoEYFEmxL6ACFoY4sEDSoiFAuDMiErLdMZ5957WowNY2NOC8Fne3if8/J8vOK2PbCsIBQrjNUjVEoQWSFCEQgCi7WUJTVLDSsRLOD7lmhEkz6YpGlbnIlvWe4/G2dwZArX0QS21E8pdjm/CWSyPpGIxmjh+bX9NGxZu2jozJUh7j79hNayPGHOC7h0ajud6XoAZuY8QkYxNDLFr6xHNKypq42RqAyz6Xgf33/mSiQoaOgHlhOtSTrT9Xi+JecF+AFcvv0WJ6RIxMMoEa72vude/zhVsRCZjIdWUqqhAJ5vOdScAEArQUToeTxGR3uKdRUOIaOwFhpTFbx894OB7gPc6vvA+ZtvEMAWE1rgzoVmjuzeWHDyxqMxRsdnqV3vLt5AG1oaqrEWOtpTVMUc0l2DuBGdf5/L+Fw/t4tj+2oLZGe7X3PxZB2JeHjZKM17AXt3VhON6MKGCgX1yRh+YDFaGP44Q93mNWyoDC8Zi2I4RrG1Jspkbxsx16BE8qY8GfqCY/L+fP6aocINFbQsB2vBdTRH99Qwm/Ux0bCmq2eYaETT2pQg5hoeDkxw+nCS/20RwODIFOGQyudQBGYzPhFHoxaC1JiK07KjGinTNSXwYnSa/leTGCOlTREEi8VoxXwuKArEvxEyCs+3pV22FuwCQc4LFrYtr+MfsiWPw98frPqB/Q0bN8Ao0JXD9gAAAABJRU5ErkJggg==) left top no-repeat;
}

/*
 * header
 */

#header {
	position:fixed;
	display:table;
	left:0;
	right:0;
	top:0;
	margin:0;
	padding:0;
	box-sizing:border-box;
	border-style:none none solid none;
	border-width:1px;
	border-color:#e0d0c6;
	background-color:#faf5e6;
	box-shadow:0 0 2px 2px rgba(224,208,198,.5);
	z-index:100;
}

#header > div {
	display:table-cell;
	vertical-align:middle;
	padding:8px 12px 8px 8px;
	font-size:small;
	text-align:left;
}

#header > div:first-child {
	white-space:nowrap;
	width:10%;
}

#header > div:last-child {
	text-align:right;
}

#header h1 {
	margin:0;
	padding:0;
	font-family:"Arial","Helvetica";
	font-size:x-large;
	font-weight:bold;
	line-height:1;
}

#header h1 a {
	color:inherit;
	text-decoration:inherit;
}

#header img {
	vertical-align:text-bottom;
}

/*
 * contents
 */

#content-loading-indicator {
	position:fixed;
	left:8px;
	top:64pt;
	padding:4px;
	color:#792;
	border:2px solid #792;
	border-radius:8px;
	font-size:large;
	font-weight:bold;
	white-space:pre-wrap;
}

#content-loading-indicator.error {
	color:#d00;
	border-color:#d00;
}

#content {
	margin:40pt 0 0 0;
	position:relative;
	left:0;
	transition-property:left;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
	background-color:#ffe;
}

#content.init {
	left:110%;
}

#content > article {
	display:table;
	width:100%;
}

#content > article > div {
	display:table-cell;
	vertical-align:top;
	padding:0 12px 0 0;
}

.page-mode-header {
	margin:0 0 16px 0;
	padding:4px;
	color:#fff;
	border-radius:4px;
	font-weight:bold;
	text-align:center;
	line-height:1;
	text-shadow:0 1px 3px rgba(0,0,0,.75);
}

.page-mode-header.reply-mode {
	background-color:#c06040;
}

.page-mode-header.catalog-mode {
	background-color:#48c;
}

.topic-wrap .sub,
.reply-wrap .sub {
	color:#cc1105;
}

.topic-wrap .sub.def_false,
.reply-wrap .sub.def_false {
	font-size:medium;
	font-weight:bold;
	white-space:normal;
}

.topic-wrap .name,
.reply-wrap .name {
	color:#117743;
}

.topic-wrap .name.def_false,
.reply-wrap .name.def_false {
	font-size:medium;
	font-weight:bold;
	white-space:normal;
}

.topic-wrap .postdate,
.reply-wrap .postdate {
}

.topic-wrap .postno,
.reply-wrap .postno {
	color:#800;
	text-decoration:none;
}

.topic-wrap .email,
.reply-wrap .email {
	color:#00f;
}

.topic-wrap .repdigit,
.reply-wrap .repdigit {
	font-weight:bold;
	font-style:italic;
	text-decoration:underline;
	color:#f84;
}

.topic-wrap span.user-id,
.reply-wrap span.user-id {
	font-weight:bold;
}

.topic-wrap span.user-id + span,
.reply-wrap span.user-id + span {
	margin:0 0 0 4px;
	font-size:small;
}

.topic-wrap div.user-id,
.reply-wrap div.user-id {
	clear:left;
	margin:-1em 0 0 0;
	text-align:right;
}

.topic-wrap .mark,
.reply-wrap .mark {
	color:#f00;
}

.topic-wrap .del,
.reply-wrap .del {
	margin:0 0 0 .5em;
}

.topic-wrap q,
.reply-wrap q {
	color:#789922;
	quotes:none;
}

.topic-wrap q a,
.reply-wrap q a {
	color:#447788;
}

/* links */
.topic-wrap .reply-link a {
	margin:0 0 0 8px;
	padding:2px 4px 2px 4px;
	background-color:#792;
	color:#fff;
	border-radius:4px;
	line-height:1;
	font-size:medium;
	font-weight:bold;
}

.topic-wrap .reply-link a:hover {
	background-color:#d00;
	color:#fff;
	text-decoration:none;
}

.topic-wrap .link-futaba img,
.reply-wrap .link-futaba img {
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.topic-wrap .link-futaba img:hover,
.reply-wrap .link-futaba img:hover {
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
}

.topic-wrap .link-siokara,
.reply-wrap .link-siokara {
	display:inline-block;
	margin:0 4px 0 4px;
	padding:4px;
	border:1px solid #ddd;
	border-radius:4px;
	background-color:#fff;
	font-size:small;
	text-align:center;
	line-height:1;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.topic-wrap .link-siokara:hover,
.reply-wrap .link-siokara:hover {
	box-shadow:0 1px 2px 2px rgba(0,0,0,.1);
}

.topic-wrap .link-siokara .save-image,
.reply-wrap .link-siokara .save-image {
	color:#682;
}

/* thread image */
#content > article > .image {
	width:10%;
	font-size:small;
	text-align:center;
	line-height:1.25;
	white-space:nowrap;
}

#content > article > .image img {
	margin:0 0 .5em 0;
	border:none;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

#content > article > .image img:hover {
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
}

#content > article > .image .info-sup {
}

/* topic text */
.topic-wrap {
}

.topic-wrap > div:first-child {
	margin:0 0 1em 0;
	padding:0;
	font-size:small;
	line-height:1;
}

.topic-wrap .comment {
	margin:0 0 1em 0;
	line-height:1.5;
}

.topic-wrap .hidden-indicator {
	margin:0 0 0 1.5em;
	color:#888;
	font-size:small;
}

.topic-wrap .expire-warn {
	margin:0 0 .5em 0;
	padding:1px;
	color:#f00000;
	font-weight:bold;
	border:1px solid red;
	border-radius:4px;
	text-align:center;
}

/* replies text */
<xsl:if test="$page_mode!='reply'">
.replies {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:flex-start;
	align-items:flex-start;
	align-content:flex-start;
	max-width:960px;
}
</xsl:if>

.reply-wrap {
	display:table;
	margin:0 0 8px 4px;
}

.reply-wrap > div {
	display:table-cell;
	vertical-align:top;
}

/* comment leader */
.reply-wrap > div:first-child {
	padding:0 2px 0 0;
}

/* comment body wrapper */
.reply-wrap > div:last-child {
	padding:2px 8px 2px 8px;
	background-color:#f0e0d6;
	border-radius:4px;
	word-wrap:break-word;
	overflow-wrap:break-word;
	box-shadow:0 1px #d9bfb7;
}

.reply-wrap > div:last-child.deleted {
	background-color:#fca;
}

/* comment header */
.reply-wrap > div:last-child > div:first-child {
	margin:0 0 1em 0;
	padding:0;
	font-size:small;
	white-space:nowrap;
	line-height:1;
}

/* comment body */
.reply-wrap > div:last-child > div.comment {
	margin:0 1em 1em 2em;
	line-height:1.5;
}

.reply-wrap a.del {
	visibility:hidden;
}

.reply-wrap:hover a.del {
	visibility:visible;
}

.reply-wrap a.sodane-null {
	visibility:hidden;
}

.reply-wrap:hover a.sodane-null {
	visibility:visible;
}

.reply-wrap span.no {
	margin:0 4px 0 0;
	color:#c40;
	font-weight:bold;
}

.reply-wrap .email {
	margin:0 0 0 2em;
}

/* thread footer */
.thread-footer {
	clear:both;
	margin:0 0 0 1.5rem;
	font-size:small;
}

.thread-footer > div:first-child {
	margin:0 0 12px 0;
}

.thread-footer .expire-warn {
	color:red;
	font-weight:bold;
}

.thread-footer .reloader-wrap {
	margin:12px 12px 0 0;
}

.thread-footer a.reloader {
	margin:0 12px 0 0;
	font-size:medium;
	font-weight:bold;
}

.topic-wrap.hilight, .reply-wrap > .hilight {
	background-color:#ea8 !important;
}

/*
 * reply image
 */

.reply-image {
	float:left;
	margin:0 8px 8px 0;
	font-size:small;
	text-align:center;
	line-height:1.25;
	white-space:nowrap;
}

.reply-image img {
	margin:0 0 .5em 0;
	border:none;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.reply-image img:hover {
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
}

.reply-image > div {
}

/*
 * inline video
 */

#content .inline-video-container {
}

#content .inline-video {
	background-color:#666;
}

#content .inline-video-container .youtube {
	width:420px;
	height:315px;
}

#content .inline-video-container .nico2 {
	width:312px;
	height:176px;
}

/*
 * aside
 */

#content > article > div:last-child {
	width:250px;
	padding:0;
}

/*
 * footer
 */

#footer {
	font-size:small;
	text-align:center;
}

#footer .amazon {
	display:flex;
	margin:8px auto 16px auto;
	max-width:600px;
	padding:8px;
	border:1px solid #ccc;
	border-radius:4px;
	box-sizing:border-box;
	text-align:left;
}

#footer .amazon > a img {
	margin:0 8px 0 0;
	border:1px solid silver;
}

#footer .amazon > div > div {
	text-indent:-9999px;
}

#footer .credit {
	margin:16px 0 32px 0;
}

/*
 * post form
 */

#postform-wrap {
	position:fixed;
	left:25%;
	right:25%;
	bottom:0;
	font-size:small;
	box-shadow:0 0 8px 2px rgba(0,0,0,.3);
	background-color:#ffe;
	border-radius:4px 4px 0 0;
}

#postform-wrap .postform {
	overflow-y:hidden;
	max-height:0;
	border-bottom:1px solid #ea8;
	transition-property:max-height;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
	box-sizing:border-box;
}

#postform-wrap .postform fieldset {
	margin:0;
	padding:0;
	border:0;
}

#postform-wrap.hover .postform {
	max-height:1200px;
}

#postform-wrap .postform .status {
	padding:4px;
	background-color:#ea8;
	border-radius:4px 4px 0 0;
	font-weight:bold;
	text-align:center;
	line-height:1;
}

#postform-wrap .postform table {
	margin:0;
	padding:0;
	width:100%;
	border-collapse:separate;
}

#postform-wrap .postform th {
	padding:4px;
	background-color:#ea8;
	width:3%;
	white-space:nowrap;
	font-weight:bold;
	text-align:left;
}

#postform-wrap .postform td {
	padding:1px;
}

#postform-wrap .postform td.thin {
	width:3%;
	white-space:nowrap;
}

#name, #email, #sub, #com, #upfile {
	display:block;
	box-sizing:border-box;
	width:100%;
}

#name {
	color:#117743;
	font-weight:bold;
}

#email {
	color:#00f;
}

#sub {
	color:#cc1105;
	font-weight:bold;
}

#com {
	margin:0;
	padding:0;
	border:none;
	outline:none;
	background-color:#ffe;
	color:#800;
	resize:none;
	line-height:1.2;
}

#postform-wrap .comment-wrap {
	box-sizing:border-box;
	width:100%;
	margin:0;
	padding:4px;
	border:1px solid #ea8;
}

#postform-wrap .comment-info {
	padding:4px 0 0 0;
	font-size:small;
	line-height:1;
	text-align:right;
}

#postform-wrap .comment-info span {
	padding:0 0 0 8px;
}

#postform-wrap .comment-info span.warn {
	color:#d00;
	font-weight:bold;
}

#comment-backend {
	visibility:hidden;
	position:fixed;
	left:0;
	top:0;
	padding:0;
	background-color:#fff;
	color:#000;
	line-height:1.2;
	font-size:small;
	white-space:pre-wrap;
}

#pwd {
	width:8em;
}

#postform-wrap .nav {
	display:table;
	width:100%;
	box-sizing:border-box;
	background-color:#ffe;
	line-height:1;
}

#postform-wrap .nav > div {
	display:table-cell;
	padding:4px;
}

#postform-wrap .nav-links a,
#postform-wrap .nav-links span {
	display:inline-block;
	margin:0 2px 0 0;
	padding:2px 4px 2px 4px;
}

#postform-wrap .nav-links a {
	text-decoration:none;
	background-color:#f0e0d6;
}

#postform-wrap .nav-links a:hover {
	background-color:#ea8;
}

#postform-wrap .nav-links .current {
	background-color:#ea8;
	color:#800;
	font-weight:bold;
}

#postform-wrap .nav > div:last-child {
	text-align:right;
}

#replies-total, #replies-mark, #replies-id {
	font-weight:bold;
}

.post-image-thumbnail-wrap {
	position:fixed;
	width:25%;
	left:0;
	bottom:0;
	text-align:right;
	opacity:0;
	transition-property:opacity;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.post-image-thumbnail-wrap.run {
	opacity:1;
}

.post-image-thumbnail {
	margin:0 8px 8px 0;
	border:8px solid #ffe;
	border-radius:4px;
	box-shadow:0 0 8px 2px rgba(0,0,0,.5);
}

/*
 * aside
 */

#ad-aside-wrap {
	position:fixed;
	width:210px;/*468-258*/
	top:40pt;
	right:0;
	overflow-x:hidden;
	opacity:.1;
	text-align:right;
	transition-property:width,opacity;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

#ad-aside-wrap div {
	margin:0 0 4px auto;
}

#ad-aside-wrap iframe {
	background-color:#f0e0d6;
}

#ad-aside-wrap:hover {
	opacity:1;
	width:468px;
	overflow-x:visible;
}

#ad-aside-wrap div.size-large {
	position:relative;
	left:0;
	transition-property:left;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

#ad-aside-wrap div.size-large:hover {
	left:-260px;
}

#panel-aside-wrap {
	position:fixed;
	display:flex;
	flex-direction:column;
	width:24%;
	top:40pt;
	right:-24%;
	bottom:8pt;
	background-color:rgba(255,255,238,.6);
	border-radius:4px 0 0 4px;
	box-shadow:0 0 8px 2px rgba(0,0,0,.3);
	transition-property:right;
	transition-duration:.4s;
	transition-timing-function:cubic-bezier(0, 1, 1, 1);
	transition-delay:0;
}

#panel-aside-wrap.run {
	right:0;
}

#panel-aside-wrap .panel-header {
	padding:4px;
	background-color:#ea8;
	color:#800;
	font-size:small;
	font-weight:bold;
	line-height:1;
	text-align:center;
	border-radius:4px 0 0 0;
	border-bottom:1px solid #a84;
}

#panel-aside-wrap .panel-tab-wrap {
	padding:8px 0 0 0;
	background-color:rgba(0,0,0,.3);
	text-align:center;
	box-shadow:0 2px 4px -1px rgba(0,0,0,.25) inset;
}

#panel-aside-wrap .panel-tab-wrap > a {
	display:inline-block;
	margin:0 4px 0 0;
	padding:4px 8px 0 8px;
	background-color:#400;
	color:#ccc;
	border-radius:4px 4px 0 0;
	box-shadow:0 -1px 3px rgba(0,0,0,.25);
	font-size:x-small;
	line-height:1;
	text-decoration;none;
}

#panel-aside-wrap .panel-tab-wrap > a.active {
	background-color:#ffe;
	color:#800;
}

#panel-aside-wrap .panel-tab-wrap > a:not(.active):hover {
	background-color:#800;
	text-decoration:none;
}

#panel-aside-wrap .panel-content-wrap {
	flex:1;
}

#panel-aside-wrap .panel-content-wrap > div {
	box-sizing:border-box;
	padding:8px;
	font-size:small;
	overflow-y:auto;
	height:300px;
}

/*
 * panel content: mark and id statistics
 */

#panel-aside-wrap #panel-content-mark h2 {
	marglin:0 0 4px 0;
	padding: 0 0 4px 0;
	border-bottom:1px solid silver;
	line-height:1;
	font-size:large;
	font-weight:bold;
}

#panel-aside-wrap #panel-content-mark h2 span {
	margin:0 0 0 4px;
	font-size:medium;
	font-weight:normal;
}

#panel-aside-wrap #panel-content-mark ul {
	margin:0;
	padding:0 0 0 1em;
}

#panel-aside-wrap #panel-content-mark li {
	line-height:1.5;
}

#panel-aside-wrap #panel-content-mark li p {
	margin:1em 0 4px 0;
}

#panel-aside-wrap #panel-content-mark li p.sub-header {
	font-weight:bold;
	border-bottom:1px dotted silver;
}

#panel-aside-wrap #panel-content-mark li p.sub-header span {
	margin:0 0 0 4px;
	font-weight:normal;
}

#panel-aside-wrap #panel-content-mark li span.a {
	display:inline-block;
	margin:0 4px 4px 0;
	padding:4px;
	border:1px solid #ccc;
	border-radius:3px;
	background-color:#fff;
	color:#555;
	line-height:1;
	font-size:x-small;
}

#panel-aside-wrap #panel-content-mark li span.new {
	font-weight:bold;
}

#panel-aside-wrap #panel-content-mark li span.a:hover,
#panel-aside-wrap #panel-content-mark li span.new:hover {
	background-color:#fec;
}

/*
 * panel content: search
 */

#panel-aside-wrap #panel-content-search .search-form {
	display:flex;
}

#panel-aside-wrap #panel-content-search input[type="text"] {
	flex:1;
	box-sizing:border-box;
	margin:0;
}

#panel-aside-wrap #panel-content-search #search-result-count {
	margin:8px 0 4px 0;
	padding:0;
	font-size:small;
	text-align:right;
	line-height:1;
}

#panel-aside-wrap #panel-content-search #search-result {
	height:300px;
}

#panel-aside-wrap #panel-content-search #search-result > div {
	margin:0 0 4px 4px;
	padding:4px;
	border:1px solid #ccc;
	border-radius:3px;
	background-color:#fff;
	color:#555;
	line-height:1.1;
	font-size:x-small;
}

#panel-aside-wrap #panel-content-search #search-result > div:hover {
	background-color:#fec;
}

/*
 * viewport size caclulator
 */

#viewport-rect {
	position:fixed;
	left:0;
	top:0;
	right:0;
	bottom:0;
}

/*
 * lightbox
 */

.lightbox-wrap {
}

.lightbox-wrap > div {
	position:fixed;
	left:0;
	top:0;
	right:0;
	bottom:0;
	z-index:200;
}

.lightbox-wrap .dimmer {
	background-color:rgba(0,0,0,0);
	transition-property:background-color;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.lightbox-wrap .dimmer.run {
	background-color:rgba(0,0,0,.75);
}

.lightbox-wrap .image-wrap img {
	position:fixed;
	border:none;
	transition-property:left,top,width,height;
	transition-duration:.5s;
	transition-timing-function:ease-out;
	transition-delay:0;
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFEAkjBaAOh8kAAAArSURBVCjPY3zw4AEDNiAvL49VnImBRDCqgRjA+P//f6wSDx8+HA0l+mkAAJ4dCLzVvF8ZAAAAAElFTkSuQmCC) left top repeat fixed #888;

}

.lightbox-wrap .image-wrap img.dragging {
	transition:none;
}

.lightbox-wrap .loader-wrap {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:center;
	align-items:center;
	align-content:center;
}

.lightbox-wrap .loader-wrap div {
	position:relative;
	text-align:center;
	color:#888;
	line-height:1;
}

.lightbox-wrap .info {
	display:table;
	margin:0 auto 0 auto;
	padding:8px;
	background-color:rgba(0,0,0,.5);
	color:#aaa;
	border-radius:0 0 4px 4px;
	font-size:small;
	text-align:center;
	text-shadow:0 1px #000;
	line-height:1;
}

.lightbox-wrap .info a {
	color:#8ac;
}

.lightbox-wrap a.selected {
	background-color:#ea8;
	color:#800;
	padding-left:4px;
	padding-right:4px;
	border-radius:4px;
	text-shadow:none;
}

/*
 * modal dialog
 */

.dialog-wrap {
}

.dialog-wrap > div {
	position:fixed;
	left:0;
	top:0;
	right:0;
	bottom:0;
	z-index:200;
}

.dialog-wrap .dimmer {
	background-color:rgba(0,0,0,0);
	transition-property:background-color;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.dialog-wrap .dimmer.run {
	background-color:rgba(0,0,0,.5);
}

.dialog-wrap .dialog-content-wrap {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:center;
	align-items:center;
	align-content:center;
	opacity:0;
	transition-property:opacity;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
}

.dialog-wrap .dialog-content-wrap.run {
	opacity:1;
}

.dialog-wrap .dialog-content-wrap > div {
	position:relative;
	border-radius:12px;
	box-shadow:0 0 1px 8px rgba(0,0,0,.2);
	background-color:#ffe;
}

.dialog-wrap .dialog-content-title {
	padding:8px 8px 6px 8px;
	border-radius:12px 12px 0 0;
	background-color:#faf5e6;
	color:#600;
	font-weight:bold;
	font-size:large;
	line-height:1;
	text-align:center;
}

.dialog-wrap .dialog-content-title-ex {
	position:absolute;
	left:0;
	top:0;
	right:0;
	padding:8px 8px 6px 8px;
	border-radius:12px 12px 0 0;
	font-size:large;
	line-height:1;
	text-align:right;
	box-shadow:0 1px 4px rgba(0,0,0,.75);
}

.dialog-wrap .dialog-content-title-ex a {
	color:#800;
}

.dialog-wrap .dialog-content {
	margin:0;
	padding:8px;
	border-bottom:1px solid #aaa;
	overflow-y:auto;
	color:#800;
	font-size:medium;
	box-sizing:border-box;
}

.dialog-wrap .dialog-content-footer {
	padding:8px;
	border-top:1px solid #fff;
	border-radius:0 0 12px 12px;
	background-color:#faf5e6;
	color:#888;
	font-size:small;
	text-align:center;
	line-height:1;
}

.dialog-wrap .dialog-content-footer > a {
	display:inline-block;
	min-width:4em;
	margin:0;
	padding:6px 8px 4px 8px;
	background-color:#fff;
	color:#333;
	box-shadow:0 0 4px 2px rgba(0,0,0,.25);
	line-height:1;
	text-align:center;
	text-decoration:none;
	transition-property:background-color;
	transition-duration:.2s;
	transition-timing-function:ease-in;
	transition-delay:0;
}

.dialog-wrap .dialog-content-footer > a + a {
	margin-left:8px;
}

.dialog-wrap .dialog-content-footer > a:hover {
	background-color:#789922;
	color:#fff;
}

.dialog-wrap .close-button {
	display:inline-block;
	width:16px;
	height:16px;
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gEUEjUEvAVPNgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABYklEQVQ4y53SsWpUYRAF4O//b7IorGARUcJFDabSQhSNGBVlWYMpNdin8Bl8AAt9CtHWQlIaNmhlIjZqK+jiRgMqgoUouHf3/hYSDHc3bOJpBmYOZ+YcJkCDep2FGrkd4DedHzxCLzTYN8P6HvbbBbr8vEs9O8lizk27R5jgV6wx5f8QahyKwyYfWYY+RUkJHZaGcQcEOizdZ36NUxnjkfic6Qfc+MLLKn+s2jjC9SaHW7zJaPbY6NG+yomDnEukQNhWoE9xnveRmSc8hWtcOsuzkjJWrh4QCGSRmOhuafcyxhJppIVIXOVYwYd5LhdsLPOi5PQsr6pXDIT4jocrtGscP8PKLG+bTLV4/YnWSAvTLN5iMmeupAyEi7RzHk/SHGkhkXLmEmlzW0l5lIWhf9BlvRJi2Fo3cxkSdij4GhrUL/A90Q9kO/rhv+LhDlmAK+w9wO1xJv5xtkXq8vkb9xD+AOHYXW4xOWs8AAAAAElFTkSuQmCC) center center no-repeat transparent;
}

.dialog-wrap .close-button:hover {
	background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gEUEjUggAar5wAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAB+0lEQVQ4y51TXUiTYRQ+532/bSwdeZFRsr4y3foxiMZMK7SI9a3EQSaSYMWk6CJvukoozQrCoLtBRDdRjKAuQvoPIyECI4TUixCMphPUKBCK1rd9P+d0UaOa86/n8pzDw/Oc8xwEAOho1gqLizyNBS6nFxaBVDqTnJr5dg8ALDzXrHlOhHdMLC9wF8ESkEobqTXHzhfKw7WBaKVfbYIlAgHQV1L8Q3jcrlL4DyACLnM5V4l8zYHR5HMAANOyTSIiAID+kbGefLOzCPpHxnrCHdcPXHv0eptDkQ4hhIg9eFVe33Xj0Pvk9NvceSW3sHNTaUNXy361M/5kyOmQIT1jTuqGmbh4pK6iYu3qKmZmRMQ5CUzLNtvqaz4qQmxvv/nwJQBAdzRSczxc3UdEJIQQ8yqQAqUQQhCDka0xs6VIqTAzL2jht+cy3TDHr7RGduuGNXn29uM3NlGgLVL7LlfFLIK+4dFbF+48S1w6WreldV/1CylQMnN5Z/zpYNXGdb1Bn6rNq2DvVn+09/KpkqBP1YiIEBFPH9yTqPSr9wNl3tCCFpiZgz5VY2bOSiUi2rV5fWPeHHzXMxP/JuzXif4+Ve7ms33dMD8r0zNf45Ztx2xiWwqUi4sxIgLgydjdqwgA0N4Ucm/wrjzjdjpW/PmVOcGptPHpw9SXbgDAnxtuvrX9XjIyAAAAAElFTkSuQmCC) center center no-repeat transparent;
}

/*
 * rule
 */

.rule {
	margin:4px 0 0 4px;
	padding:4px;
	border-style:solid none none none;
	border-width:1px;
	border-color:#ea8;
	font-size:small;
}

/*
 * wheel status
 */

.wheel-status {
	position:fixed;
	left:8px;
	bottom:8px;
	line-height:1;
	font-size:small;
}

.wheel-status img {
	border:none;
}

/*
 * catalog
 */

#catalog {
	margin:40pt 0 0 0;
	position:relative;
	left:0;
	background-color:#ffe;
}

#catalog .catalog-options {
	margin:0 0 8px 0;
	font-size:small;
	text-align:center;
}

#catalog .catalog-options > div {
	margin:0 0 8px 0;
}

#catalog .catalog-options span + span:before {
	margin:0 0 0 8px;
	content: " | ";
}

#catalog .catalog-options input[type="text"] {
	font-size:small;
	width:3em;
}

#catalog .catalog-options a.active {
	font-size:medium;
	font-weight:bold;
}

#catalog .catalog-threads-wrap > div {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:center;
	align-items:stretch;
	align-content:flex-start;
	margin:0 auto 0 auto;
	transition-property:opacity;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0;
	opacity:1;
}

#catalog .catalog-threads-wrap > div.run {
	opacity:.5;
}

#catalog .catalog-threads-wrap > div > a {
	display:block;
	box-sizing:border-box;
	margin:0 2px 2px 0;
	padding:2px;
	border:1px inset #ccc;
	font-size:small;
	line-height:1;
	/*width:60px;*/
	text-align:center;
	color:#800;
	text-decoration:none;
}

#catalog .catalog-threads-wrap img {
	margin:0 0 2px 0;
}

#catalog .catalog-threads-wrap a:link { background-color:#ffe; }
#catalog .catalog-threads-wrap a:visited,
#catalog .catalog-threads-wrap a.soft-visited { background-color:#f0e0d6; border-color:#f0e0d6; }
/*#catalog .catalog-threads-wrap a:hover { background-color:#fc6; }*/
#catalog .catalog-threads-wrap a:active { background-color:#ea8; }
#catalog .catalog-threads-wrap a.new { background-color:#cfc; border-color:#cfc; }
#catalog .catalog-threads-wrap a.long { background-color:#cfc; border-color:#cfc; }
#catalog .catalog-threads-wrap a.warned { border:2px solid #d00; padding:1px; }

#catalog .catalog-threads-wrap .info {
	padding:1px;
	color:#789922;
}

#catalog .catalog-threads-wrap .info span:nth-child(2) {
	color:#d00;
	font-size:x-small;
}

img.catalog-popup {
	position:absolute;
	box-shadow:0 0 4px 4px rgba(0,0,0,.25);
	cursor:pointer;
	transition-property:left,top,width,height;
	transition-duration:.25s;
	transition-timing-function:ease-out;
	transition-delay:0;
	z-index:100;
}

div.catalog-popup {
	position:absolute;
	padding:4px;
	background-color:#ffe;
	border:1px solid #ea8;
	border-radius:4px;
	box-shadow:0 0 4px 4px rgba(0,0,0,.25);
	box-sizing:border-box;
	font-size:x-small;
	transition-property:opacity;
	transition-duration:.5s;
	transition-timing-function:ease-out;
	transition-delay:0;
	opacity:0;
	z-index:100;
}

div.catalog-popup.run {
	opacity:1;
}

div.catalog-popup span {
	display:block;
	color:#789922;
	text-align:center;
}

/*
 * quote popup
 */

#quote-popup-pool .quote-popup {
	position:absolute;
	box-sizing:border-box;
	border:1px solid #ea8;
	border-radius:3px;
	padding:4px 4px 0 4px;
	background-color:#ffe;
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
	font-size:small;
}

.highlight.topic-wrap,
.highlight.reply-wrap > div:last-child {
	color:HighlightText !important;
	background-color:Highlight !important;
}

#quote-popup-pool .quote-popup .jumpto-quote-anchor {
	margin-right:.5em;
	font-weight:bold;
}

/*
 * selection menu
 */

#selection-menu {
	position:absolute;
	background-color:#eee;
	border:1px solid silver;
	font-size:small;
	z-index:300;
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
}

#selection-menu > a {
	margin:0;
	padding:4px;
	line-height:1;
	text-decoration:none;
	color:#333;
	cursor:pointer;
}

#selection-menu > a:hover {
	background-color:highlight;
	color:highlighttext;
}

#selection-menu > a.l {
	display:block;
}

#selection-menu > a.i {
	display:inline-block;
}

#selection-menu > a.i img {
	border:1px solid #eee;
}

#selection-menu > div {
	overflow:hidden;
	height:0px;
	margin:2px 0 2px 0;
	border-top:1px solid silver;
	border-bottom:1px solid #fff;
}
		</style>
		<style id="dynstyle-comment-maxwidth"></style>
	</head>
	<body>
		<header id="header">
			<div>
				<h1><a href="{meta/board_top}" data-binding="xpath:/futaba/meta/title"></a></h1>
			</div>
			<div>
				現在<span id="viewers" data-binding="xpath:/futaba/meta/viewers"></span>人くらいが見てます.
				&#160; <a class="js" href="#catalog">カタログ</a>
				&#160; <a class="js" href="#delete-post">記事削除</a>
				<xsl:if test="$page_mode='reply'"> &#160; <a class="js" href="#track">自動追尾</a></xsl:if>
			</div>
			<div>
				<a href="{meta/home}" target="_top">ホーム</a>
				<xsl:if test="meta/board_top"> &#160; <a href="{meta/board_top}">掲示板に戻る</a></xsl:if>
				&#160; <a class="js" href="#toggle-panel">パネル</a>
				&#160; <a class="js" href="#config">設定</a>
				&#160; <a class="js" href="#help">?</a>
				&#160; <span data-binding="template:storage"></span>
			</div>
		</header>
		<div class="hide" id="content-loading-indicator"></div>
		<div class="init" id="content"><xsl:apply-templates select="thread"/></div>
		<div class="hide" id="catalog">
			<div class="page-mode-header catalog-mode">カタログモード</div>
			<div class="catalog-options">
				<div>
					<span><a class="catalog-order active" href="#catalog-order-default">カタログ</a></span>
					<span><a class="catalog-order" href="#catalog-order-new">新順</a></span>
					<span><a class="catalog-order" href="#catalog-order-old">古順</a></span>
					<span><a class="catalog-order" href="#catalog-order-most">多順</a></span>
					<span><a class="catalog-order" href="#catalog-order-less">少順</a></span>
					<span><a class="catalog-order" href="#catalog-order-hist">履歴</a></span>
				</div>
				<div>
					<span>
						<label>横: <input id="catalog-horz-number" type="text"/></label>
						× <label>縦: <input id="catalog-vert-number" type="text"/> スレッド</label>
					</span>
					<span><label><xsl:element name="input">
						<xsl:attribute name="class">catalog-settings-item</xsl:attribute>
						<xsl:attribute name="id">catalog-with-text</xsl:attribute>
						<xsl:attribute name="data-href">#catalog-with-text</xsl:attribute>
						<xsl:attribute name="type">checkbox</xsl:attribute>
						<xsl:if test="meta/configurations/param[@name='catalog.text']/@value='1'">
							<xsl:attribute name="checked">checked</xsl:attribute>
						</xsl:if>
					</xsl:element>本文も取得</label></span>
				</div>
			</div>
			<div class="catalog-threads-wrap">
				<div id="catalog-threads-wrap-default"></div>
				<div class="hide" id="catalog-threads-wrap-new"></div>
				<div class="hide" id="catalog-threads-wrap-old"></div>
				<div class="hide" id="catalog-threads-wrap-most"></div>
				<div class="hide" id="catalog-threads-wrap-less"></div>
				<div class="hide" id="catalog-threads-wrap-hist"></div>
			</div>
			<hr/>
		</div>
		<footer id="footer">
			<div class="amazon" data-binding="template:amazon"></div>
			<div class="credit">—
			<a href="http://php.s3.to" target="_top">GazouBBS</a>
			+ <a href="http://www.2chan.net/" target="_top">futaba</a>
			/ This page is under control of <a href="http://akahuku.github.io/akahukuplus/" target="_blank">akahukuplus/<xsl:value-of select="meta/version"/></a>
			—</div>
		</footer>
		<div class="wheel-status hide" id="wheel-status"><span>wow</span><img width="10" height="2" src="data:image/gif;base64,R0lGODlhCgACAKECAIAAAP//7v///////yH/C05FVFNDQVBFMi4wAwEAAAAh+QQBGQABACwAAAAACgACAAACBISPmQUAIfkEARkAAAAsAAAAAAoAAgAAAgSMj5kFADs="/></div>
		<div id="ad-aside-wrap">
			<xsl:choose>
				<xsl:when test="meta/configurations/param[@name='banner_enabled']/@value='1'">
					<xsl:for-each select="meta/ads/banners/ad">
						<div class="{@class}">
							<xsl:element name="iframe">
								<xsl:attribute name="frameborder">0</xsl:attribute>
								<xsl:attribute name="width"><xsl:value-of select="@width"/></xsl:attribute>
								<xsl:attribute name="height"><xsl:value-of select="@height"/></xsl:attribute>
								<xsl:attribute name="src"><xsl:value-of select="@src"/></xsl:attribute>
							</xsl:element>
						</div>
					</xsl:for-each>
				</xsl:when>
				<xsl:otherwise>
					<xsl:for-each select="meta/ads/banners/ad">
						<div class="{@class}" data-banner-markup="{@src}"></div>
					</xsl:for-each>
				</xsl:otherwise>
			</xsl:choose>
		</div>
		<div id="panel-aside-wrap" class="hide">
			<div class="panel-header">パネル</div>
			<div class="panel-tab-wrap">
				<a class="panel-tab active" href="#mark">集計</a>
				<a class="panel-tab" href="#search">レス検索</a>
				<a class="panel-tab" href="#notice">注意書き</a>
			</div>
			<div class="panel-content-wrap">
				<div id="panel-content-mark" data-stretch="true">
					<h2>マークの集計</h2>
					<ul>
						<li class="hide"><p>管理人さん<span></span></p><div id="stat-admin"></div></li>
						<li class="hide"><p>なー<span></span></p><div id="stat-nar"></div></li>
						<li class="hide"><p>スレッドを立てた人によって削除<span></span></p><div id="stat-passive"></div></li>
						<li class="hide"><p>書き込みをした人によって削除<span></span></p><div id="stat-active"></div></li>
						<li class="hide"><p>その他の赤字<span></span></p><div id="stat-other"></div></li>
					</ul>
					<h2>ID の集計<span id="stat-id-header"></span></h2>
					<ul id="stat-id"></ul>
				</div>
				<div id="panel-content-search" class="hide">
					<div class="search-form">
						<input type="text" id="search-text"/>
						<button data-href="#search-start">検索</button>
					</div>
					<div id="search-result-count"></div>
					<div id="search-result" data-stretch="true"></div>
				</div>
				<div id="panel-content-notice" class="hide" data-binding="template:notices"></div>
			</div>
		</div>
		<div id="postform-wrap">
			<xsl:if test="meta/postform">
			<div class="postform">
				<div class="status">
				<xsl:choose>
					<xsl:when test="$page_mode='reply'">
						<label><input type="radio" id="post-switch-reply" name="post-switch" value="reply" checked="checked"/>レス送信モード</label>
						<label><input type="radio" id="post-switch-thread" name="post-switch" value="thread"/>スレッドを立てる</label>
					</xsl:when>
					<xsl:otherwise>スレッドを立てる</xsl:otherwise>
				</xsl:choose>
				</div>
				<form id="postform" action="{meta/postform/@action}" method="{meta/postform/@method}" enctype="{meta/postform/@enctype}">
					<fieldset>
					<xsl:for-each select="meta/postform/input[@type='hidden']">
						<input type="hidden" name="{@name}" value="{@value}"/>
					</xsl:for-each>
						<table>
						<xsl:apply-templates select="meta/postform/input[@name='name']"/>
						<xsl:if test="meta/postform/input[@name='email'] and meta/postform/input[@name='sub']">
							<xsl:apply-templates select="meta/postform/input[@name='email']" mode="simple"/>
						</xsl:if>
						<xsl:if test="meta/postform/input[@name='email'] and not(meta/postform/input[@name='sub'])">
							<xsl:apply-templates select="meta/postform/input[@name='email']" mode="composite"/>
						</xsl:if>
						<xsl:apply-templates select="meta/postform/input[@name='sub']"/>
						<tr><th>コメント</th><td colspan="2"><div class="comment-wrap"><textarea name="com" id="com" resize="false" rows="4"/></div><div id="comment-info" class="comment-info">#</div></td></tr>
						<xsl:choose>
							<xsl:when test="meta/postform/input[@name='upfile']">
								<tr>
									<th>添付File</th>
									<td><input type="file" id="upfile" name="upfile"/></td>
									<td class="thin"><label>[<input type="checkbox" id="textonly" name="textonly" value="on" data-href="#clear-upfile"/>画像なし]</label></td>
								</tr>
							</xsl:when>
							<xsl:otherwise>
								<tr>
									<th>添付File</th>
									<td><input type="file" id="upfile" name="upfile" disabled="disabled" data-origin="js"/></td>
									<td class="thin"><label>[<input type="checkbox" id="textonly" name="textonly" value="on" disabled="disabled" data-href="#clear-upfile"/>画像なし]</label></td>
								</tr>
							</xsl:otherwise>
						</xsl:choose>
						<xsl:apply-templates select="meta/postform/input[@name='pwd']"/>
						</table>
					</fieldset>
				</form>
			</div>
			</xsl:if>
			<div class="nav">
				<xsl:if test="$page_mode!='reply'">
				<div class="nav-links" data-binding="template:navigator"></div>
				</xsl:if>
				<xsl:if test="$page_mode='reply'">
				<div class="status">
					<span id="pf-replies-total">-</span><small> レス</small>,
					<span id="pf-replies-mark">-</span><small> マーク</small>,
					<span id="pf-replies-id">-</span><small> ID</small>
					/ <span id="pf-expires" data-binding="xpath:/futaba/thread[1]/topic/expires"></span>
					<small>(<span id="pf-expires-remains" data-binding="xpath:/futaba/thread[1]/topic/expires/@remains"></span>)</small>
				</div>
				</xsl:if>
				<div>
				</div>
			</div>
			<div class="post-image-thumbnail-wrap hide" id="post-image-thumbnail-wrap">
				<img class="post-image-thumbnail" id="post-image-thumbnail"/>
			</div>
			<div id="comment-backend"></div>
		</div>
		<div id="quote-popup-pool"/>
		<div id="selection-menu" class="hide">
			<a class="selmenu l" href="#ss-quote">引用</a>
			<a class="selmenu l" href="#ss-pull">コメントへ</a>
			<div/>
			<a class="selmenu l" href="#ss-copy">コピー</a>
			<a class="selmenu l" href="#ss-copy-with-quote">引用符付きコピー</a>
			<div/>
			&#160;<a class="selmenu i" href="#ss-google"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACKklEQVQ4y22STUhVURSFv3PufVctTAs0AqEkJ0GjiP4gGjjIURBNMoqCIAghGjZo0EwahdEDsQbWpLKaSFCNwhLJKEjKiUKjjOhH6+F7pu/evRrce5/P6sDm7HPO2n/rLNczEN+Q6KusiJUqmBkyYQZJIgqBKHhhEpYIke8gqegOD8SqLItzB439nYZJrMSOwBlRCE/fw60xiML/JsB3tBij52MeTzmOFANG33m62o2WdXBnwjE87ohCgUhX7ip1/OCJmKvPPN9KYvMG494kvJx1bNkIrU0QeOEyPKg+DwA+LMD8IgQeLIbGCG6OpY+9+8SvJWohqiXKbiQ8QFe7UY1Tohziw6cU4DJQalnZ7JwvD+LMAeNnOQXJ0pYBHryB5gjM0g5MqyPkjn8y5WhrgWvHjfKSqCyL4ikxMQPDLwzvM+Yt4y2rrvSA23OlomO7RfcO2NkBDRG8moXTQ8am9ZBYCk6ygHyUfDQfODEyCb2DYuR1/ljHukRiqt3XV0fC/66K2ERHK0zPCRzs3Q6PLvh/WwYw1SgQ4C7dXdTFHsfMFzE9B4GDs4ccJvixCN39VQpBVtnWzm8Sbr5U1tHrCZ8XoCEE76CxIO73hWxrg9vjRv9oQlOomgJVZ/7yw4TvJdHcKKJAhF7EiTg5WOVrCTrbHHGd9teYGWF5mfSrbFWeDlgoi6WqePvRCF3O/l8JAG9Ssab1mpDErq0piUPPYxoKaYDVVZYEZsU/L+6lZpeLrzAAAAAASUVORK5CYII="/></a>
			<a class="selmenu i" href="#ss-amazon"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACBklEQVQ4y42TX0uTYRjGf++a7xqyDIocgxpDBqNBlJ1s5In1BQLxyFGdKOzAvoFHfQDxYB+gA4nhwfDMIwuLyWpRvtAgbTkJo5cIme/GfN2fq4Ph0nTlBc/B8zz3/eO5Lp7bAMQZMgyDQCAAQL1ep91u00/6e01NTWl1dVXValWO42h9fV3T09M6q/YUYHZ2VkdqNBrqdDq9fSqV+jfA5/Npc3NTkrSysqLh4WElEgnt7+9LkrLZ7CmA97iXZrPJzMwMwWCQtbU1bNumVquxu7tLLBbD7/efL4OxsTFlMhlZliXHcXoWlpeX/5/B3NxcryGfz2thYUG2bZ8PEI1G5bquJGlxcbF3XiqVJEm5XO4UwHPcSzwexzRNAIrFIgAjIyOEw2EAQqEQHo+nfwbJZLL3fMuylE6nVSgUdFyTk5P9LZimqVwud6LBtm3Nz89LksrlsuK3Rk8ADEDRa14cV/yotjF9fh4/ShGJRNjb22NpaYlKpcLExAQfNyyGDrYYv3mJN19cCl9dDECRq16ePgiw8e2QF4U6bp9v7wHS4wHuhk3e77hkXta6AIDQ5Qs8ezjEnRsmb7cPKVYO2fnVQure3b5uMhoe4PWWy6fvLd5tu5R/tv4AjnQ/dpEn9wYZDZtcGewmbjttPuw0eZ6v8+rzwcmp7TfOvgEDv9cAoNESbvPMMn4DIwWAg1B+uBIAAAAASUVORK5CYII="/></a>
			<a class="selmenu i" href="#ss-wikipedia"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACeUlEQVQ4y6WTMUsjURCAv5d9WRc3boo0SUA2GCRKIAhK0MKQtIKtWFhoIeRXyJXiPwi2EbEyjWhpJ6hoF1SsrEQUNJJko5s3V0j27uqb6g0M3xtmvlHtdlv4j4jxn6EBtNaICEopjDE/5NgP++989FZKoZQiDEN0EAS8vr7iOA7GGCzLIhaLEQQBlmVh2zYiQrfbZXx8HBFBRAiCgFQqhe50OrRaLS4vL0mlUqyvr/Py8sLh4SGTk5Nsbm5ycXHB9fU1q6urpNNp9vf3mZqaYm1tDe7u7uTp6UlKpZKUy2UREWm327KysiLValVERHZ2dmR3d1fu7+9FRGRpaUlub2/l4eFBrO3t7V/9fp+ZmRkajQalUol8Po/ruhwdHfH+/o5t28zNzZHJZGi1Wvi+Ty6XQ0SIKaXQWjM9PU0+n6fZbKK1plgssry8zN7eHoVCgVwuRyKR4PT0lIWFBRzH+QEYYwjDENu22dra4uzsjMfHR9LpNIuLi3x9ffHx8UEymeTq6opCoYDjOAyHwz8dKKWwbZv5+XmSySTNZhPXdZmYmMBxHE5OTnAch+PjY8rlMp7nRWu36vX6L4AwDHFdl16vx/n5OdlslufnZ2q1GgcHB2QyGeLxeDSfyI/RXo0xjI2NUavVeHt7o9FokM1m2djYoFgsUq/XmZ2dJZ1OE4Zh5IMekQD6/T6+71OpVOj1elQqFYIgoFqtEovF8DwPYwzD4fCPkTc3N9ExGWPQWtPpdPj8/MT3fQaDAd1uF2MMrutiWRZANANtjIncHvnueR6e5/H9/Y1SikQiEX0wqo8Ag8EgAozaExG01sTjcSzLQkT+OahRbozhN+CAQK765F4HAAAAAElFTkSuQmCC"/></a>
			<a class="selmenu i" href="#ss-youtube"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB2klEQVQ4y5WTv0vjMRjGP/3aauuvkisngiAahIIgRymKHCeIuAlu/RN0cbcO4uTSxdnFURAnxUVpwV3qLIIUERTpQfA3DrbPDantl0M574GQNyF587yfJBFJAohEIkhq9l9VAFCpVAAoFAqEx1+SGsrn8wKUy+XknJO1VoCstWq4VLlcljFGYTUTOOeaiyTJWivnnIwxKhaLnyYI3p0YY/7ptlQqfV5C2OZHJWSzWQH6a4si+h/kHygKwN4erKxA9TckuyH1HYIA2trg5gaSSRgdhcwP+PkLjIGzM8jlGn76+6Xz85avdFpKJqUgkB4epLExH6fT0uCgtLsrLS+HbiGb9QskaW6u1cbHpUpFOjiQJicl803a3vYJp6ZCDCYm4PQUnp4gk4HjYzg8hIEBuL2F+Xk4OfHx9DTUajAyArWaf4nU6xCPQywG3d1weQnX135DVxcsLcHjI/T1weurp9fTE4LYRBr18KJRcA6s9XE8Dh0dkErB2po/PZVq/QU6O1tJ6nVIJGBjw48TCdjagrc32N+HnR1YXISXl5CDoSG4u4PZWXh+hoUFb71ahfZ22NyEiwu4uvJzR0cwMwNA6yGtr/s7j8U8zPdawUPr7fV87u9heBhWVwH4A2xcVgnnGajtAAAAAElFTkSuQmCC"/></a>
			<div/>
			<a class="selmenu l" href="#ss-cancel">やめて</a>
		</div>
		<div id="lightbox-wrap" class="lightbox-wrap hide">
			<div class="dimmer"></div>
			<div class="image-wrap"></div>
			<div class="loader-wrap">
				<div><img/><p>読み込み中...</p></div>
			</div>
			<div class="receiver">
				<div class="info hide">
					<a id="lightbox-link" href="#" target="_blank"></a>
					(<span id="lightbox-ratio"></span>)
					<span id="lightbox-zoom-modes">
						- <a class="js" href="#lightbox-whole">全体(1)</a>
						- <a class="js" href="#lightbox-actual-size">実寸(2)</a>
						- <a class="js" href="#lightbox-fit-to-width">幅を最大(w)</a>
						- <a class="js" href="#lightbox-fit-to-height">高さを最大(h)</a>
						- <a class="js" href="#lightbox-search">この画像を検索(s)</a>
					</span>
				</div>
			</div>
		</div>
		<div id="dialog-wrap" class="dialog-wrap hide">
			<div class="dimmer"></div>
			<div class="dialog-content-wrap">
				<div>
					<div class="dialog-content-title">タイトル</div>
					<div class="dialog-content" id="dialog-content"></div>
					<div class="dialog-content-footer"><a href="#apply-dialog">適用</a><a href="#ok-dialog">OK</a><a href="#cancel-dialog">キャンセル</a></div>
					<div class="dialog-content-title-ex"><a class="close-button" href="#cancel-dialog"></a></div>
				</div>
			</div>
		</div>
	</body>
</html>
</xsl:template>

<!-- partial content: threads -->
<xsl:template match="futaba" mode="threads">
<html>
	<body><xsl:apply-templates select="thread"/></body>
</html>
</xsl:template>

<!-- partial content: rest of all replies -->
<xsl:template match="futaba" mode="replies">
<html>
	<body><xsl:apply-templates select="thread[1]/replies/reply"/></body>
</html>
</xsl:template>

<!-- partial content: new replies -->
<xsl:template match="futaba" mode="replies_diff">
<html>
	<body><xsl:apply-templates select="thread[1]/replies/reply[number(number)>number($low_bound_number)]"/></body>
</html>
</xsl:template>

<!-- partial content: navigator -->
<xsl:template match="futaba" mode="navigator">
<html>
	<body><xsl:apply-templates select="meta/navs/nav"/></body>
</html>
</xsl:template>

<!-- partial content: notices -->
<xsl:template match="futaba" mode="notices">
<html>
	<body>
		<ul>
		<xsl:for-each select="meta/notices/notice">
			<li data-doe="{.}"></li>
		</xsl:for-each>
		</ul>
	</body>
</html>
</xsl:template>

<!-- partial content: amazon ad -->
<xsl:template match="futaba" mode="amazon">
<html>
	<body data-doe="{meta/ads/amazon}">
	</body>
</html>
</xsl:template>

<!-- partial content: connected storage indicator -->
<xsl:template match="futaba" mode="storage">
<html>
	<body>
	<xsl:choose>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='dropbox'"><a href="https://www.dropbox.com/" target="_blank"><span class="storage-image dropbox-image" title="保存先: dropbox">-</span></a></xsl:when>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='gdrive'"><a href="http://www.google.com/drive/about.html" target="_blank"><span class="storage-image gdrive-image" title="保存先: Google Drive">-</span></a></xsl:when>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='onedrive'"><a href="https://onedrive.live.com/" target="_blank"><span class="storage-image onedrive-image" title="保存先: Microsoft OneDrive">-</span></a></xsl:when>
	</xsl:choose>
	</body>
</html>
</xsl:template>

<!-- a thread -->
<xsl:template match="thread">
<!--<xsl:if test="$page_mode='reply'">
<div class="page-mode-header reply-mode">レス送信モード</div>
</xsl:if>-->
<article>
	<xsl:if test="topic/image">
	<div class="image">
		<div>
			<a class="js lightbox" href="{topic/image}" target="_blank">
				<img src="{topic/thumb}" width="{topic/thumb/@width}" height="{topic/thumb/@height}" title="{topic/comment}"/>
				<br/>
				<xsl:value-of select="topic/image/@base_name"/>
			</a>
			<br/><span class="info-sup"><xsl:value-of select="topic/image/@size"/><xsl:if test="topic/image/@animated"> - アニメGIF</xsl:if></span>
			<br/>[<a class="js save-image" href="{topic/image}">保存する</a>]
		</div>
	</div>
	</xsl:if>
	<div class="text">
		<div class="topic-wrap" data-number="{topic/number}">
			<div>
				<input type="checkbox"/>
				<xsl:if test="topic/sub"><span class="sub def_{topic/sub=$sub_default}"><xsl:value-of select="topic/sub"/></span> | </xsl:if>
				<xsl:if test="topic/name"><span class="name def_{topic/name=$name_default}"><xsl:value-of select="topic/name"/></span> | </xsl:if>
				<span class="postdate"><xsl:value-of select="topic/post_date"/></span> |
				<xsl:if test="topic/user_id"><span class="user-id">ID:<xsl:value-of select="topic/user_id"/></span><span></span> | </xsl:if>
				<a class="postno" href="#quote">No.<xsl:apply-templates select="topic/number"/></a>
				<a class="del js" href="#del">del</a>
				&#160;<a class="{topic/sodane/@className} js" href="#sodane"><xsl:value-of select="topic/sodane"/></a>
				<xsl:if test="$page_mode!='reply'"><span class="reply-link"><a href="{@url}" target="_blank">返信</a></span></xsl:if>
			</div>
			<xsl:if test="topic/email"><div class="email">[<xsl:apply-templates select="topic/email"/>]</div></xsl:if>
			<div class="comment"><xsl:apply-templates select="topic/comment"/></div>
			<xsl:apply-templates select="topic/expires" mode="detail"/>
			<xsl:if test="$page_mode='summary' and replies/@hidden>0"><div class="hidden-indicator">レス <xsl:value-of select="replies/@hidden"/> 件省略。全て読むには返信ボタンを押してください。</div></xsl:if>
		</div>
		<div class="replies">
			<xsl:apply-templates select="replies"/>
		</div>
		<div class="thread-footer">
		<xsl:choose>
			<xsl:when test="$page_mode='summary' and replies/@total>0">
			<xsl:value-of select="replies/@total"/> レス / <xsl:value-of select="topic/expires"/>
			<small>(<xsl:value-of select="topic/expires/@remains"/>)</small>
			<xsl:apply-templates select="topic/expires" mode="simple"/>
			</xsl:when>
			<xsl:when test="$page_mode='reply'">
			<div id="replies-info">
				<div>
					<span id="replies-total">-</span><small> レス</small>,
					<span id="replies-mark">-</span><small> マーク</small>,
					<span id="replies-id">-</span><small> ID</small>
					/ <span id="expires" data-binding="xpath:/futaba/thread[1]/topic/expires"></span>
					<small>(<span id="expires-remains" data-binding="xpath:/futaba/thread[1]/topic/expires/@remains"></span>)</small>
				</div>
				<xsl:apply-templates select="topic/expires" mode="simple"/>
				<div class="reloader-wrap">
					<a class="reloader js" href="#reload" id="reload-anchor">続きを読む</a>
					<span class="hide" id="fetch-status"></span>
				</div>
			</div>
			</xsl:when>
		</xsl:choose>
		</div>
	</div>
	<div class="aside"></div>
</article>
<hr/>
</xsl:template>

<!-- a reply -->
<xsl:template match="reply">
<div class="reply-wrap">
	<div>…</div>
	<div class="{substring('deleted',1,count(deleted)*7)}" data-number="{number}">
		<div>
			<span class="no"><xsl:value-of select="offset"/></span>
			<input type="checkbox"/>
			<xsl:if test="sub"><span class="sub def_{sub=$sub_default}"><xsl:value-of select="sub"/></span> | </xsl:if>
			<xsl:if test="name"><span class="name def_{name=$name_default}"><xsl:value-of select="name"/></span> | </xsl:if>
			<span class="postdate"><xsl:value-of select="post_date"/></span> |
			<a class="postno" href="#quote">No.<xsl:apply-templates select="number"/></a>
			<a class="del js" href="#del">del</a>
			&#160;<a class="{sodane/@className} js" href="#sodane"><xsl:value-of select="sodane"/></a>
		</div>
		<xsl:if test="image">
			<div class="reply-image">
				<a class="js lightbox" href="{image}" target="_blank">
					<img src="{thumb}" width="{thumb/@width}" height="{thumb/@height}"/>
					<br/>
					<xsl:value-of select="image/@base_name"/>
				</a>
				<div>
					<xsl:value-of select="image/@size"/>
					<xsl:if test="image/@animated"> - アニメGIF</xsl:if>
					<br/>[<a class="js save-image" href="{image}">保存する</a>]
				</div>
			</div>
		</xsl:if>
		<xsl:if test="email"><div class="email">[<xsl:apply-templates select="email"/>]</div></xsl:if>
		<div class="comment"><xsl:apply-templates select="comment"/></div>
		<xsl:if test="user_id"><div class="user-id">── <span class="user-id">ID:<xsl:value-of select="user_id"/></span><span></span></div></xsl:if>
	</div>
</div>
</xsl:template>

<!-- post form -->
<xsl:template match="input[@name='name']">
<tr><th>おなまえ</th><td colspan="2"><input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/></td></tr>
</xsl:template>

<xsl:template match="input[@name='email']" mode="simple">
<tr><th>E-mail</th><td colspan="2"><input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/>[<a class="js" href="#sage">sage</a>]</td></tr>
</xsl:template>

<xsl:template match="input[@name='email']" mode="composite">
<tr>
	<th>E-mail</th>
	<td><input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/></td>
	<td class="thin"><input type="submit" value="送信"/> [<a class="js" href="#sage">sage</a>]
	</td>
</tr>
</xsl:template>

<xsl:template match="input[@name='sub']">
<tr><th>題　　名</th><td><input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/></td><td><input type="submit" value="送信"/></td></tr>
</xsl:template>

<xsl:template match="input[@name='pwd']">
<tr><th>削除キー</th><td><input type="{@type}" id="{@name}" name="{@name}" value="{@value}" maxlength="8"/> <small>(削除用.英数字で8字以内)</small></td></tr>
</xsl:template>

<!-- comment parts -->
<xsl:template match="number">
<xsl:choose>
<xsl:when test="@lead and @trail"><xsl:value-of select="@lead"/><span class="repdigit"><xsl:value-of select="@trail"/></span></xsl:when>
<xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
</xsl:choose>
</xsl:template>

<xsl:template match="comment//mark">
<span class="mark"><xsl:value-of select="."/></span>
</xsl:template>

<xsl:template match="comment//q">
<q><xsl:apply-templates/></q>
</xsl:template>

<xsl:template match="comment//br">
<br/>
</xsl:template>

<xsl:template match="comment//a | email//a">
<xsl:choose>
<xsl:when test="contains(@class,'link-siokara') and @thumbnail and not(name(..)='q')">
<a class="{@class}" href="{@href}" title="{@title}" target="_blank">
	<xsl:value-of select="@basename"/><br/>
	<img src="{@thumbnail}" onerror="document.dispatchEvent(new CustomEvent('Akahukuplus.imageError', {{detail:{{target:this}}}}))"/><br/>
	<span class="js save-image" data-href="{@href}">[保存する]</span>
</a>
</xsl:when>
<xsl:when test="contains(@class,'link-youtube') and not(name(..)='q')">
<div class="inline-video-container">
	<a href="{@href}" target="_blank"><xsl:value-of select="."/></a>
	<div class="inline-video youtube" data-markup="&lt;iframe width='420' height='315' src='//www.youtube.com/embed/{@youtube-key}' frameborder='0' allowfullscreen='allowfullscreen'&gt;&lt;/iframe&gt;"></div>
</div>
</xsl:when>
<xsl:when test="contains(@class,'link-nico2') and not(name(..)='q')">
<div class="inline-video-container">
	<a href="{@href}" target="_blank"><xsl:value-of select="."/></a>
	<div class="inline-video nico2" data-markup="&lt;iframe width='312' height='176' src='http://ext.nicovideo.jp/thumb/{@nico2-key}' scrolling='no' style='border:solid 1px #CCC;' frameborder='0'&gt;&lt;/iframe&gt;"></div>
</div>
</xsl:when>
<xsl:when test="contains(@class,'link-futaba') and not (name(..)='q')">
<a class="{@class}" href="{@href}" target="_blank"><xsl:value-of select="."/></a>
<small> - [<a class="js save-image" href="{@href}">保存する</a>]</small><br/>
<a class="{@class}" href="{@href}" target="_blank"><img src="{@thumbnail}"/><br/></a>
</xsl:when>
<xsl:when test="contains(@class,'link-twitter') and not (name(..)='q')">
<a class="{@class}" href="{@href}" target="_blank" data-tweet-id="{@tweet-id}"><xsl:value-of select="."/></a>
</xsl:when>
<xsl:otherwise>
<a class="{@class}" href="{@href}" target="_blank" data-basename="{@basename}"><xsl:value-of select="."/></a>
</xsl:otherwise>
</xsl:choose>
</xsl:template>

<!-- summary navigator -->
<xsl:template match="nav">
<xsl:choose>
<xsl:when test="@current"><span class="current"><xsl:value-of select="."/></span></xsl:when>
<xsl:otherwise><a class="switch-to" href="{@href}"><xsl:value-of select="."/></a></xsl:otherwise>
</xsl:choose>
</xsl:template>

<!-- expiration warning indicator -->
<xsl:template match="expires" mode="detail">
<div
	class="{concat('expire-warn ',substring('hide',1,4-count(@warned)*4))}"
	data-binding="xpath-class[reply]:concat('expire-warn ',substring('hide',1,4-count(/futaba/thread[1]/topic/expires/@warned)*4))"
>このスレは <span data-binding="xpath[reply]:/futaba/thread[1]/topic/expires"><xsl:value-of select="."/></span>。</div>
</xsl:template>

<xsl:template match="expires" mode="simple">
<div
	class="{concat('expire-warn ',substring('hide',1,4-count(@warned)*4))}"
	data-binding="xpath-class[reply]:concat('expire-warn ',substring('hide',1,4-count(/futaba/thread[1]/topic/expires/@warned)*4))"
>このスレは古いので、もうすぐ消えます。</div>
</xsl:template>

</xsl:stylesheet>
