# Plugin to add environment variables to the `site` object in Liquid templates
require 'socket'

module Jekyll
 
  class EnvironmentVariablesGenerator < Generator
 
    def generate(site)
      site.config['env'] = ENV['JEKYLL_ENV'] || 'development'
      # Add other environment variables to `site.config` here...
      if ('development' == site.config['env']) 
        host = ENV['MY_IP']
        port = '&#58;' + ENV['XMPP_FTW_PORT'].to_s
        prefix = 'http://'
      else
        host = 'xmpp-ftw.jit.su'
        port = ""
        prefix = 'https://'
      end
      site.config['host'] = host
      site.config['port']   = port
      site.config['prefix'] = prefix
      puts site
    end

  end
 
end
