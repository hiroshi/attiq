class Message
  include Mongoid::Document
  include Mongoid::Timestamps

  field :payload, type: Hash

  belongs_to :sender, class_name: "User", inverse_of: :sent_messages

  belongs_to :receiver, class_name: "User", inverse_of: :received_messages
  field :ack, type: Boolean
end
