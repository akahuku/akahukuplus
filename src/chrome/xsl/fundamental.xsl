<?xml version="1.0" encoding="UTF-8"?>
<!--
	The XSL file, which translates internal xml into content for akahukuplus

	@author akahuku@gmail.com
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="5" encoding="UTF-8"/>
<xsl:variable name="sub_default" select="/futaba/meta/sub_default"/>
<xsl:variable name="name_default" select="/futaba/meta/name_default"/>
<xsl:param name="app_name"/>
<xsl:param name="dev_mode"/>
<xsl:param name="page_mode"/>
<xsl:param name="render_mode"/>
<xsl:param name="low_bound_number"/>
<xsl:param name="platform"/>
<xsl:param name="sort_order"/>

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
<xsl:when test="$render_mode='title'"><xsl:apply-templates mode="title"/></xsl:when>
</xsl:choose>
</xsl:template>

<!-- full content -->
<xsl:template match="futaba" mode="full">
<html lang="ja">
	<head>
		<meta name="generator" content="{$app_name}"/>
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
	padding:0 8px 8px 8px;
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

.comment a {
	word-break:break-all;
}

hr {
	margin:16px 0 16px 0;
	padding:0;
	height:1px;
	border-style:solid none none none;
	border-color:#8003;
	border-width:1px;
	color:#8003;
}

kbd {
	margin:0 .15em 0 .6em;
	padding:0 4px 0 4px;
	background-color:#855;
	color:#ffe;
	border-radius:3px;
	white-space:nowrap;
	font-family:"PT Mono",monospace;
	font-weight:bold;
	text-shadow:none;
	text-decoration:none;
	line-height:1;
}

kbd:first-child {
	margin-left:0;
}

a.js kbd {
	background-color:#682;
}

a.js:hover kbd {
	background-color:#d44;
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

input[type="checkbox"] {
	vertical-align:middle;
}

@keyframes blink {
	50% {
		opacity:0;
	}
}

/*
 * header
 */

#header {
	position:fixed;
	display:flex;
	align-items:center;
	left:0;
	right:0;
	top:0;
	margin:0;
	padding:0;
	box-sizing:border-box;
	border-style:none;
	background-color:#faf4e6;/*ffffee + f0e0d6 * 0.33*/
	box-shadow:0 1px 2px 2px #8002;
	z-index:100;
}

#header > div {
	font-size:small;
	text-align:left;
}

#header > div:nth-child(1) {
	padding:8px 12px 8px 8px;
	white-space:nowrap;
}

#header > div:nth-child(2) {
	padding:4px 0 4px 0;
	flex-grow:1;
}

#header > div:nth-child(3) {
	padding:4px 8px 4px 8px;
	text-align:right;
	white-space:nowrap;
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

#header label {
	white-space:nowrap;
}

#header img {
	vertical-align:text-bottom;
}

#header .emoji {
	margin-left:4px;
	margin-right:4px;
	vertical-align:-0.1em;
	max-height:1em;
	filter: drop-shadow(0px 1px 1px #0008);
}

/*
 * contents
 */

#content-loading-indicator {
	position:fixed;
	left:8px;
	top:64pt;
	padding:4px;
	color:#682;
	border:2px solid #682;
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
	margin:0;
	position:relative;
	left:0;
	background-color:#ffe;
}

#content.transition-enabled {
	transition-property:left;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
}

#content.init {
	left:110%;
}

#content > article {
	display:flex;
	width:100%;
}

#content > article > .image {
	max-width:250px;
	padding:0 12px 0 0;
}

#content > article > .text {
	flex-grow:1;
	padding:0 12px 0 0;
}

#content > article > .aside {
	width:24%;
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
	margin:-.5em 0 0 0;
	text-align:right;
}

.topic-wrap .emoji,
.reply-wrap .emoji {
	margin-left:4px;
	margin-right:4px;
	vertical-align:-0.1em;
	max-height:1.5em;
	filter: drop-shadow(0px 1px 1px #0008);
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

.topic-wrap a .link-completion-notice,
.reply-wrap a .link-completion-notice {
	font-size:75%;
}

.topic-wrap.hilight,
.reply-wrap > .hilight {
	background-color:#ea8 !important;
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
	transition-delay:0s;
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
	line-height:1.5;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
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
	font-size:small;
	text-align:center;
	line-height:1.25;
	white-space:nowrap;
}

#content > article > .image > div {
	position:sticky;
	top:0;
}

#content > article > .image a {
	outline:none;
}

#content > article > .image img {
	margin:0 0 .5em 0;
	border:none;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
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
article.summary .replies {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:flex-start;
	align-items:flex-start;
	align-content:flex-start;
	max-width:960px;
}

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
	box-shadow:0 1px #8004;
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

.thread-footer #replies-total,
.thread-footer #replies-mark,
.thread-footer #replies-id {
	font-weight:bold;
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

.reply-image a {
	outline:none;
}

.reply-image img {
	margin:0 0 .5em 0;
	border:none;
	transition-property:box-shadow;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
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
	margin:8px auto 16px auto;
}

#footer .amazon > a img {
	margin:0 8px 0 0;
	/*border:1px solid silver;*/
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
	transition-delay:0s;
	box-sizing:border-box;
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

#postform {
	display:block;
	position:relative;
}

#postform fieldset {
	margin:0;
	padding:0;
	border:0;
}

#postform table {
	margin:0;
	padding:0;
	width:100%;
	border-collapse:separate;
}

#postform th {
	padding:4px;
	background-color:#ea8;
	width:3%;
	white-space:nowrap;
	font-weight:bold;
	text-align:left;
}

#postform td {
	padding:1px;
}

#postform td > div.flex {
	display:flex;
}

#postform td > div.flex > :not(:last-child) {
	margin:0 4px 0 0;
}

#postform td > div.flex > :first-child {
	flex-grow:1;
}

#postform td > div.flex > .bracket {
	align-self:center;
}

#postform .drop-indicator {
	position:absolute;
	display:flex;
	justify-content:center;
	align-items:center;
	left:0;
	top:0;
	right:0;
	bottom:0;
	background-color:#ffe;
	font-size:medium;
}

#postform #name {
	color:#117743;
	font-weight:bold;
}

#postform #email {
	color:#00f;
}

#postform #sub {
	color:#cc1105;
	font-weight:bold;
}

#postform #com {
	display:block;
	margin:0;
	padding:0;
	width:100%;
	border:none;
	outline:none;
	background-color:#ffe;
	color:#800;
	resize:none;
	line-height:1.2;
}

#postform .comment-wrap {
	box-sizing:border-box;
	width:100%;
	margin:0;
	padding:4px;
	border:1px solid #ea8;
}

#postform .comment-info {
	padding:4px 0 0 0;
	font-size:small;
	line-height:1;
}

#postform #comment-info-summary {
	color:#d00;
	font-weight:bold;
	visibility:hidden;
}

#postform #comment-info-summary.blink {
	visibility:visible;
	animation:blink 1s step-end infinite;
}

#postform #comment-info-details {
	text-align:right;
}

#postform #comment-info-details span {
	padding:0 0 0 8px;
}

#postform #comment-info-details span.warn {
	color:#d00;
	font-weight:bold;
}

#postform #pwd {
	margin:0 4px 0 0;
	width:8em;
}

#postform-wrap #comment-backend {
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

#postform-wrap .post-image-thumbnail-wrap {
	position:fixed;
	width:25%;
	left:0;
	bottom:0;
	text-align:right;
	opacity:0;
	transition-property:opacity;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
}

#postform-wrap .post-image-thumbnail-wrap.run {
	opacity:1;
}

#postform-wrap .post-image-thumbnail-outer {
	display:inline-block;
	margin:0 8px 24px 0;
	border:8px solid #ffe;
	border-radius:4px;
	box-shadow:0 0 8px 2px rgba(0,0,0,.5);
	background-color:#ffe;
	font-size:small;
	text-align:center;
}

#postform-wrap .post-image-thumbnail-info {
	white-space:nowrap;
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
	transition-delay:0s;
}

#ad-aside-wrap div {
	margin:0 0 4px auto;
}

#ad-aside-wrap iframe {
	background-color:#f0e0d6;
	outline:1px solid #eee;
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
	transition-delay:0s;
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
	right:-28%;
	bottom:8pt;
	background-color:#ffe9;
	border-radius:4px 0 0 4px;
	box-shadow:0 0 8px 2px rgba(0,0,0,.3);
	transition-property:right;
	transition-duration:.3s;
	transition-timing-function:ease;
	transition-delay:0s;
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
	padding:4px 8px 4px 8px;
	background-color:#400;
	color:#ccc;
	border-radius:4px 4px 0 0;
	box-shadow:0 -2px 3px rgba(0,0,0,.25);
	font-size:small;
	line-height:1;
	text-decoration:none;
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
	box-sizing:border-box;
	padding:8px;
	font-size:small;
	overflow-y:auto;
}

/*#panel-aside-wrap .panel-content-wrap > div {
	height:300px;
	}*/

/*
 * panel content: mark and id statistics
 */

#panel-content-mark h2 {
	margin:0 0 4px 0;
	padding: 0 0 4px 0;
	border-bottom:1px solid silver;
	line-height:1;
	font-size:large;
	font-weight:bold;
}

#panel-content-mark h2:not(:first-child) {
	margin-top:1em;
}

#panel-content-mark h2 span {
	margin:0 0 0 4px;
	font-size:medium;
	font-weight:normal;
}

#panel-content-mark ul {
	margin:0;
	padding:0 0 0 1em;
}

#panel-content-mark li {
	line-height:1.5;
}

#panel-content-mark li p {
	margin:1em 0 4px 0;
}

#panel-content-mark li p.sub-header {
	font-weight:bold;
	border-bottom:1px dotted silver;
}

#panel-content-mark li p.sub-header span {
	margin:0 0 0 4px;
	font-weight:normal;
}

#panel-content-mark li a {
	display:inline-block;
	margin:0 4px 4px 0;
	padding:4px;
	border:1px solid #ccc;
	border-radius:3px;
	background-color:#fff;
	color:#555;
	line-height:1;
	font-size:x-small;
	text-decoration:none;
}

#panel-content-mark li a.new {
	font-weight:bold;
}

#panel-content-mark li a:hover,
#panel-content-mark li a.new:hover {
	background-color:#fec;
}

/*
 * panel content: search
 */

#panel-content-search .search-form-wrap form {
	display:flex;
}

#panel-content-search input[type="text"] {
	flex:1;
	box-sizing:border-box;
	margin:0;
}

#panel-content-search #search-guide {
	margin:8px 0 4px 0;
	font-size:small;
}

#panel-content-search #search-result-count {
	margin:8px 0 4px 0;
	padding:0;
	font-size:small;
	text-align:right;
	line-height:1;
}

#panel-content-search #search-result {
	height:300px;
}

#panel-content-search #search-result > a {
	display:block;
	margin:0 0 4px 4px;
	padding:4px;
	border:1px solid #ccc;
	border-radius:3px;
	background-color:#fff;
	color:#555;
	line-height:1.1;
	font-size:x-small;
	text-decoration:none;
	word-break:break-all;
}

#panel-content-search #search-result > a.new {
	background-color:#cfc;
}

#panel-content-search #search-result > a:visited {
	background-color:#f0e0d6;
}

#panel-content-search #search-result > a:hover {
	background-color:#fec;
}

#panel-content-search #search-result > a img {
	float:left;
	margin:0 4px 4px 0;
	max-width:50px;
}

#panel-content-search #search-result > a .sentinel {
	clear:both;
	margin:4px 0 0 0;
	padding:0;
	text-align:right;
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

/* dimmver */
.lightbox-wrap .dimmer {
	background-color:rgba(0,0,0,0);
	transition-property:background-color;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
}

.lightbox-wrap .dimmer.run {
	background-color:rgba(0,0,0,.85);
}

/* image wrapper */
.lightbox-wrap .image-wrap {
	position:fixed;
	display:flex;
	justify-content:center;
	align-items:center;
}

.lightbox-wrap .image-wrap:not(.hide) {
	transition-property:left,top,width,height;
	transition-duration:.3s;
	transition-timing-function:ease;
	transition-delay:0s;
}

.lightbox-wrap .image-wrap:not(.hide) > img {
	background:url(transparent-bg.png) left top repeat fixed #888;
	opacity:.1;
	transition-property:width,height,transform,opacity;
	transition-duration:.3s;
	transition-timing-function:ease;
	transition-delay:0s;
}

.lightbox-wrap .image-wrap.dragging {
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

/* infomation indicator */
.lightbox-wrap .info {
	display:flex;
	flex-direction:row;
	flex-wrap:nowrap;
	justify-content:center;
	align-items:stretch;
	margin:0 auto 0 auto;
	border-radius:0 0 4px 4px;
}

.lightbox-wrap .info > div {
	display:flex;
	flex-direction:row;
	flex-wrap:nowrap;
	justify-content:center;
	align-items:stretch;
	margin:0 1px 0 0;
	color:#aaa;
	font-size:small;
	text-align:center;
	text-shadow:0px 1px 1px #000;
	line-height:1;
}

.lightbox-wrap .info > div:first-child {
	border-radius:0 0 0 6px;
}

.lightbox-wrap .info > div:last-child,
.lightbox-wrap .info > div:last-child a {
	border-radius:0 0 6px 0;
}

.lightbox-wrap .info > div.single {
	padding:8px;
	background-color:#000c;
	color:#ccc;
}

.lightbox-wrap .info > div.single a {
	color:#8f8;
}

.lightbox-wrap .info > div.single a:hover {
	color:#d44;
}

.lightbox-wrap .info .flex a {
	margin:0;
	padding:8px 5px 8px 5px;
	background-color:#000c;
	color:#ccc;
	text-decoration:none;
}

.lightbox-wrap .info .flex a kbd {
	text-shadow:none;
}

.lightbox-wrap .info .flex a.selected {
	color:#f44;
}

.lightbox-wrap .info .flex a.selected kbd {
	background:#d44;
}

.lightbox-wrap .info .flex a:hover {
	color:#fff;
	background-color:#555;
}

.lightbox-wrap .info .flex a:not(.selected):hover kbd {
	background:#682;
}

/*
 * drawings
 */

.draw-box-outer {
	display:flex;
	flex-direction:row;
	justify-content:center;
	align-items:center;
}

.draw-box-inner {
	text-align:center;
}

.draw-tools {
	margin:0;
	padding:3px;
	border-top:1px solid #6a6a6a;
	background-color:#535353;
	color:#fff;
	text-align:center;

	display:flex;
	flex-direction:row;
	justify-content:center;
	align-items:stretch;
}

.draw-shortcut-describes {
	margin:4px 0 24px 0;
	font-size:x-small;
	line-height:1;
	color:#fff;
	text-align:center;
}

.draw-shortcut-describes span {
	margin:0 4px 0 16px;
	padding:1px 4px 1px 4px;
	border-radius:3px;
	background-color:#ea8;
	color:#800;
	font-family:monospace;
	font-size:small;
}

.draw-shortcut-describes span.mini {
	margin-left:-3px !important;
}

.draw-tools > div {
	margin:0;
	padding:3px 6px 3px 6px;
	background-color:#535353;
	font-size:small;
	text-align:left;

	display:flex;
	flex-direction:column;
	justify-content:center;
	align-items:center;
}

.draw-tools > div:not(:last-child) {
	margin-right:4px;
	border-right:1px solid #383838;
}

.draw-tools > div > div:not(:last-child) {
	margin: 0 0 2px 0;
}

.draw-tools a {
	color:#8ac;
}

.draw-tools input[type="range"], .draw-tools input[type="radio"] {
	vertical-align:middle;
}

.draw-tools .draw-pen-sample {
	vertical-align:middle;
}

.draw-color-wrap {
	width:40px;
	height:36px;
	position:relative;
}

.draw-fg, .draw-bg {
	width:24px;
	height:24px;
	border:1px solid #fff;
	box-shadow:#000 0px 0px 0px 1px;
}

.draw-fg {
	position:absolute;
	left:0;
	top:0;
	background-color:#800;
}

.draw-bg {
	position:absolute;
	right:0;
	bottom:0;
	background-color:#f0e0d6;
}

.draw-canvas {
	margin:0 auto 0 auto;
	image-rendering:-o-crisp-edges;
	image-rendering:-moz-crisp-edges;
	image-rendering:pixelated;
	transition-property:width,height;
	transition-duration:.4s;
	transition-timing-function:ease;
	transition-delay:0s;
}

.draw-buttons {
	margin:24px 0 0 0;
	text-align:center;
}

.draw-buttons button {
	margin:0;
	font-size:x-large;
}

.draw-buttons button:not(:last-child) {
	margin-right:8px;
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
	transition-delay:0s;
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
	transition-delay:0s;
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
	box-shadow:0 1px 2px 2px #8002;
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
	box-shadow:0 1px 4px 2px rgba(0,0,0,.25);
	line-height:1;
	text-align:center;
	text-decoration:none;
}

.dialog-wrap .dialog-content-footer > a + a {
	margin-left:8px;
}

.dialog-wrap .dialog-content-footer > a:hover {
	background-color:#789922;
	color:#fff;
}

.dialog-wrap .dialog-content-footer > a.disabled {
	opacity:.5;
}

.dialog-wrap .close-button {
	display:inline-block;
	width:16px;
	height:16px;
}

.dialog-wrap .close-button:hover {
}

.dialog-wrap #wheel-indicator {
	margin:0 0 0 4px;
	font-size:small;
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

.wheel-status .blink-cursor {
	font-size:75%;
	animation:blink .5s step-end infinite;
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
	margin:0 8px 0 8px;
	content: "|";
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
	transition-duration:.3s;
	transition-timing-function:ease;
	transition-delay:0s;
	opacity:1;
	counter-reset: pageindex -1;
}

#catalog .catalog-threads-wrap > div.run {
	opacity:.3;
}

#catalog .catalog-threads-wrap > div > a {
	position:relative;
	display:block;
	box-sizing:border-box;
	margin:0 2px 2px 0;
	padding:2px;
	border:1px inset #ccc;
	font-size:small;
	line-height:1;
	text-align:center;
	color:#800;
	text-decoration:none;
}

#catalog #catalog-threads-wrap-default > a:nth-child(10n+1)::after {
	position:absolute;
	left:-1px;
	top:-1px;
	padding:0 2px 2px 0;
	border-radius:0 0 3px 0;
	border-style:none outset outset none;
	border-width:1px;
	border-color:#ccc;
	background-color:#ffe;
	color:#855;
	line-height:1;
	font-weight:bold;
	counter-increment:pageindex;
	content: counter(pageindex);
}

#catalog #catalog-threads-wrap-default > a.visited:nth-child(10n+1)::after,
#catalog #catalog-threads-wrap-default > a.soft-visited:nth-child(10n+1)::after {
	border:none;
}

#catalog #catalog-threads-wrap-default > a.warned:nth-child(10n+1)::after {
	left:-2px;
	top:-2px;
	border-style:none solid solid none;
	border-color:#d00;
	border-width:2px;
	color:#d00;
}

#catalog .catalog-threads-wrap .image {
	display:flex;
	flex-direction:column;
	justify-content:flex-end;
	align-items:center;
	margin:0 0 2px 0;
}

#catalog .catalog-threads-wrap a:link { background-color:#ffe; }
#catalog .catalog-threads-wrap a:visited,
#catalog .catalog-threads-wrap a.soft-visited { background-color:#f0e0d6; border-color:#f0e0d6; border-style:solid; }
#catalog .catalog-threads-wrap a:active { background-color:#ea8; }
#catalog .catalog-threads-wrap a.new { background-color:#cfc; border-color:#cfc; }
#catalog .catalog-threads-wrap a.long { background-color:#c9e6e9; border-color:#c9e6e9; }
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
	transition-delay:0s;
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
	word-break:break-all;
	overflow:hidden;
	text-overflow:ellipsis;
	transition-property:opacity;
	transition-duration:.5s;
	transition-timing-function:ease-out;
	transition-delay:0s;
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

#quote-popup-pool2 .quote-popup {
	position:fixed;
	box-sizing:border-box;
	border:1px solid #ea8;
	border-radius:3px;
	padding:4px 4px 0 4px;
	max-width:50%;
	background-color:#ffe;
	box-shadow:0 1px 4px 2px rgba(0,0,0,.3);
	font-size:small;
}

.highlight.topic-wrap,
.highlight.reply-wrap > div:last-child {
	color:HighlightText !important;
	background-color:Highlight !important;
}

#quote-popup-pool .quote-popup .jumpto-quote-anchor,
#quote-popup-pool2 .quote-popup .jumpto-quote-anchor {
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

/*
 * internal submit target
 */

#internal-submit-target {
	position:absolute;
	left:-100px;
	top:0;
	width:100px;
	height:100px;
	border:none;
}
		</style>
		<link rel="stylesheet" href="{$platform}-extension://{meta/extension_id}/styles/extra-{$platform}.css"/>
		<style id="dynstyle-comment-maxwidth"></style>
	</head>
	<body>
		<header id="header">
			<div>
				<h1><a href="{meta/board_top}" data-binding="template:title"></a></h1>
			</div>
			<div>
				現在<span id="viewers" data-binding="xpath:/futaba/meta/viewers">?</span>人くらいが見てます.
				&#160; <a class="js" href="#toggle-catalog"><kbd>c</kbd><span>カタログ</span></a>
				&#160; <a class="js" href="#delete-post">記事削除</a>
				<xsl:if test="$page_mode='reply'"> &#160; <a class="js" href="#track">自動追尾</a></xsl:if>
				<xsl:if test="$dev_mode='1'">
					&#160; <a class="js" href="#reload-ext">Reload Extension</a>
					&#160; <label><input type="checkbox" data-href="#toggle-logging"/>Timing log</label>
				</xsl:if>
			</div>
			<div>
				<a href="{meta/home}" target="_top">ホーム</a>
				<xsl:if test="meta/board_top"> &#160; <a href="{meta/board_top}">掲示板に戻る</a></xsl:if>
				&#160; <a class="js" href="#toggle-panel"><kbd>p</kbd>パネル</a>
				&#160; <a class="js" href="#config">設定</a>
				&#160; <a class="js" href="#help"><kbd>?</kbd></a>
				&#160; <span data-binding="template:storage"></span>
			</div>
		</header>
		<div class="hide" id="content-loading-indicator"></div>
		<div class="init" id="content"><xsl:apply-templates select="thread"/></div>
		<div class="hide" id="catalog">
			<div class="page-mode-header catalog-mode">カタログモード</div>
			<div class="catalog-options">
				<div>
					<span><a  class="catalog-order js {substring('active',1,6*number($sort_order='default'))}" href="#catalog-order-default">カタログ</a></span
					><span><a class="catalog-order js {substring('active',1,6*number($sort_order='new'    ))}" href="#catalog-order-new">新順</a></span
					><span><a class="catalog-order js {substring('active',1,6*number($sort_order='old'    ))}" href="#catalog-order-old">古順</a></span
					><span><a class="catalog-order js {substring('active',1,6*number($sort_order='most'   ))}" href="#catalog-order-most">多順</a></span
					><span><a class="catalog-order js {substring('active',1,6*number($sort_order='less'   ))}" href="#catalog-order-less">少順</a></span
					><span><a class="catalog-order js {substring('active',1,6*number($sort_order='hist'   ))}" href="#catalog-order-hist">履歴</a></span>
				</div>
				<div>
					<span>
						<label>横: <input id="catalog-horz-number" type="text"/></label>
						× <label>縦: <input id="catalog-vert-number" type="text"/> スレッド</label>
					</span
					><span><label><xsl:element name="input">
						<xsl:attribute name="class">catalog-settings-item</xsl:attribute>
						<xsl:attribute name="id">catalog-with-text</xsl:attribute>
						<xsl:attribute name="data-href">#catalog-with-text</xsl:attribute>
						<xsl:attribute name="type">checkbox</xsl:attribute>
						<xsl:if test="meta/configurations/param[@name='catalog.text']/@value='1'">
							<xsl:attribute name="checked">checked</xsl:attribute>
						</xsl:if>
					</xsl:element>本文も取得</label></span><span><a class="js" href="#save-catalog-settings">設定を更新</a></span>
				</div>
			</div>
			<div class="catalog-threads-wrap">
				<div class="{substring('hide',1,4*number($sort_order!='default'))}" id="catalog-threads-wrap-default"></div>
				<div class="{substring('hide',1,4*number($sort_order!='new'    ))}" id="catalog-threads-wrap-new"></div>
				<div class="{substring('hide',1,4*number($sort_order!='old'    ))}" id="catalog-threads-wrap-old"></div>
				<div class="{substring('hide',1,4*number($sort_order!='most'   ))}" id="catalog-threads-wrap-most"></div>
				<div class="{substring('hide',1,4*number($sort_order!='less'   ))}" id="catalog-threads-wrap-less"></div>
				<div class="{substring('hide',1,4*number($sort_order!='hist'   ))}" id="catalog-threads-wrap-hist"></div>
			</div>
			<hr/>
		</div>
		<footer id="footer">
			<div class="amazon">
				<a href="#reload" title="リロード"><img src="{$platform}-extension://{meta/extension_id}/images/gaoru.png"/></a>
			</div>
			<div class="credit">—
				<a href="http://php.loglog.jp/bbs/bbs3.php" target="_blank">GazouBBS</a>
				+ <a href="//www.2chan.net/" target="_top">futaba</a>
				/ This page is under control of <a href="https://akahuku.github.io/akahukuplus/" target="_blank"><xsl:value-of select="$app_name"/>/<xsl:value-of select="meta/version"/></a>
			—</div>
		</footer>
		<div class="wheel-status hide" id="wheel-status"><span class="wheel-status-text"></span><span class="blink-cursor">&#x2582;</span></div>
		<div id="ad-aside-wrap">
			<xsl:if test="meta/configurations/param[@name='banner_enabled']/@value='1'">
				<xsl:for-each select="meta/ads/banners/ad">
					<div class="{@class}">
						<xsl:element name="iframe">
							<xsl:attribute name="frameborder">0</xsl:attribute>
							<xsl:attribute name="scrolling">no</xsl:attribute>
							<xsl:attribute name="width"><xsl:value-of select="@width"/></xsl:attribute>
							<xsl:attribute name="height"><xsl:value-of select="@height"/></xsl:attribute>
							<xsl:attribute name="src"><xsl:value-of select="@src"/></xsl:attribute>
						</xsl:element>
					</div>
				</xsl:for-each>
			</xsl:if>
		</div>
		<div id="panel-aside-wrap">
			<div class="panel-header">パネル</div>
			<div class="panel-tab-wrap">
				<a class="panel-tab active" href="#mark"><kbd>s</kbd><span>集計</span></a>
				<a class="panel-tab" href="#search"><kbd>/</kbd><span>レス検索</span></a>
				<a class="panel-tab" href="#notice"><kbd>n</kbd><span>注意書き</span></a>
			</div>
			<div id="panel-content-mark" class="panel-content-wrap">
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
			<div id="panel-content-search" class="panel-content-wrap hide">
				<div class="search-form-wrap">
					<form id="search-form" target="internal-submit-target" method="get" action="about:blank">
						<input type="text" id="search-text" autocomplete="on"/>
						<button type="submit" id="search-submit">検索</button>
					</form>
				</div>
				<div id="search-result-count"></div>
				<div id="search-guide">
					<b>クエリの文法</b>
					<ul>
						<li>A B ─ A と B を含むレスを検索。これは「|」より優先されます</li>
						<li>A | B ─ A または B いずれかを含むレスを検索</li>
						<li>-A ─ A を含まないレスを検索</li>
						<li>( A ) ─ 式のグループ化</li>
					</ul>
					<p>英文字の大文字・小文字は同一視されます。</p>
					<p>先頭および末尾を / で囲んだ場合は正規表現とみなされます。</p>
				</div>
				<div id="search-result"></div>
			</div>
			<div id="panel-content-notice" class="panel-content-wrap hide" data-binding="template:notices"></div>
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
						<tr>
							<th>コメント</th>
							<td>
								<div class="comment-wrap"><textarea name="com" id="com" resize="false" rows="4" placeholder="Shift+Enterで送信"/></div>
								<div class="comment-info flex">
									<div id="comment-info-summary">そんな決め方でいいのか！？</div>
									<div id="comment-info-details"></div>
								</div>
							</td>
						</tr>
						<xsl:choose>
							<xsl:when test="meta/postform/input[@name='upfile']">
								<tr>
									<th>添付File</th>
									<td>
										<div class="flex">
											<input type="file" id="upfile" name="upfile"/>
											<div class="draw-button-wrap bracket hide">[<a href="#draw">手書き</a>]</div>
											<div><label>[<input type="checkbox" id="textonly" name="textonly" value="on" data-href="#clear-upfile"/>画像なし]</label></div>
										</div>
									</td>
								</tr>
							</xsl:when>
							<xsl:otherwise>
								<tr>
									<th>添付File</th>
									<td>
										<div class="flex">
											<input type="file" id="upfile" name="upfile" disabled="disabled" data-origin="js"/>
											<div class="bracket"><label>[<input type="checkbox" id="textonly" name="textonly" value="on" disabled="disabled" data-href="#clear-upfile"/>画像なし]</label></div>
										</div>
									</td>
								</tr>
							</xsl:otherwise>
						</xsl:choose>
						<xsl:apply-templates select="meta/postform/input[@name='pwd']"/>
						</table>
					</fieldset>
					<div id="postform-drop-indicator" class="drop-indicator hide">
						<div>ファイルをドロップできます</div>
					</div>
				</form>
			</div>
			</xsl:if>
			<div class="nav">
				<xsl:if test="$page_mode!='reply'">
				<div class="nav-links" data-binding="template:navigator"></div>
				<div class="tips">
					<a class="js" href="#prev-summary"><kbd>z</kbd>前</a>
					&#160; <a class="js" href="#next-summary"><kbd>.</kbd>次</a>
					&#160; <a class="js" href="#reload"><kbd>r</kbd>リロード</a>
					<kbd>i</kbd>フォームを開く
				</div>
				</xsl:if>
				<xsl:if test="$page_mode='reply'">
				<div class="status">
					<span id="pf-replies-total">-</span><small> レス</small>,
					<span id="pf-replies-mark">-</span><small> マーク</small>,
					<span id="pf-replies-id">-</span><small> ID</small>
					/ <span id="pf-expires" data-binding="xpath:/futaba/thread[1]/topic/expires"></span>
					<small>(<span id="pf-expires-remains" data-binding="xpath:/futaba/thread[1]/topic/expires/@remains"></span>)</small>
				</div>
				<div class="tips">
					<kbd>i</kbd>フォームを開く
				</div>
				</xsl:if>
			</div>
			<div class="post-image-thumbnail-wrap hide" id="post-image-thumbnail-wrap">
				<div class="post-image-thumbnail-outer" id="post-image-thumbnail-outer">
					<img class="post-image-thumbnail" id="post-image-thumbnail"/>
					<div id="post-image-thumbnail-info"></div>
				</div>
			</div>
			<div id="comment-backend"></div>
		</div>
		<div id="quote-popup-pool"/><div id="quote-popup-pool2"/>
		<div id="selection-menu" class="hide">
			<a class="selmenu l" href="#ss-quote">引用</a>
			<a class="selmenu l" href="#ss-pull">コメントへ</a>
			<a class="selmenu l" href="#ss-join">大！空！寺！</a>
			<div/>
			<a class="selmenu l" href="#ss-copy">コピー</a>
			<a class="selmenu l" href="#ss-copy-with-quote">引用符付きコピー</a>
			<div/>
			&#160;<a class="selmenu i" href="#ss-google"><img src="{$platform}-extension://{meta/extension_id}/images/menu/m-google.png"/></a>
			<a class="selmenu i" href="#ss-amazon"><img src="{$platform}-extension://{meta/extension_id}/images/menu/m-amazon.png"/></a>
			<a class="selmenu i" href="#ss-wikipedia"><img src="{$platform}-extension://{meta/extension_id}/images/menu/m-wikipedia.png"/></a>
			<a class="selmenu i" href="#ss-youtube"><img src="{$platform}-extension://{meta/extension_id}/images/menu/m-youtube.png"/></a>
			<div/>
			<a class="selmenu l" href="#ss-cancel">やめて</a>
		</div>
		<div id="draw-wrap" class="lightbox-wrap draw-wrap hide">
			<div class="dimmer"></div>
			<div class="draw-box-outer hide">
				<div class="draw-box-inner">
					<div class="draw-tools">
						<div class="draw-color-control-wrap">
							<div class="draw-color-wrap">
								<div class="draw-bg" data-color="#f0e0d6"></div>
								<div class="draw-fg" data-color="#800000"></div>
							</div>
							<div class="draw-color-switch"><a href="#draw-color-switch">交換</a></div>
						</div>
						<div class="draw-pen-width-wrap">
							<div>ペンサイズ: <span id="draw-pen-indicator">3</span>px <canvas class="draw-pen-sample" width="24" height="24"></canvas></div>
							<div>1<input class="draw-pen-range" type="range" min="1" max="24" step="1" value="3"/>24</div>
						</div>
						<div class="draw-zoom-wrap">
							<div>
								<label><input type="radio" name="draw-zoom" value="1" data-href="#draw-zoom-factor" checked="checked"/>×1</label>
								<label><input type="radio" name="draw-zoom" value="2" data-href="#draw-zoom-factor"/>×2</label>
							</div>
							<div>
								<label><input type="radio" name="draw-zoom" value="3" data-href="#draw-zoom-factor"/>×3</label>
								<label><input type="radio" name="draw-zoom" value="4" data-href="#draw-zoom-factor"/>×4</label>
							</div>
						</div>
						<div class="draw-clear-wrap">
							<button data-href="#draw-clear">消去...</button>
							<button data-href="#draw-undo">アンドゥ</button>
						</div>
					</div>
					<div class="draw-shortcut-describes"><span>X</span>色交換<span>[</span>細く<span>]</span>太く<span>1</span><span class="mini">2</span><span class="mini">3</span><span class="mini">4</span>表示倍率<span>u</span>アンドゥ<span>esc</span>キャンセル</div>
					<canvas class="draw-canvas" width="344" height="135"></canvas>
					<div class="draw-buttons">
						<button data-href="#draw-complete">描き終えた</button>
						<button data-href="#draw-cancel">キャンセル</button>
					</div>
				</div>
			</div>
		</div>
		<div id="lightbox-wrap" class="lightbox-wrap hide">
			<div class="dimmer"></div>
			<div class="image-wrap hide"></div>
			<div class="loader-wrap hide">
				<div><img src="{$platform}-extension://{meta/extension_id}/images/icon128.png"/><p></p></div>
			</div>
			<div class="receiver">
				<div class="info hide">
					<div class="single">
						<a id="lightbox-link" href="#" target="_blank"></a>
						(<span id="lightbox-ratio"></span>)
					</div>
					<div id="lightbox-zoom-modes" class="flex">
						<a class="js" href="#lightbox-whole"><kbd>O</kbd>全体</a>
						<a class="js" href="#lightbox-actual-size"><kbd>A</kbd>実寸</a>
						<a class="js" href="#lightbox-fit-to-width"><kbd>W</kbd>幅最大</a>
						<a class="js" href="#lightbox-fit-to-height"><kbd>H</kbd>高さ最大</a>
					</div>
					<div id="lightbox-rotate-modes" class="flex">
						<a class="js" href="#lightbox-normal"><kbd>n</kbd>回転しない</a>
						<a class="js" href="#lightbox-left"><kbd>l</kbd>左</a>
						<a class="js" href="#lightbox-right"><kbd>r</kbd>右</a>
						<a class="js" href="#lightbox-180"><kbd>v</kbd>180度</a>
					</div>
					<div class="flex">
						<a class="js" href="#lightbox-search"><kbd>s</kbd>検索</a>
					</div>
					<div class="flex">
						<a class="js" href="#lightbox-close"><kbd>esc</kbd>閉じる</a>
					</div>
				</div>
			</div>
		</div>
		<div id="dialog-wrap" class="dialog-wrap hide">
			<div class="dimmer"></div>
			<div class="dialog-content-wrap">
				<div>
					<div class="dialog-content-title">タイトル</div>
					<div class="dialog-content" id="dialog-content"></div>
					<div class="dialog-content-footer"><a href="#apply-dialog">適用</a><a href="#ok-dialog"><kbd>&#x23ce;</kbd>OK</a><a href="#cancel-dialog"><kbd>esc</kbd>キャンセル</a></div>
					<div class="dialog-content-title-ex"><a class="close-button" href="#cancel-dialog"></a></div>
				</div>
			</div>
		</div>
		<iframe id="internal-submit-target"
			name="internal-submit-target"
			src="about:blank"></iframe>
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

<!-- partial content: connected storage indicator -->
<xsl:template match="futaba" mode="storage">
<html>
	<body>
	<xsl:choose>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='dropbox'"><a href="https://www.dropbox.com/" target="_blank"><span class="storage-image dropbox-image" title="保存先: dropbox">-</span></a></xsl:when>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='gdrive'"><a href="http://www.google.com/drive/about.html" target="_blank"><span class="storage-image gdrive-image" title="保存先: Google Drive">-</span></a></xsl:when>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='onedrive'"><a href="https://onedrive.live.com/" target="_blank"><span class="storage-image onedrive-image" title="保存先: Microsoft OneDrive">-</span></a></xsl:when>
	<xsl:when test="meta/configurations/param[@name='storage']/@value='local'"><span class="storage-image local-image" title="保存先: ローカル ドライブ">-</span></xsl:when>
	</xsl:choose>
	</body>
</html>
</xsl:template>

<!-- partial content: title -->
<xsl:template match="futaba" mode="title">
<html>
	<body><xsl:apply-templates select="meta/title"/></body>
</html>
</xsl:template>

<!-- a thread -->
<xsl:template match="thread">
<!--<xsl:if test="$page_mode='reply'">
<div class="page-mode-header reply-mode">レス送信モード</div>
</xsl:if>-->
<article class="{$page_mode}">
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
				<input type="checkbox"/>&#160;<xsl:if test="topic/sub"><span class="sub def_{topic/sub=$sub_default}"><xsl:value-of select="topic/sub"/></span> | </xsl:if> <xsl:if test="topic/name"><span class="name def_{topic/name=$name_default}"><xsl:value-of select="topic/name"/></span> | </xsl:if> <span class="postdate"><xsl:value-of select="topic/post_date"/></span> | <xsl:if test="topic/user_id"><span class="user-id">ID:<xsl:value-of select="topic/user_id"/></span><span></span> | </xsl:if> <a class="postno" href="#quote">No.<xsl:apply-templates select="topic/number"/></a>&#160;<a class="del js" href="#del">del</a>&#160;<a class="{topic/sodane/@class} js" href="#sodane"><xsl:value-of select="topic/sodane"/></a>&#160;<xsl:if test="$page_mode!='reply'"><span class="reply-link"><a href="{@url}" target="_blank">返信</a></span></xsl:if>
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
					<a class="reloader js" href="#reload" id="reload-anchor"><kbd>r</kbd>続きを読む</a>
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
			<span class="no"><xsl:value-of select="offset"/></span>&#160;<input type="checkbox"/> <xsl:if test="sub"><span class="sub def_{sub=$sub_default}"><xsl:value-of select="sub"/></span> | </xsl:if> <xsl:if test="name"><span class="name def_{name=$name_default}"><xsl:value-of select="name"/></span> | </xsl:if> <span class="postdate"><xsl:value-of select="post_date"/></span> | <a class="postno" href="#quote">No.<xsl:apply-templates select="number"/></a>&#160;<a class="del js" href="#del">del</a>&#160;<a class="{sodane/@class} js" href="#sodane"><xsl:value-of select="sodane"/></a>
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
<tr>
	<th>おなまえ</th>
	<td>
		<div class="flex">
			<input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/>
		</div>
	</td>
</tr>
</xsl:template>

<xsl:template match="input[@name='email']" mode="simple">
<tr>
	<th>E-mail</th>
	<td>
		<div class="flex">
			<input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/>
			<div class="bracket">[<a class="js" href="#sage">sage</a>]</div>
		</div>
	</td>
</tr>
</xsl:template>

<xsl:template match="input[@name='email']" mode="composite">
<tr>
	<th>E-mail</th>
	<td>
		<div class="flex">
			<input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/>
			<input type="submit" value="送信"/>
			<div class="bracket">[<a class="js" href="#sage">sage</a>]</div>
		</div>
	</td>
</tr>
</xsl:template>

<xsl:template match="input[@name='sub']">
<tr>
	<th>題　　名</th>
	<td>
		<div class="flex">
			<input type="{@type}" id="{@name}" name="{@name}" value="{@value}"/>
			<input type="submit" value="送信"/>
		</div>
	</td>
</tr>
</xsl:template>

<xsl:template match="input[@name='pwd']">
<tr>
	<th>削除キー</th>
	<td>
		<input type="{@type}" id="{@name}" name="{@name}" value="{@value}" maxlength="8"/>
		<small>(削除用.英数字で8字以内)</small>
	</td>
</tr>
</xsl:template>

<!-- comment parts -->
<xsl:template match="number">
<xsl:choose>
<xsl:when test="@lead and @trail"><xsl:value-of select="@lead"/><span class="repdigit"><xsl:value-of select="@trail"/></span></xsl:when>
<xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
</xsl:choose>
</xsl:template>

<xsl:template match="emoji">
<img class="emoji" draggable="false" alt="{.}" src="https://twemoji.maxcdn.com/2/72x72/{@codepoints}.png"/>
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
<xsl:when test="contains(@class,'link-siokara') and @thumbnail">
<a class="{@class}" href="{@href}" title="{@title}" target="_blank" data-basename="{@basename}" data-thumbnail-href="{@thumbnail}"><xsl:value-of select="."/></a>
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
	<div class="inline-video nico2" data-nico2-key="{@nico2-key}"></div>
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
