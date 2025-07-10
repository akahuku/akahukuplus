<?xml version="1.0" encoding="UTF-8"?>
<!--
	help dialog content
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
	<style type="text/css">
.dialog-content .d1 {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:flex-start;
	align-items:flex-start;
	align-content:flex-start;
}
.dialog-content .d1 > div {
	margin:0 1em 0 1em;
}
.dialog-content h3 {
	margin:1em 0 1em 0;
	padding:0 0 8px 0;
	border-bottom:1px solid silver;
	line-height:1;
}
.dialog-content table {
	margin:0;
	padding:0;
	border-collapse:collapse;
}
.dialog-content td {
	padding:0;
	vertical-align:middle;
}
.dialog-content td:first-child {
	padding-right:1em;
}
.dialog-content kbd {
	display: inline-block;
	height: 20px;
	min-width: 12px;
	padding: 0 5px;
	margin: 3px 5px;
	background: #EFF0F2;
	border-radius: 4px;
	border-top: 1px solid #F5F5F5;
	box-shadow: 0 0 25px #E8E8E8 inset, 0 1px 0 #C3C3C3, 0 2px 0 #C9C9C9, 0 2px 3px #333333;
	color: #999999;
	text-shadow: 0 1px 0 #F5F5F5;
	font: bold 14px "Consolas";
	text-align: center;
	line-height: 20px;
}
.dialog-content .notice {
	padding:16px 0 0 0;
	font-size:small;
	font-style:italic;
}
	</style>
	<div class="d1">
		<div>
			<table>
				<tr><td colspan="2"><h3>General</h3></td></tr>
				<tr><td><kbd>r</kbd></td>					<td>Reload</td></tr>
				<tr><td><kbd>p</kbd></td>					<td>Open or close panel</td></tr>
				<tr><td><kbd>c</kbd></td>					<td>Toggle summary / catalog mode</td></tr>
				<tr><td><kbd>s</kbd></td>					<td>Show statistics panel</td></tr>
				<tr><td><kbd>/</kbd></td>					<td>Show search panel</td></tr>
				<tr><td><kbd>n</kbd></td>					<td>Show notice panel</td></tr>
				<tr><td><kbd>i</kbd></td>					<td>Focus comment text box</td></tr>

				<tr><td colspan="2"><h3>Summary mode</h3></td></tr>
				<tr><td><kbd>z</kbd></td>					<td>Previous page</td></tr>
				<tr><td><kbd>.</kbd></td>					<td>Next page</td></tr>

				<tr><td colspan="2"><h3>Dialogs</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>					<td>Close</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>	<td>Close</td></tr>
				<tr><td><kbd>enter</kbd></td>				<td>OK</td></tr>
			</table>
		</div>

		<div>
			<table>
				<tr><td colspan="2"><h3>Post form</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>							<td>Close</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>			<td>Close</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>s</kbd></td>			<td>Toggle sage</td></tr>
				<tr><td><kbd>shift</kbd>+<kbd>enter</kbd></td>		<td>Post</td></tr>
				<tr><td><kbd>alt</kbd>+<kbd>d</kbd></td>			<td>Add voice mark to a selection</td></tr>
				<tr><td><kbd>alt</kbd>+<kbd>shift</kbd>+<kbd>d</kbd></td>		<td>Add semi-voice mark to a selection</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>m</kbd></td>			<td>Insert new line</td></tr>
			</table>
		</div>

		<div>
			<table>
				<tr><td colspan="2"><h3>lightbox</h3></td></tr>
				<tr><td><kbd>O</kbd></td>					<td>Whole size</td></tr>
				<tr><td><kbd>A</kbd></td>					<td>Actual size</td></tr>
				<tr><td><kbd>W</kbd></td>					<td>Fit to width</td></tr>
				<tr><td><kbd>H</kbd></td>					<td>Fit to height</td></tr>
				<tr><td><kbd>n</kbd></td>					<td>No rotation</td></tr>
				<tr><td><kbd>l</kbd></td>					<td>Rotate to left</td></tr>
				<tr><td><kbd>r</kbd></td>					<td>Rotate to right</td></tr>
				<tr><td><kbd>v</kbd></td>					<td>Rotate 180°</td></tr>
				<tr><td><kbd>s</kbd></td>					<td>Search</td></tr>
				<tr><td><kbd>c</kbd></td>					<td>Copy to clipboard</td></tr>
				<tr><td><kbd>esc</kbd></td>					<td>Close</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>	<td>Close</td></tr>
			</table>
		</div>
	</div>
</div>
</xsl:template>

</xsl:stylesheet>
