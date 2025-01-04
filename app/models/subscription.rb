class Subscription
  include Mongoid::Document
  include Mongoid::Timestamps

  field :endpoint, type: String
end
