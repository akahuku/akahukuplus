#!/usr/bin/ruby

require 'optparse'
require 'json'

dir = ''
localedir = ''
product = 'GoodExtension'

parser = OptionParser.new
parser.on('--indir directory') {|v| dir = v}
parser.on('--localedir directory') {|v| localedir = v}
parser.on('--product string') {|v| product = v}
parser.parse(ARGV)

if dir == '' then
	print "missing base directory.\n"
	exit 1
end
if localedir == '' then
	print "missing locale directory.\n"
	exit 1
end

Dir.entries(localedir)
.select{|e| e != "." && e != ".." && File.directory?(localedir + "/" + e)}
.each{|e|
	message = JSON.load(File.read("#{localedir}/#{e}/messages.json"))
	localeCode = e.gsub(/_/, '-')
	fileName = dir + "/locale/" + localeCode + ".properties"
	content =
		"# #{product} description\n" +
		"#{product}_desc = #{message["#{product}_desc"]['message']}\n" +
		"optionsOpener_label = #{message['option_open_button_desc']['message']}\n"

	File.write(fileName, content)
	# print "generated: #{fileName}\n#{content}\n\n"
}
