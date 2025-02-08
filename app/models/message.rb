class Message
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :sender, class_name: "User", inverse_of: :sent_messages
  belongs_to :receiver, class_name: "User", inverse_of: :received_messages

  field :payload, type: Hash
end
