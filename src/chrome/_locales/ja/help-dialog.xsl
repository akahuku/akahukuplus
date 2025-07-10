<?xml version="1.0" encoding="UTF-8"?>
<!--
	help dialog content
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
				<tr><td colspan="2"><h3>一般</h3></td></tr>
				<tr><td><kbd>r</kbd></td>					<td>リロード</td></tr>
				<tr><td><kbd>p</kbd></td>					<td>パネルの開閉</td></tr>
				<tr><td><kbd>c</kbd></td>					<td>カタログモードと切り替え</td></tr>
				<tr><td><kbd>s</kbd></td>					<td>集計パネルを出す</td></tr>
				<tr><td><kbd>/</kbd></td>					<td>検索パネルを出す</td></tr>
				<tr><td><kbd>n</kbd></td>					<td>注意書きパネルを出す</td></tr>
				<tr><td><kbd>i</kbd></td>					<td>コメント欄にフォーカス</td></tr>

				<tr><td colspan="2"><h3>サマリーモード</h3></td></tr>
				<tr><td><kbd>z</kbd></td>					<td>前のページ</td></tr>
				<tr><td><kbd>.</kbd></td>					<td>次のページ</td></tr>

				<tr><td colspan="2"><h3>ダイアログ</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>					<td>閉じる</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>	<td>閉じる</td></tr>
				<tr><td><kbd>enter</kbd></td>				<td>OK</td></tr>
			</table>
		</div>

		<div>
			<table>
				<tr><td colspan="2"><h3>送信フォーム</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>							<td>閉じる</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>			<td>閉じる</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>s</kbd></td>			<td>sage の切り替え</td></tr>
				<tr><td><kbd>shift</kbd>+<kbd>enter</kbd></td>		<td>送信</td></tr>
				<tr><td><kbd>alt</kbd>+<kbd>d</kbd></td>			<td>選択範囲に濁点を付ける</td></tr>
				<tr><td><kbd>alt</kbd>+<kbd>shift</kbd>+<kbd>d</kbd></td>		<td>選択範囲に半濁点を付ける</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>m</kbd></td>			<td>改行を挿入</td></tr>
			</table>
		</div>

		<div>
			<table>
				<tr><td colspan="2"><h3>lightbox</h3></td></tr>
				<tr><td><kbd>O</kbd></td>					<td>画像全体を表示</td></tr>
				<tr><td><kbd>A</kbd></td>					<td>原寸で表示</td></tr>
				<tr><td><kbd>W</kbd></td>					<td>幅に合わせる</td></tr>
				<tr><td><kbd>H</kbd></td>					<td>高さに合わせる</td></tr>
				<tr><td><kbd>n</kbd></td>					<td>回転しない</td></tr>
				<tr><td><kbd>l</kbd></td>					<td>左に回転</td></tr>
				<tr><td><kbd>r</kbd></td>					<td>右に回転</td></tr>
				<tr><td><kbd>v</kbd></td>					<td>180度回転</td></tr>
				<tr><td><kbd>s</kbd></td>					<td>画像検索</td></tr>
				<tr><td><kbd>c</kbd></td>					<td>コピー</td></tr>
				<tr><td><kbd>esc</kbd></td>					<td>閉じる</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>[</kbd></td>	<td>閉じる</td></tr>
			</table>
		</div>
	</div>
</div>
</xsl:template>

</xsl:stylesheet>
