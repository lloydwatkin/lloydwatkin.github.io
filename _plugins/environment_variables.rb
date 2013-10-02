# Plugin to add environment variables to the `site` object in Liquid templates
require 'socket'

module Jekyll
 
  class EnvironmentVariablesGenerator < Generator
 
    def generate(site)
      site.config['env'] = ENV['JEKYLL_ENV'] || 'development'
      # Add other environment variables to `site.config` here...
      if ('development' == site.config['env']) 
        host = 'http://' + ENV['MY_IP']
      else
        host = 'https://xmpp-ftw.jit.su'
      end
      site.config['host'] = host
    end

  end
 
end