#!/usr/bin/env ruby
# Parse the actual GitHub workflow/issue YAML syntax and reject duplicate keys.
# Basic YAML parsing alone silently accepts duplicate env entries.
require 'psych'

files = Dir.glob('.github/**/*.{yml,yaml}')
abort 'No GitHub YAML files found' if files.empty?

def inspect_node(node, file)
  if node.is_a?(Psych::Nodes::Mapping)
    seen = {}
    node.children.each_slice(2) do |key, value|
      if key.is_a?(Psych::Nodes::Scalar)
        value_key = key.value
        abort "Duplicate YAML key #{value_key.inspect} at #{file}:#{key.start_line + 1}" if seen[value_key]
        seen[value_key] = true
      end
      inspect_node(key, file)
      inspect_node(value, file)
    end
  elsif node.respond_to?(:children)
    Array(node.children).each { |child| inspect_node(child, file) }
  end
end

files.each do |file|
  document = Psych.parse_file(file)
  abort "Empty YAML document: #{file}" unless document
  inspect_node(document, file)
end

issue = Psych.safe_load_file('.github/ISSUE_TEMPLATE/product-idea.yml', permitted_classes: [], aliases: false)
abort 'Product idea issue form needs at least one textarea' unless issue.is_a?(Hash) &&
  issue['name'].is_a?(String) && issue['description'].is_a?(String) &&
  issue['body'].is_a?(Array) && issue['body'].any? { |item| item['type'] == 'textarea' }

puts "Validated #{files.length} GitHub YAML files with no duplicate mapping keys"
