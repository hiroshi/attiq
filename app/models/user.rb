class User
  include Mongoid::Document
  include Mongoid::Timestamps

  field :uid, type: String
  field :email, type: String

  has_many :subscriptions

  field :post_key, type: String

  def as_json(options={})
    super(options).except("post_key")
  end
end
