<?xml version="1.0" encoding="UTF-8"?>
<!--
	help dialog content

	@author akahuku@gmail.com
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
	</style>
	<div class="d1">
		<div>
			<table>
				<tr><td colspan="2"><h3>一般</h3></td></tr>
				<tr><td><kbd>r</kbd></td>				<td>リロード</td></tr>
				<tr><td><kbd>p</kbd></td>				<td>パネルの開閉</td></tr>
				<tr><td><kbd>c</kbd></td>				<td>カタログモードと切り替え</td></tr>
				<tr><td><kbd>s</kbd></td>				<td>集計パネルを出す</td></tr>
				<tr><td><kbd>/</kbd></td>				<td>検索パネルを出す</td></tr>
				<tr><td><kbd>n</kbd></td>				<td>注意書きパネルを出す</td></tr>
				<tr><td><kbd>i</kbd></td>				<td>コメント欄にフォーカス</td></tr>

				<tr><td colspan="2"><h3>サマリーモード</h3></td></tr>
				<tr><td><kbd>z</kbd></td>				<td>前のページ</td></tr>
				<tr><td><kbd>.</kbd></td>				<td>次のページ</td></tr>

				<tr><td colspan="2"><h3>ダイアログ</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>				<td>閉じる</td></tr>
				<tr><td><kbd>enter</kbd></td>			<td>OK</td></tr>
			</table>
		</div>

		<div>
			<table>
				<tr><td colspan="2"><h3>送信フォーム</h3></td></tr>
				<tr><td><kbd>esc</kbd></td>							<td>閉じる</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>s</kbd></td>			<td>sage の切り替え</td></tr>
				<tr><td><kbd>shift</kbd>+<kbd>enter</kbd></td>		<td>送信</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>a</kbd></td>			<td>行頭</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>e</kbd></td>			<td>行末</td></tr>
				<!--
				<tr><td><kbd>ctrl</kbd>+<kbd>p</kbd></td>			<td>前の行</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>n</kbd></td>			<td>次の行</td></tr>
				-->
				<tr><td><kbd>ctrl</kbd>+<kbd>b</kbd></td>			<td>前の文字</td></tr>
				<tr><td><kbd>ctrl</kbd>+<kbd>f</kbd></td>			<td>次の文字</td></tr>

				<tr><td colspan="2"><h3>lightbox</h3></td></tr>
				<tr><td><kbd>1</kbd></td>				<td>画像全体を表示</td></tr>
				<tr><td><kbd>2</kbd></td>				<td>原寸で表示</td></tr>
				<tr><td><kbd>w</kbd></td>				<td>幅に合わせる</td></tr>
				<tr><td><kbd>h</kbd></td>				<td>高さに合わせる</td></tr>
				<tr><td><kbd>s</kbd></td>				<td>画像検索</td></tr>
			</table>
		</div>
	</div>
</div>
</xsl:template>

</xsl:stylesheet>
