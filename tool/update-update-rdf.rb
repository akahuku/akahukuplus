#!/usr/bin/ruby

require 'optparse'
require 'json'

package_path = ''
template_path = ''
ver = ''

parser = OptionParser.new
parser.on('--package /path/to/package.json') {|v| package_path = v}
parser.on('--template /path/to/template-update.rdf') {|v| template_path = v}
parser.parse(ARGV)

if package_path == '' then
	print "missing a path to package.json\n"
	exit 1
end
if template_path == '' then
	print "missing a path to template-update.rdf\n"
	exit 1
end

package = JSON.parse(File.read(package_path))
proc_hash = {
	'id' => Proc.new {|package|
		package["id"]
	},
	'version' => Proc.new {|package|
		package["version"]
	},
	'engines.firefox.minVersion' => Proc.new {|package|
		next if !package.key?('engines')
		next if !package['engines'].key?('firefox')
		next $1 if package['engines']['firefox'] =~ />=\s*([\S]+)/
	},
	'engines.firefox.maxVersion' => Proc.new {|package|
		next if !package.key?('engines')
		next if !package['engines'].key?('firefox')
		next $1 if package['engines']['firefox'] =~ /<=\s*([\S]+)/
	}
}
template = File.read(template_path)
.gsub(/\{\{([^}]+)\}\}/) {|key|
	next proc_hash[$1].call package if proc_hash.key?($1)
}
.split("\n")
.reject {|line|
	line =~ /^\s*<[^>]+>\s*<\/[^>]+>\s*$/
}
.join("\n")

print template
