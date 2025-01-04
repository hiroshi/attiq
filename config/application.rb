require_relative "boot"

# https://www.mongodb.com/docs/mongoid/current/tutorials/getting-started-rails7/#loaded-frameworks
# require "rails/all"
require "rails"

# require "active_record/railtie" rescue LoadError
# require "active_storage/engine" rescue LoadError
require "action_controller/railtie" rescue LoadError
require "action_view/railtie" rescue LoadError
require "action_mailer/railtie" rescue LoadError
require "active_job/railtie" rescue LoadError
# require "action_cable/engine" rescue LoadError
# require "action_mailbox/engine" rescue LoadError
# require "action_text/engine" rescue LoadError
# require "rails/test_unit/railtie" rescue LoadError
# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module App
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # https://www.mongodb.com/docs/mongoid/current/reference/configuration/#loading-mongoid-configuration
    config.generators do |g|
      g.orm :mongoid
    end
  end
end
