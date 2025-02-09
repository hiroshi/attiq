class MessagesController < ApplicationController
  include SessionsConcern
  before_action :login_required

  def index
    if params[:parent_id]
      criteria = Message.where(parent_id: params[:parent_id])
    else
      criteria = Message
    end
    messages = criteria.where('$or': [{sender: current_user}, {receiver: current_user}])

    render json: as_json(messages)
  end

  def show
    if request.format.json?
      message = Message.find(params[:id])

      render json: as_json(message)
    else
      render html: '', layout: 'application'
    end
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

  private

  def as_json(sender)
    inc_opts = { only: [:_id, :email] }
    sender.as_json(include: { receiver: inc_opts, sender: inc_opts }, except: [:receiver_id, :sender_id])
  end
end
