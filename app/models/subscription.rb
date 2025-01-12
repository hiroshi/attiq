class Subscription
  include Mongoid::Document
  include Mongoid::Timestamps

  field :name, type: String
  field :endpoint, type: String
  field :auth, type: String
  field :p256dh, type: String
end
