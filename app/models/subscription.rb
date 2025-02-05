class Subscription
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :user

  field :name, type: String
  field :endpoint, type: String
  field :auth, type: String
  field :p256dh, type: String

  def endpoint_sha1
    Base64.strict_encode64(Digest::SHA1.digest(endpoint))
  end
end
