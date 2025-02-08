class MessagesController < ApplicationController
  include SessionsConcern
  before_action :login_required

  def index
    messages = Message.or({sender: current_user}, {receiver: current_user})
    inc_opts = { only: [:_id, :email] }
    render json: messages.as_json(include: { receiver: inc_opts, sender: inc_opts }, except: [:receiver_id, :sender_id])
  end

  def create
    email = params[:email]
    if email.present?
      receiver = User.find_by(email:)
    else
      receiver = current_user
    end

    # head :forbidden
    # return

    payload = params.expect(payload: {}).to_hash
    Message.create!(payload:, sender: current_user, receiver:)

    subscription_id = params[:subscription_id]
    if subscription_id.present?
      subscription = Subscription.find_by(id: subscription_id)
      Webpush.post(subscription:, payload:)
    end
    head :created
  end

  def destroy
    current_user.messages.where(id: params[:id]).destroy
  end
end
