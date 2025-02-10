class Message
  include Mongoid::Document
  include Mongoid::Timestamps

  field :payload, type: Hash

  belongs_to :parent, class_name: 'Message', inverse_of: :comments
  has_many :comments, class_name: 'Message', inverse_of: :parent

  belongs_to :sender, class_name: "User", inverse_of: :sent_messages

  belongs_to :receiver, class_name: "User", inverse_of: :received_messages
  field :ack, type: Boolean
end
