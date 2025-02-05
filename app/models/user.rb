class User
  include Mongoid::Document
  include Mongoid::Timestamps

  field :uid, type: String
  field :email, type: String
end
